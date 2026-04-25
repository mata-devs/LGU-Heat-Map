"""
common.py — Shared types, utilities, and constants for the Cebu LGU data pipeline.

All scrapers and pipeline modules import from here to ensure consistent types.
"""

from __future__ import annotations

import csv
import json
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

# ── Output directory ──────────────────────────────────────────────────────────

OUTPUT_DIR = Path(__file__).parent.parent / "data"
RAW_DIR    = OUTPUT_DIR / "raw"
NORM_DIR   = OUTPUT_DIR / "normalized"
BOUND_DIR  = OUTPUT_DIR / "boundaries"

# Ensure output dirs exist
for d in (RAW_DIR, NORM_DIR, BOUND_DIR):
    d.mkdir(parents=True, exist_ok=True)


# ── ScrapeResult — shared base type ─────────────────────────────────────────

@dataclass
class ScrapeResult:
    """
    Base result type returned by every scraper.
    All pipeline scrapers return this (or a subclass) from their scrape_*() function.
    """
    records:    list = field(default_factory=list)   # filled by subclass
    errors:     list[str] = field(default_factory=list)
    source_url: str = ""
    fetched_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


@dataclass
class NormalizedRecord:
    """
    Canonical record format after PSGC normalization.
    All scrapers normalize to this before writing CSV / building combined JSON.
    """
    psgc_code:    str
    municipality: str   # canonical PSGC name
    value:        float
    date:         str   # ISO date YYYY-MM-DD
    source:       str


# ── PSGC helpers ──────────────────────────────────────────────────────────────

# Cebu PSGC prefix
CEBU_PSGC_PREFIX = "0722"

# Official PSGC table — 53 Cebu municipalities, sourced from HDX/PSA authoritative table.
# HDX source: phl_adminboundaries_tabulardata.xlsx (ADM3 sheet)
# Canonical names match HDX ADM3_EN exactly.
#
# PSGC code format: 0722NN (N=1-53)
#   072201-072253 = individual municipalities
#
# Cities vs Municipalities:
#   Highly Urbanized Cities (HUC):  Cebu City, Lapu-Lapu City, Mandaue City
#   Component Cities:                Bogo, Carcar, Naga, Talisay, Toledo, Danao, San Fernando
#   Municipalities:                  the remaining 44
#
# HDX-to-PSGC conversion: PH07MMMNN → 07MMDNN
#   e.g. PH0702201 → 072201 (Alcantara)
#        PH0702211 → 072211 (City of Bogo)
#        PH0702217 → 072217 (Cebu City Capital)  ← note: 072217 is CEBU CITY, not Balamban
#
PSGC_TABLE: dict[str, str] = {
    # — HUCs (Highly Urbanized Cities) —
    "072217": "Cebu City (Capital)",
    "072226": "Lapu-Lapu City (Opon)",
    "072230": "Mandaue City",
    # — Component Cities —
    "072211": "City of Bogo",
    "072214": "City of Carcar",
    "072215": "Carmen",
    "072223": "Danao City",
    "072234": "City of Naga",
    "072241": "San Fernando",
    "072250": "City of Talisay",
    "072251": "Toledo City",
    # — Municipalities —
    "072201": "Alcantara",
    "072202": "Alcoy",
    "072203": "Alegria",
    "072204": "Aloguinsan",
    "072205": "Argao",
    "072206": "Asturias",
    "072207": "Badian",
    "072208": "Balamban",
    "072209": "Bantayan",
    "072210": "Barili",
    "072212": "Boljoon",
    "072213": "Borbon",
    "072216": "Compostela",
    "072218": "Consolacion",
    "072219": "Cordova",
    "072220": "Daanbantayan",
    "072221": "Dalaguete",
    "072222": "Dumanjug",
    "072224": "Ginatilan",
    "072225": "Liloan",
    "072227": "Madridejos",
    "072228": "Malabuyoc",
    "072229": "Medellin",
    "072231": "Minglanilla",
    "072232": "Moalboal",
    "072233": "Oslob",
    "072235": "Pilar",
    "072236": "Pinamungajan",
    "072237": "Poro",
    "072238": "Ronda",
    "072239": "Samboan",
    "072240": "San Francisco",
    "072242": "San Remigio",
    "072243": "Santa Fe",
    "072244": "Santander",
    "072245": "Sibonga",
    "072246": "Sogod",
    "072247": "Tabogon",
    "072248": "Tabuelan",
    "072249": "Tuburan",
    "072252": "Tudela",
    "072253": "Valencia",
}

