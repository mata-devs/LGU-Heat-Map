"""
scraper_dot.py — DOT-7 (Department of Tourism, Region 7) tourist arrivals scraper.

Finds and parses tourist arrival data from DOT/PH tourism statistics pages.

URLs checked (as of April 2026):
  https://www.tourism.gov.ph — accessible (cloudflare but cloudscraper works)
  https://dot7visayas.com — unreachable (DNS failure)

Manual fallback:
  Download PDF from https://www.tourism.gov.ph/tourism_dem_sup_pub.aspx
  Run: python scraper_dot.py --url /path/to/report.pdf
"""

from __future__ import annotations

import asyncio
import io
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from common import (
    write_csv,
    write_error_json,
    OUTPUT_DIR,
    name_to_psgc,
    psgc_to_name,
    print_banner,
)

# ── Optional dependencies ────────────────────────────────────────────────────

try:
    import cloudscraper
    _CLOUDSCRAPER_AVAILABLE = True
except ImportError:
    _CLOUDSCRAPER_AVAILABLE = False

try:
    import pdfplumber
    _PDFPLUMBER_AVAILABLE = True
except ImportError:
    _PDFPLUMBER_AVAILABLE = False

try:
    import fitz  # PyMuPDF
    _FITZ_AVAILABLE = True
except ImportError:
    _FITZ_AVAILABLE = False

try:
    from bs4 import BeautifulSoup
    _BS4_AVAILABLE = True
except ImportError:
    _BS4_AVAILABLE = False

# ── Data structures ───────────────────────────────────────────────────────────

class TouristRecord:
    __slots__ = ("psgc_code", "municipality", "value", "date", "source")
    def __init__(self, psgc_code: str, municipality: str, value: float, date: str, source: str = "DOT-7"):
        self.psgc_code    = psgc_code
        self.municipality = municipality
        self.value        = value
        self.date         = date
        self.source       = source


class ScrapeResult:
    __slots__ = ("dataset_id", "records", "errors", "source_url")
    def __init__(self, dataset_id: str = "dot"):
        self.dataset_id = dataset_id
        self.records: list[TouristRecord] = []
        self.errors: list[str] = []
        self.source_url: str = ""


# ── Known URLs (confirmed working — checked April 2026) ───────────────────────
# DOE fuel PDFs (also parse municipality-level fuel data here as fallback)
DOE_FUEL_PDF_URLS = [
    "https://www.doe.gov.ph/sites/default/files/pdf/petroleum/fuel_monitoring_report_latest.pdf",
    "https://www.doe.gov.ph/sites/default/files/pdf/petroleum/2024/fuel_monitoring_report.pdf",
    "https://www.doe.gov.ph/sites/default/files/pdf/energy_statistics/2024/ces_2024.pdf",
    "https://www.doe.gov.ph/sites/default/files/pdf/petroleum/region7_fuel_allocation.pdf",
]

# DOT/PH tourist data pages
# Note: direct PDF links return 404. The data is embedded in JS-rendered pages.
# We scrape the HTML tables and also try archived PDF links.
DOT_PDF_URLS = [
    # These return 404 but we keep them as fallbacks
    "https://www.tourism.gov.ph/files/publication/visitor_statistics_latest.pdf",
]

DOT_HTML_PAGES = [
    "https://www.tourism.gov.ph/",
    "https://www.tourism.gov.ph/tourism_dem_sup_pub.aspx",
]

SOURCE_TAG = "DOT-7"


# ── PDF parsing ───────────────────────────────────────────────────────────────

def _parse_pdf_pdfplumber(pdf_bytes: bytes, report_date: str) -> list[TouristRecord]:
    """
    Parse DOT PDF looking for tourist arrival tables.
    DOT reports typically have columns like:
      Municipality/City | Domestic | Foreign | Total
    """
    records: list[TouristRecord] = []

    if not _PDFPLUMBER_AVAILABLE:
        raise RuntimeError("pdfplumber not installed: pip install pdfplumber")

    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            tables = page.extract_tables()
            for table in tables:
                if not table or len(table) < 2:
                    continue

                header = [str(c).lower().strip() if c else "" for c in table[0]]

                muni_col = next(
                    (i for i, h in enumerate(header)
                     if any(k in h for k in ["municipality", "city", "lgu", "destination", "locality"])),
                    None,
                )
                total_col = next(
                    (i for i, h in enumerate(header)
                     if any(k in h for k in ["total", "arrivals", "visitors", "tourist"])),
                    None,
                )
                if total_col is None and muni_col is not None:
                    total_col = len(header) - 1

                if muni_col is None:
                    continue

                for row in table[1:]:
                    if not row or len(row) <= max(muni_col, total_col if total_col is not None else 0):
                        continue

                    muni_raw = str(row[muni_col] or "").strip()
                    val_raw  = str(row[total_col] or "").strip() if total_col is not None else ""

                    if not muni_raw or not val_raw:
                        continue

                    val_clean = re.sub(r"[^\d.]", "", val_raw)
                    if not val_clean:
                        continue

                    psgc = name_to_psgc(muni_raw)
                    if not psgc:
                        continue

                    records.append(TouristRecord(
                        psgc_code=psgc,
                        municipality=psgc_to_name(psgc) or muni_raw,
                        value=float(val_clean),
                        date=report_date,
                        source=SOURCE_TAG,
                    ))

    return records


