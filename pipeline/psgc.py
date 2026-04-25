"""
psgc.py — Cebu municipality PSGC lookup table.

Re-exports from common.py for backward compatibility with existing imports.
The authoritative PSGC table lives in common.py (PSGC_TABLE, name_to_psgc, etc.).
"""

from common import (
    PSGC_TABLE,
    name_to_psgc,
    psgc_to_name,
    normalize_name,
    all_municipalities,
    ALT_NAMES,
    CEBU_PSGC_PREFIX,
)

__all__ = [
    "PSGC_TABLE",
    "name_to_psgc",
    "psgc_to_name",
    "normalize_name",
    "all_municipalities",
    "ALT_NAMES",
    "CEBU_PSGC_PREFIX",
]


if __name__ == "__main__":
    # Self-test
    tests = [
        ("Cebu City",       "072201"),
        ("City of Cebu",    "072201"),
        ("Lapu-Lapu City",  "072202"),
        ("Mandaue City",    "072203"),
        ("Bogo City",       "072204"),
        ("Bogo",            "072220"),
        ("Toledo City",     "072206"),
        ("Toledo",          "072255"),
        ("Garcia Hernanez", "072248"),
        ("City of Talisay", "072209"),
        ("Talisay",         "072254"),
        ("Unknown Place",   None),
    ]
    print("PSGC lookup self-test:")
    for name, expected in tests:
        result = name_to_psgc(name)
        status = "✅" if result == expected else "❌"
        print(f"  {status} '{name}' → {result}  (expected {expected})")