# Reverse: lowercase canonical name → psgc_code
_NAME_TO_PSGC: dict[str, str] = {}
for _code, _name in PSGC_TABLE.items():
    _NAME_TO_PSGC[_name.lower()] = _code

# Alternate name → canonical name mappings.
# Keys are lowercase; values are canonical PSGC names from HDX ADM3_EN.
# Handles: "City of X" ↔ "X City", regional suffixes, short forms, typos.
ALT_NAMES: dict[str, str] = {
    # HUCs
    "city of cebu":               "Cebu City (Capital)",
    "cebu":                       "Cebu City (Capital)",
    "cebu city":                  "Cebu City (Capital)",
    "city of lapu lapu":          "Lapu-Lapu City (Opon)",
    "city of lapu-lapu":          "Lapu-Lapu City (Opon)",
    "lapu lapu":                  "Lapu-Lapu City (Opon)",
    "lapu-lapu":                  "Lapu-Lapu City (Opon)",
    "lapulapu":                   "Lapu-Lapu City (Opon)",
    "lapulapu city":              "Lapu-Lapu City (Opon)",
    "opon":                       "Lapu-Lapu City (Opon)",
    "city of mandaue":            "Mandaue City",
    "mandaue":                    "Mandaue City",
    # Component Cities — "City of X" → canonical
    "city of bogo":               "City of Bogo",
    "bogo":                       "City of Bogo",
    "bogocity":                   "City of Bogo",
    "city of carcar":             "City of Carcar",
    "carcar":                     "City of Carcar",
    "carcar city":                "City of Carcar",
    "city of naga":               "City of Naga",
    "naga":                       "City of Naga",
    "naga city":                  "City of Naga",
    "city of talisay":            "City of Talisay",
    "talisay":                    "City of Talisay",
    "talisay city":               "City of Talisay",
    "city of toledo":             "Toledo City",
    "toledo":                     "Toledo City",
    "toledo city":                "Toledo City",
    "city of danao":              "Danao City",
    "danao":                      "Danao City",
    "danao city":                 "Danao City",
    "city of san fernando":       "San Fernando",
    "san fernando":               "San Fernando",
    "san fernando city":          "San Fernando",
    "sanfernando":                "San Fernando",
    # Municipalities — "X Municipality" variants
    "alvara":                     "Alcantara",
    "alcantara":                  "Alcantara",
    "alcoy":                      "Alcoy",
    "alegria":                    "Alegria",
    "aloguinsan":                 "Aloguinsan",
    "argao":                      "Argao",
    "asturias":                   "Asturias",
    "badian":                     "Badian",
    "balamban":                   "Balamban",
    "bantayan":                   "Bantayan",
    "barili":                     "Barili",
    "boljoon":                    "Boljoon",
    "borbon":                     "Borbon",
    "compostela":                 "Compostela",
    "consolacion":                "Consolacion",
    "cordova":                    "Cordova",
    "daanbantayan":               "Daanbantayan",
    "dalaguete":                  "Dalaguete",
    "dumanjug":                   "Dumanjug",
    "ginatilan":                  "Ginatilan",
    "liloan":                     "Liloan",
    "madridejos":                 "Madridejos",
    "malabuyoc":                  "Malabuyoc",
    "medellin":                   "Medellin",
    "minglanilla":                "Minglanilla",
    "moalboal":                   "Moalboal",
    "oslob":                      "Oslob",
    "pilar":                      "Pilar",
    "pinamungajan":               "Pinamungajan",
    "poro":                       "Poro",
    "ronda":                      "Ronda",
    "samboan":                    "Samboan",
    "san francisco":              "San Francisco",
    "san remigio":                "San Remigio",
    "sanremigio":                 "San Remigio",
    "santa fe":                   "Santa Fe",
    "santander":                  "Santander",
    "sibonga":                    "Sibonga",
    "sogod":                      "Sogod",
    "tabogon":                    "Tabogon",
    "tabuelan":                   "Tabuelan",
    "tuburan":                    "Tuburan",
    "tudela":                     "Tudela",
    "valencia":                   "Valencia",
    "carmen":                     "Carmen",
    # Regional suffix variants (e.g. "Consolacion, Cebu")
    "consolacion cebu":           "Consolacion",
    "compostela cebu":            "Compostela",
    "cordova cebu":               "Cordova",
    "liloan cebu":                "Liloan",
    "carmen cebu":                "Carmen",
    "catmon cebu":                "Catmon",
    "san fernando cebu":          "San Fernando",
}