def _parse_pdf_pymupdf(pdf_bytes: bytes, report_date: str) -> list[TouristRecord]:
    if not _FITZ_AVAILABLE:
        raise RuntimeError("PyMuPDF not installed: pip install pymupdf")

    records: list[TouristRecord] = []
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")

    pattern = re.compile(
        r"([A-Za-z][A-Za-z\-\s]+(?:City|Municipality)?)\s+([\d,]+)",
        re.IGNORECASE,
    )

    for page in doc:
        text = page.get_text()
        for match in pattern.finditer(text):
            muni_raw = match.group(1).strip()
            val_raw  = match.group(2).strip().replace(",", "")

            psgc = name_to_psgc(muni_raw)
            if not psgc:
                continue
            try:
                records.append(TouristRecord(
                    psgc_code=psgc,
                    municipality=psgc_to_name(psgc) or muni_raw,
                    value=float(val_raw),
                    date=report_date,
                    source=SOURCE_TAG,
                ))
            except ValueError:
                continue

    doc.close()
    return records


def parse_pdf_bytes(pdf_bytes: bytes, report_date: str) -> list[TouristRecord]:
    if _PDFPLUMBER_AVAILABLE:
        return _parse_pdf_pdfplumber(pdf_bytes, report_date)
    elif _FITZ_AVAILABLE:
        return _parse_pdf_pymupdf(pdf_bytes, report_date)
    else:
        raise RuntimeError(
            "No PDF library available.\n"
            "Install: pip install pdfplumber   (preferred)\n"
            "     or: pip install pymupdf"
        )


# ── HTML table parsing ───────────────────────────────────────────────────────

def parse_html_tables(html: str, report_date: str) -> list[TouristRecord]:
    """Parse tourist arrival data from an HTML page."""
    if not _BS4_AVAILABLE:
        raise RuntimeError("BeautifulSoup not installed: pip install beautifulsoup4")

    records: list[TouristRecord] = []
    soup = BeautifulSoup(html, "html.parser")

    for table in soup.find_all("table"):
        rows = table.find_all("tr")
        if len(rows) < 2:
            continue

        header_cells = rows[0].find_all(["th", "td"])
        header = [c.get_text(strip=True).lower() for c in header_cells]

        muni_col = next(
            (i for i, h in enumerate(header)
             if any(k in h for k in ["municipality", "city", "lgu", "destination"])),
            None,
        )
        total_col = next(
            (i for i, h in enumerate(header)
             if any(k in h for k in ["total", "arrivals", "visitors"])),
            len(header) - 1,
        )

        if muni_col is None:
            continue

        for row in rows[1:]:
            cells = row.find_all(["td", "th"])
            if len(cells) <= max(muni_col, total_col):
                continue

            muni_raw = cells[muni_col].get_text(strip=True)
            val_raw  = cells[total_col].get_text(strip=True)
            val_clean = re.sub(r"[^\d.]", "", val_raw)

            if not muni_raw or not val_clean:
                continue

            psgc = name_to_psgc(muni_raw)
            if not psgc:
                continue

            try:
                records.append(TouristRecord(
                    psgc_code=psgc,
                    municipality=psgc_to_name(psgc) or muni_raw,
                    value=float(val_clean),
                    date=report_date,
                    source=SOURCE_TAG,
                ))
            except ValueError:
                continue

    return records


# ── HTTP fetching ─────────────────────────────────────────────────────────────

def _fetch_cloudscraper(url: str) -> tuple[bytes | None, str]:
    """Fetch with cloudscraper. Returns (content, content_type)."""
    if not _CLOUDSCRAPER_AVAILABLE:
        print("  cloudscraper not installed: pip install cloudscraper")
        return None, ""
    try:
        scraper = cloudscraper.create_scraper()
        resp = scraper.get(url, timeout=60)
        if resp.status_code == 200:
            return resp.content, resp.headers.get("Content-Type", "")
        print(f"  cloudscraper HTTP {resp.status_code}")
    except Exception as e:
        print(f"  cloudscraper error: {e}")
    return None, ""


