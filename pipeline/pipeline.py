"""
pipeline.py — Data pipeline orchestrator for the Cebu LGU choropleth map.

Based on: docs/003-Data-Pipeline-Architecture.md

Coordinates:
  1. Boundary fetching (Geoboundaries ADM3)
  2. Dataset scraping (DOE, DOT-7, + stubs for DPWH, COMELEC, PSA, VECO)
  3. PSGC normalization
  4. CSV output per dataset + combined JSON for the map

Usage:
    python pipeline.py                    # run all datasets
    python pipeline.py --datasets doe dot # run specific datasets
    python pipeline.py --boundaries-only  # fetch boundaries only
    python pipeline.py --dry-run          # print plan, don't fetch
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import aiohttp

from common import (
    PSGC_TABLE,
    OUTPUT_DIR,
    BOUND_DIR,
    write_csv,
    write_error_json,
    print_banner,
)
from geoboundaries import fetch_cebu_boundaries, save_geojson
from psgc import name_to_psgc, psgc_to_name

from scraper_doe import scrape_doe_fuel, ScrapeResult as DoeResult
from scraper_dot import scrape_dot_tourist_arrivals, ScrapeResult as DotResult
from scraper_stubs import (
    scrape_dpwh_motorist_volume,
    scrape_comelec_voter_registration,
    scrape_psa_demographics,
    scrape_veco_power,
)

# ── Dataset registry ──────────────────────────────────────────────────────────

DATASETS = {
    "doe":     {"label": "Fuel Allocation",     "unit": "liters",          "scraper": scrape_doe_fuel,               "status": "active"},
    "dot":     {"label": "Tourist Arrivals",       "unit": "visitors",        "scraper": scrape_dot_tourist_arrivals,   "status": "active"},
    "dpwh":    {"label": "Motorist Volume",        "unit": "vehicles/day",    "scraper": scrape_dpwh_motorist_volume,   "status": "stub"},
    "comelec": {"label": "Voter Registration",    "unit": "registered voters","scraper": scrape_comelec_voter_registration, "status": "stub"},
    "psa":     {"label": "Population",             "unit": "persons",         "scraper": scrape_psa_demographics,      "status": "stub"},
    "veco":    {"label": "Power Monitoring",      "unit": "MW",              "scraper": scrape_veco_power,            "status": "stub"},
}


# ── Result type ──────────────────────────────────────────────────────────────

class PipelineResult:
    """Holds results from a full pipeline run."""
    def __init__(self):
        self.boundaries: dict | None = None
        self.datasets: list = []   # each element is whatever the scraper returns
        self.errors: list[str] = []
        self.started_at = datetime.now(timezone.utc).isoformat()
        self.finished_at = ""
        self.duration_s = 0.0


# ── Normalization ─────────────────────────────────────────────────────────────

def normalize_records(raw_records: list, dataset_id: str) -> list[dict]:
    """
    Convert scraper records to canonical {psgc_code, municipality, value, date, source} dicts.
    Drops any record whose municipality can't be matched to a Cebu PSGC code.
    """
    normalized = []
    unmatched  = []

    for r in raw_records:
        if hasattr(r, "psgc_code"):
            psgc = r.psgc_code
            muni = r.municipality
            val  = r.value
        else:
            psgc = r.get("psgc_code") if isinstance(r, dict) else None
            muni = r.get("municipality") if isinstance(r, dict) else None
            val  = r.get("value") if isinstance(r, dict) else None

        # If no psgc_code, try name lookup
        if not psgc and muni:
            psgc = name_to_psgc(muni)

        if not psgc or psgc not in PSGC_TABLE:
            unmatched.append(muni or "?")
            continue

        normalized.append({
            "psgc_code":    psgc,
            "municipality": psgc_to_name(psgc) or muni,
            "value":        float(val or 0),
            "date":         getattr(r, "date", "") or datetime.now(timezone.utc).date().isoformat(),
            "source":       getattr(r, "source", dataset_id.upper()),
        })

    if unmatched:
        print(f"  ⚠  {len(unmatched)} unmatched municipalities: {unmatched[:5]}")

    return normalized


# ── Combined output ───────────────────────────────────────────────────────────

def build_combined_json(results: list, dataset_ids: list[str]) -> dict:
    """
    Build combined JSON that can be loaded directly by the choropleth map.
    Format:
    {
      "meta": { "generated_at": "...", "datasets": [...] },
      "data": {
        "072201": { "municipality": "Cebu City", "doe": 125000, "dot": 45230, ... },
        ...
      }
    }
    """
    combined: dict[str, dict] = {}

    # Pre-populate all municipalities
    for psgc, name in PSGC_TABLE.items():
        combined[psgc] = {"municipality": name}

    # Merge each dataset's records
    for result, ds_id in zip(results, dataset_ids):
        if not result.records:
            continue

        for rec in result.records:
            if hasattr(rec, "psgc_code"):
                psgc = rec.psgc_code
                val  = rec.value
            else:
                psgc = rec.get("psgc_code") if isinstance(rec, dict) else None
                val  = rec.get("value") if isinstance(rec, dict) else None
                if not psgc:
                    muni = rec.get("municipality") if isinstance(rec, dict) else None
                    if muni:
                        psgc = name_to_psgc(muni)

            if psgc and psgc in combined and val is not None:
                combined[psgc][ds_id] = float(val)

    datasets_meta = [
        {
            "id":    ds_id,
            "label": DATASETS[ds_id]["label"],
            "unit":  DATASETS[ds_id]["unit"],
            "count": len(r.records) if r.records else 0,
            "errors": r.errors if hasattr(r, "errors") else [],
        }
        for ds_id, r in zip(dataset_ids, results)
    ]

    return {
        "meta": {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "datasets":     datasets_meta,
        },
        "data": combined,
    }


# ── Pipeline runner ───────────────────────────────────────────────────────────

async def run_pipeline(
    dataset_ids:     list[str],
    fetch_boundaries: bool = True,
    dry_run:         bool = False,
    report_date:     str | None = None,
) -> PipelineResult:
    """
    Run the full data pipeline.

    Args:
        dataset_ids:      List of dataset keys from DATASETS to run.
        fetch_boundaries: Whether to fetch GeoJSON boundaries.
        dry_run:          Print plan only, don't execute fetches.
        report_date:      ISO date for scraped data (default: today).
    """
    result = PipelineResult()
    t0 = datetime.now(timezone.utc)

    print_banner("Cebu LGU Data Pipeline")
    print(f"  Datasets:   {', '.join(dataset_ids)}")
    print(f"  Boundaries: {'yes' if fetch_boundaries else 'no'}")
    print(f"  Dry run:    {'yes' if dry_run else 'no'}")

    if dry_run:
        print("\nDRY RUN — would execute:")
        if fetch_boundaries:
            print("  • Fetch Cebu ADM3 boundaries from Geoboundaries API")
        for ds_id in dataset_ids:
            ds = DATASETS.get(ds_id, {})
            status = "🔴 stub" if ds.get("status") == "stub" else "✅ active"
            print(f"  • {ds.get('label', ds_id)} ({ds_id}) [{status}]")
        return result

    # ── Step 1: Boundaries ────────────────────────────────────────────────────
    if fetch_boundaries:
        print("\n── Step 1: Fetching boundaries ──")
        try:
            geojson = await fetch_cebu_boundaries(simplified=False)
            result.boundaries = geojson
            out_path = BOUND_DIR / "boundaries_cebu.geojson"
            save_geojson(geojson, out_path)
        except Exception as e:
            msg = f"Boundary fetch failed: {e}"
            print(f"  ❌ {msg}")
            result.errors.append(msg)

    # ── Step 2: Datasets ──────────────────────────────────────────────────────
    print(f"\n── Step 2: Scraping {len(dataset_ids)} dataset(s) ──")

    results = []
    for ds_id in dataset_ids:
        ds = DATASETS.get(ds_id)
        if not ds:
            print(f"  ⚠  Unknown dataset '{ds_id}' — skipping")
            continue

        print(f"\n  [{ds_id}] {ds['label']} ({ds['unit']})")
        is_stub = ds["status"] == "stub"

        try:
            scraper_result = ds["scraper"](report_date=report_date)

            # Normalize records
            if scraper_result.records:
                records = normalize_records(scraper_result.records, ds_id)
                write_csv(records, OUTPUT_DIR / "normalized" / f"{ds_id}.csv")
                print(f"  ✅ {len(records)} records normalized")
            else:
                records = []
                if is_stub:
                    print(f"  ⚠  Stub — no data (expected)")
                else:
                    print(f"  ⚠  No records scraped")

            results.append(scraper_result)

        except Exception as e:
            msg = f"Scraper error [{ds_id}]: {e}"
            print(f"  ❌ {msg}")
            result.errors.append(msg)
            # Create empty result
            empty = type('EmptyResult', (), {'dataset_id': ds_id, 'records': [], 'errors': [str(e)]})()
            results.append(empty)
            write_error_json(ds_id, [str(e)])

    # ── Step 3: Combined output ───────────────────────────────────────────────
    print("\n── Step 3: Writing combined output ──")

    combined = build_combined_json(results, dataset_ids)
    combined_path = OUTPUT_DIR / "cebu_lgu_data.json"
    combined_path.parent.mkdir(parents=True, exist_ok=True)
    with open(combined_path, "w", encoding="utf-8") as f:
        json.dump(combined, f, ensure_ascii=False, indent=2)

    total_records = sum(len(r.records) for r in results if hasattr(r, "records"))
    successful    = sum(1 for r in results if r.records)
    stubbed       = sum(1 for ds_id in dataset_ids if DATASETS[ds_id]["status"] == "stub")

    print(f"  Saved combined JSON → {combined_path}")
    print(f"\n{'='*60}")
    print("Pipeline complete")
    print(f"  Datasets run:        {len(results)}")
    print(f"  With data:           {successful}")
    print(f"  Stubs (no data yet): {stubbed}")
    print(f"  Total records:       {total_records}")

    t1 = datetime.now(timezone.utc)
    result.finished_at = t1.isoformat()
    result.duration_s  = (t1 - t0).total_seconds()
    print(f"  Duration:            {result.duration_s:.1f}s")

    if result.errors:
        print(f"\n  Errors ({len(result.errors)}):")
        for e in result.errors:
            print(f"    • {e}")

    return result


# ── CLI ───────────────────────────────────────────────────────────────────────

async def main() -> None:
    parser = argparse.ArgumentParser(
        description="Cebu LGU data pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=f"Available datasets: {', '.join(DATASETS.keys())}",
    )
    parser.add_argument(
        "--datasets", nargs="+",
        default=list(DATASETS.keys()),
        help="Datasets to run (default: all)",
    )
    parser.add_argument("--boundaries-only", action="store_true", help="Fetch boundaries only")
    parser.add_argument("--no-boundaries",    action="store_true", help="Skip boundary fetch")
    parser.add_argument("--dry-run",          action="store_true", help="Print plan only")
    parser.add_argument("--date",             help="Report date YYYY-MM-DD (default: today)")
    args = parser.parse_args()

    if args.boundaries_only:
        dataset_ids = []
    else:
        unknown = [d for d in args.datasets if d not in DATASETS]
        if unknown:
            print(f"Unknown datasets: {unknown}")
            print(f"Available: {list(DATASETS.keys())}")
            sys.exit(1)
        dataset_ids = args.datasets

    await run_pipeline(
        dataset_ids=dataset_ids,
        fetch_boundaries=not args.no_boundaries,
        dry_run=args.dry_run,
        report_date=args.date,
    )


if __name__ == "__main__":
    asyncio.run(main())