def normalize_name(name: str) -> str | None:
    """
    Convert any municipality name variant to canonical PSGC name.
    Returns None if no match found.
    """
    if not name:
        return None

    s = name.lower().strip()

    # 1. Exact canonical match
    if s in _NAME_TO_PSGC:
        return PSGC_TABLE[_NAME_TO_PSGC[s]]

    # 2. Alternate names
    if s in ALT_NAMES:
        canonical = ALT_NAMES[s]
        return canonical

    # 3. Fuzzy: check if input is substring of canonical name
    for canonical_lower, code in _NAME_TO_PSGC.items():
        if s in canonical_lower or canonical_lower in s:
            return PSGC_TABLE[code]

    return None


def name_to_psgc(name: str) -> str | None:
    """Convert municipality name to PSGC code. Returns None if not found."""
    canonical = normalize_name(name)
    if canonical:
        return _NAME_TO_PSGC.get(canonical.lower())
    return None


def psgc_to_name(code: str) -> str | None:
    """Convert PSGC code to canonical municipality name."""
    return PSGC_TABLE.get(code)


def all_municipalities() -> list[tuple[str, str]]:
    """Return all 53 Cebu municipalities as (psgc_code, canonical_name) pairs."""
    return sorted(PSGC_TABLE.items(), key=lambda x: x[0])


# ── CSV output helpers ────────────────────────────────────────────────────────

CSV_FIELDS = ["psgc_code", "municipality", "value", "date", "source"]