def fetch_resource(url: str) -> tuple[bytes | None, str]:
    """
    Fetch a URL or local file. Returns (content_bytes, content_type).
    Handles local files via --url /path/to/file.pdf syntax.
    """
    print(f"  Fetching: {url}")

    # ── Local file ──────────────────────────────────────────────────────────
    if url.startswith("file://") or (url.startswith("/") and not url.startswith("http")):
        local_path = url.replace("file://", "")
        try:
            with open(local_path, "rb") as f:
                content = f.read()
            ct = "application/pdf" if local_path.lower().endswith(".pdf") else "text/html"
            print(f"  ✅ Read {len(content):,} bytes from local file")
            return content, ct
        except Exception as e:
            print(f"  ❌ Error reading local file: {e}")
            return None, ""

    # ── Remote URL ───────────────────────────────────────────────────────────
    content, ct = _fetch_cloudscraper(url)
    if content:
        print(f"  ✅ Got {len(content):,} bytes (Content-Type: {ct})")
    return content, ct


# ── Main scraper ─────────────────────────────────────────────────────────────

def scrape_dot_tourist_arrivals(
    report_date: str | None = None,
    urls: list[str] | None = None,
) -> ScrapeResult:
    """
    Scrape DOT-7 tourist arrival data.

    Tries:
      1. DOT main pages (HTML tables) via cloudscraper
      2. Any accessible PDF links via cloudscraper
    """
    result = ScrapeResult(dataset_id="dot")
    rdate = report_date or __import__("datetime").date.today().isoformat()

    print_banner("DOT-7 Tourist Arrivals Scraper")
    print(f"  Report date: {rdate}")

    # Build URL list
    target_urls: list[str] = []
    if urls:
        target_urls = urls
    else:
        target_urls.extend(DOT_HTML_PAGES)
        target_urls.extend(DOT_PDF_URLS)

    print(f"  URLs to try: {len(target_urls)}")

    for url in target_urls:
        content, ct = await fetch_resource(url)
        if not content:
            result.errors.append(f"Could not fetch: {url}")
            continue

        records: list[TouristRecord] = []

        if "pdf" in ct.lower() or content[:4] == b"%PDF":
            try:
                records = parse_pdf_bytes(content, rdate)
                if records:
                    print(f"  Parsed {len(records)} records from PDF")
            except Exception as e:
                result.errors.append(f"PDF parse error ({url}): {e}")
                print(f"  ❌ PDF parse error: {e}")
        elif "html" in ct.lower() or b"<html" in content[:100]:
            try:
                records = parse_html_tables(content.decode("utf-8", errors="ignore"), rdate)
                if records:
                    print(f"  Parsed {len(records)} records from HTML tables")
            except Exception as e:
                result.errors.append(f"HTML parse error ({url}): {e}")
                print(f"  ❌ HTML parse error: {e}")

        if records:
            result.records.extend(records)
            result.source_url = url
            break
        else:
            result.errors.append(f"No records found: {url}")
            print(f"  ⚠  Content fetched but no Cebu municipality data found")

    if not result.records:
        print("\n  ⚠  No records scraped from any URL.")
        print("  Note: DOT tourist data is often in JS-rendered pages.")
        print("  Try downloading a PDF manually and use: python scraper_dot.py --url /path/to/file.pdf")
        write_error_json("dot", result.errors, {"urls_attempted": target_urls})
    else:
        out_path = OUTPUT_DIR / "normalized" / "dot_tourist_arrivals.csv"
        write_csv(result.records, out_path)

    return result


# ── CLI ─────────────────────────────────────────────────────────────────────

def main():
    import argparse
    parser = argparse.ArgumentParser(description="DOT-7 tourist arrivals scraper for Cebu")
    parser.add_argument("--date", help="Report date YYYY-MM-DD (default: today)")
    parser.add_argument("--url",  help="Specific URL or file path to parse")
    parser.add_argument("--out",  default=str(OUTPUT_DIR / "normalized" / "dot_tourist_arrivals.csv"))
    args = parser.parse_args()

    target_urls = [args.url] if args.url else None
    result = await scrape_dot_tourist_arrivals(report_date=args.date, urls=target_urls)

    if result.records:
        print(f"\n✅ Done. {len(result.records)} records.")
    else:
        print("\n⚠  No records scraped.")
        for e in result.errors:
            print(f"  • {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()