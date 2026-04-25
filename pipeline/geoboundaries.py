"""
geoboundaries.py — Fetch authoritative Cebu ADM3 boundary GeoJSON from Geoboundaries API.

Based on: docs/002-Geoboundaries-HDX-Integration.md

Usage:
    python geoboundaries.py                    # fetch + save cebu_boundaries.geojson
    python geoboundaries.py --simplified       # use simplified geometry (smaller file)
    python geoboundaries.py --all-phl          # dump full Philippines ADM3 (no Cebu filter)
    python geoboundaries.py --check            # print metadata only, don't download GeoJSON
    python geoboundaries.py --list            # print Cebu municipality list after fetch
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from common import BOUND_DIR, CEBU_PSGC_PREFIX, print_banner, PSGC_TABLE

# ── Constants ─────────────────────────────────────────────────────────────────

GEOBOUNDARIES_META_URL = "https://www.geoboundaries.org/api/current/gbOpen/PHL/ADM3/"

# Property keys Geoboundaries uses — try all common variants
# The actual GeoJSON uses shapeName for name, NOT pcode or ADM3_EN
NAME_KEYS  = ("shapeName", "ADM3_EN", "name", "ADM3_PCODE", "pcode")
PCODE_KEYS = ("ADM3_PCODE", "pcode", "shapeID")

OUTPUT_DIR = Path(__file__).parent / "output"


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_prop(props: dict, keys: tuple[str, ...], default: str = "") -> str:
    for k in keys:
        if k in props and props[k]:
            return str(props[k])
    return default


def filter_cebu(features: list) -> list:
    """
    Keep only features whose properties indicate Cebu Province (PSGC 0722*).
    Geoboundaries doesn't include PSGC code as a property — we filter by
    matching feature names against our PSGC_TABLE.
    """
    cebu_features = []
    unknown_names = []

    for f in features:
        props = f.get("properties", {})
        name = _get_prop(props, NAME_KEYS)
        psgc = _get_prop(props, PCODE_KEYS)

        # Check if psgc starts with 0722 (but most features don't have pcode)
        # So we match by name against our PSGC table
        if psgc and psgc.startswith(CEBU_PSGC_PREFIX):
            cebu_features.append(f)
        elif name:
            # Match name against PSGC table
            normalized = _normalize_for_match(name)
            for code, canonical in PSGC_TABLE.items():
                if canonical.lower() == normalized or canonical.lower().replace(" city", "") == normalized:
                    cebu_features.append(f)
                    break
            else:
                unknown_names.append(name)

    if unknown_names:
        print(f"  ⚠  {len(unknown_names)} unmatched names (not Cebu): {unknown_names[:5]}")

    return cebu_features


def _normalize_for_match(name: str) -> str:
    """Normalize a feature name for PSGC matching."""
    s = name.lower().strip()
    # Remove common prefixes/suffixes
    s = s.replace("city of ", "").replace("city", "").strip()
    s = s.replace("municipality of ", "").strip()
    return s


def annotate_features(features: list) -> list:
    """
    Add normalized 'municipality' and 'psgc_code' properties to every feature.
    """
    for f in features:
        props = f.setdefault("properties", {})
        name  = _get_prop(props, NAME_KEYS)
        psgc  = _get_prop(props, PCODE_KEYS)

        # Try to resolve psgc from name if not in properties
        if not psgc:
            normalized = _normalize_for_match(name)
            for code, canonical in PSGC_TABLE.items():
                if canonical.lower() == normalized or canonical.lower().replace(" city", "") == normalized:
                    psgc = code
                    break

        props["municipality"] = name
        props["psgc_code"]    = psgc if psgc and psgc.startswith("0722") else ""
    return features


# ── Fetch logic ───────────────────────────────────────────────────────────────

async def fetch_meta(session) -> dict:
    """Fetch Geoboundaries metadata for PHL ADM3."""
    async with session.get(GEOBOUNDARIES_META_URL, timeout=aiohttp.ClientTimeout(total=30)) as resp:
        resp.raise_for_status()
        return await resp.json()


async def fetch_geojson(session, url: str) -> dict:
    """Download the actual GeoJSON file."""
    print(f"  Downloading GeoJSON from:\n    {url}")
    async with session.get(url, timeout=aiohttp.ClientTimeout(total=120)) as resp:
        resp.raise_for_status()
        text = await resp.text()
        return json.loads(text)


async def fetch_cebu_boundaries(
    simplified: bool = False,
    filter_to_cebu: bool = True,
) -> dict:
    """
    Main entry point. Returns a GeoJSON FeatureCollection of Cebu ADM3 municipalities.

    Args:
        simplified:      Use simplified geometry (smaller file, less detail).
        filter_to_cebu:  If False, return all Philippines ADM3 features.
    """
    import aiohttp

    headers = {
        "User-Agent": "CebuLGUHeatmap/1.0 (data pipeline; contact via github)",
        "Accept": "application/json",
    }

    async with aiohttp.ClientSession(headers=headers) as session:
        # Step 1: fetch metadata to get the download URLs
        print("Fetching Geoboundaries metadata...")
        meta = await fetch_meta(session)

        print(f"  Boundary source:    {meta.get('boundarySource', 'unknown')}")
        print(f"  Year represented:   {meta.get('boundaryYearRepresented', 'unknown')}")
        print(f"  ADM unit count:     {meta.get('admUnitCount', 'unknown')}")
        print(f"  Build date:         {meta.get('buildDate', 'unknown')}")

        # Step 2: pick full or simplified geometry URL
        if simplified:
            url = meta.get("simplifiedGeometryGeoJSON")
            if not url:
                print("  ⚠  Simplified URL not in metadata, falling back to full geometry.")
                url = meta.get("gjDownloadURL")
        else:
            url = meta.get("gjDownloadURL")

        if not url:
            raise RuntimeError("Geoboundaries metadata did not include a GeoJSON download URL.")

        # Step 3: download
        geojson = await fetch_geojson(session, url)
        total = len(geojson.get("features", []))
        print(f"  Total ADM3 features (Philippines): {total}")

        # Step 4: filter + annotate
        if filter_to_cebu:
            features = geojson.get("features", [])
            cebu_features = filter_cebu(features)
            print(f"  Cebu features after filter: {len(cebu_features)}")

            if len(cebu_features) == 0:
                print("  ⚠  No Cebu features found — inspecting first 3 feature names:")
                for f in features[:3]:
                    print(f"     {f['properties']}")

            geojson["features"] = annotate_features(cebu_features)
        else:
            geojson["features"] = annotate_features(geojson.get("features", []))

        # Embed fetch metadata
        geojson["_meta"] = {
            "source":           "Geoboundaries",
            "source_url":       GEOBOUNDARIES_META_URL,
            "boundary_source":  meta.get("boundarySource"),
            "year_represented": meta.get("boundaryYearRepresented"),
            "fetched_at":       datetime.now(timezone.utc).isoformat(),
            "simplified":       simplified,
            "filtered_to_cebu": filter_to_cebu,
            "license":          "CC BY 3.0 IGO",
        }

        return geojson


# ── Output ───────────────────────────────────────────────────────────────────

def save_geojson(geojson: dict, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(geojson, f, ensure_ascii=False, indent=2)
    size_kb = path.stat().st_size / 1024
    print(f"  Saved → {path}  ({size_kb:.1f} KB)")


def print_municipality_list(geojson: dict) -> None:
    """Print the list of municipalities found in the fetched GeoJSON."""
    features = sorted(geojson.get("features", []), key=lambda x: x["properties"].get("psgc_code", ""))
    print(f"\nMunicipalities in fetched GeoJSON ({len(features)}):")
    for f in features:
        p = f["properties"]
        psgc = p.get("psgc_code", "?") or "?"
        name = p.get("municipality", "?")
        print(f"  {psgc:10s}  {name}")


# ── CLI ───────────────────────────────────────────────────────────────────────

async def main(args: argparse.Namespace) -> None:
    print_banner("Geoboundaries Fetcher — Cebu ADM3 Boundaries")

    if args.check:
        import aiohttp
        print("Checking Geoboundaries metadata (no download)...")
        async with aiohttp.ClientSession() as session:
            meta = await fetch_meta(session)
        print(json.dumps(meta, indent=2))
        return

    geojson = await fetch_cebu_boundaries(
        simplified=args.simplified,
        filter_to_cebu=not args.all_phl,
    )

    if args.list:
        print_municipality_list(geojson)

    suffix = "_simplified" if args.simplified else ""
    scope  = "_all_phl" if args.all_phl else "_cebu"
    out_path = OUTPUT_DIR / f"boundaries{scope}{suffix}.geojson"
    save_geojson(geojson, out_path)

    print(f"\n✅ Done. {len(geojson.get('features', []))} features saved.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fetch Cebu ADM3 boundaries from Geoboundaries API")
    parser.add_argument("--simplified", action="store_true", help="Use simplified geometry")
    parser.add_argument("--all-phl",    action="store_true", help="Skip Cebu filter, return all Philippines ADM3")
    parser.add_argument("--check",      action="store_true", help="Print metadata only, no download")
    parser.add_argument("--list",       action="store_true", help="Print municipality list after fetching")
    args = parser.parse_args()
    asyncio.run(main(args))