def write_csv(records: list, path: Path) -> None:
    """Write records to CSV. Records must have psgc_code, municipality, value, date, source."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
        writer.writeheader()
        for r in records:
            if hasattr(r, "__dict__"):
                writer.writerow({k: getattr(r, k) for k in CSV_FIELDS})
            else:
                writer.writerow({k: r.get(k) for k in CSV_FIELDS})


def read_csv(path: Path) -> list[dict]:
    """Read CSV into list of dicts."""
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


# ── Error log helpers ─────────────────────────────────────────────────────────

def write_error_json(dataset_id: str, errors: list[str], extra: dict | None = None) -> Path:
    """Write error.json for a failed dataset. Overwrites previous error file."""
    path = RAW_DIR / f"{dataset_id}_error.json"
    obj = {
        "dataset":     dataset_id,
        "errors":      errors,
        "timestamp":    datetime.now(timezone.utc).isoformat(),
    }
    if extra:
        obj.update(extra)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2)
    return path


# ── Combined JSON builder ─────────────────────────────────────────────────────

def build_combined_json(results: list[ScrapeResult]) -> dict:
    """
    Build the combined cebu_lgu_data.json output.
    
    Output format:
    {
      "meta": { "generated_at": "...", "datasets": [...] },
      "data": {
        "072201": { "municipality": "Cebu City", "doe": 125000, "dot": 45230, ... },
        ...
      }
    }
    """
    from importlib import import_module

    combined: dict[str, dict] = {}

    # Pre-populate all municipalities
    for psgc, name in PSGC_TABLE.items():
        combined[psgc] = {"municipality": name}

    # Merge each dataset's records
    for result in results:
        if not result.records:
            continue
        for rec in result.records:
            if hasattr(rec, "psgc_code"):
                psgc = rec.psgc_code
                val  = rec.value
            else:
                psgc = rec.get("psgc_code") if isinstance(rec, dict) else None
                val  = rec.get("value")    if isinstance(rec, dict) else None
                if not psgc and rec:
                    # Try name lookup
                    name = rec.get("municipality") if isinstance(rec, dict) else None
                    if name:
                        psgc = name_to_psgc(name)

            if psgc and psgc in combined and val is not None:
                combined[psgc][result.dataset_id] = val

    # Build meta
    datasets_meta = []
    for result in results:
        if hasattr(result, "dataset_id"):
            datasets_meta.append({
                "id":    result.dataset_id,
                "count": len(result.records),
                "errors": result.errors,
            })

    return {
        "meta": {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "datasets":     datasets_meta,
        },
        "data": combined,
    }


# ── CLI helpers ───────────────────────────────────────────────────────────────

def print_banner(title: str, width: int = 55) -> None:
    print(f"\n{'='*width}")
    print(title)
    print(f"{'='*width}")


# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    # Self-test: print all municipalities
    print("Cebu LGU Data Pipeline — Common Module")
    print(f"  PSGC municipalities: {len(PSGC_TABLE)}")
    print(f"  Output directory:    {OUTPUT_DIR}")
    print()
    print("PSGC lookup test:")
    tests = [
        # HUCs
        ("Cebu City",              "072217"),
        ("Cebu City (Capital)",    "072217"),
        ("City of Cebu",           "072217"),
        ("Lapu-Lapu City (Opon)",   "072226"),
        ("Lapu-Lapu City",          "072226"),
        ("Opon",                    "072226"),
        ("Mandaue City",            "072230"),
        # Component Cities
        ("City of Bogo",           "072211"),
        ("Bogo",                   "072211"),
        ("City of Carcar",         "072214"),
        ("City of Naga",           "072234"),
        ("Naga City",              "072234"),
        ("City of Talisay",        "072250"),
        ("City of Toledo",         "072251"),
        ("Danao City",             "072223"),
        ("San Fernando",           "072241"),
        # Municipalities
        ("Argao",                  "072205"),
        ("Balamban",               "072208"),
        ("Bantayan",               "072209"),
        ("Barili",                 "072210"),
        ("Boljoon",                "072212"),
        ("Borbon",                 "072213"),
        ("Carmen",                 "072215"),
        ("Compostela",             "072216"),
        ("Consolacion",            "072218"),
        ("Cordova",                "072219"),
        ("Daanbantayan",           "072220"),
        ("Dalaguete",              "072221"),
        ("Dumanjug",               "072222"),
        ("Ginatilan",              "072224"),
        ("Liloan",                 "072225"),
        ("Oslob",                  "072233"),
        ("Sibonga",                "072245"),
        ("Sogod",                  "072246"),
        ("Tabogon",                "072247"),
        ("Tabuelan",               "072248"),
        ("Tuburan",                "072249"),
        ("Tudela",                 "072252"),
        # Alternate forms
        ("San Fernando, Cebu",     "072241"),
        ("Consolacion, Cebu",      "072218"),
        ("talisay",                "072250"),
        ("TALISAY",                "072250"),
        # Unknown
        ("Garcia Hernandez",       None),
        ("Unknown Place",          None),
    ]
    passed = 0
    failed = 0
    for name, expected in tests:
        result = name_to_psgc(name)
        status = "✅" if result == expected else "❌"
        if result == expected:
            passed += 1
        else:
            failed += 1
        print(f"  {status} '{name}' → {result}  (expected {expected})")
    print(f"\n  Passed: {passed}/{passed+failed}")
    print("\nAll 53 municipalities:")
    for code, name in sorted(PSGC_TABLE.items()):
        print(f"  {code}  {name}")