#!/usr/bin/env python3
"""
Utah County Property Scraper v2 - Perplexity Spec Implementation
- Parses acres and market value from PropertyValues.asp
- Filters seed data (only processes NN:NNN:NNNN pattern)
- Adds scoring algorithm
- Team: User (PM) | Perplexity (Architect) | Claude Code (Engineer)
"""

import csv
import re
import sys
import time
from pathlib import Path
from typing import Optional, Dict
import requests
from bs4 import BeautifulSoup


def is_real_utah_county_serial(serial: str) -> bool:
    """Filter out seed/test data. Real Utah County serials match NN:NNN:NNNN."""
    return bool(re.match(r'^\d{2}:\d{3}:\d{4}$', serial))


def classify_owner_type(owner_name: str) -> str:
    """Classify owner into category based on name patterns."""
    if not owner_name:
        return "UNKNOWN"

    owner_upper = owner_name.upper()

    if any(x in owner_upper for x in ["CITY OF", "COUNTY OF", "STATE OF", "TOWNSHIP"]):
        return "CITY"

    if any(x in owner_upper for x in ["HOMEOWNERS", "HOA", "ASSOCIATION", "COMMUNITY", "CONDOMINIUM"]):
        return "HOA"

    if any(x in owner_upper for x in [" LLC", " INC", " CORP", " LTD", " L.L.C.", "LIMITED", "PARTNERSHIP"]):
        return "LLC"

    if "TRUST" in owner_upper:
        return "TRUST"

    return "INDIVIDUAL"


def calculate_score(market_value: Optional[float], balance_due: float,
                   owner_type: str, acres: Optional[float]) -> int:
    """
    Perplexity's scoring algorithm:
    - Start at 0
    - +40 if market_value between 150k-350k
    - +20 if payoff_to_value_ratio < 0.04
    - +20 if owner_type == INDIVIDUAL
    - -1000 if owner_type in {CITY, COUNTY, HOA, LLC} and market_value < 100k
    - -1000 if is_micro_parcel (acres < 0.02 and market_value < 30k)
    """
    score = 0

    if market_value:
        # Value range bonus
        if 150000 <= market_value <= 350000:
            score += 40

        # Payoff ratio bonus
        if market_value > 0 and balance_due > 0:
            ratio = balance_due / market_value
            if ratio < 0.04:
                score += 20

        # Micro-parcel penalty
        if acres and acres < 0.02 and market_value < 30000:
            score -= 1000

        # Owner type penalty for low-value properties
        if owner_type in {"CITY", "COUNTY", "HOA", "LLC"} and market_value < 100000:
            score -= 1000

    # Owner type bonus
    if owner_type == "INDIVIDUAL":
        score += 20

    return score


def fetch_property_values(serial: str) -> Dict:
    """
    Fetch market value from PropertyValues.asp
    URL format: https://www.utahcounty.gov/LandRecords/PropertyValues.asp?av_serial=SERIAL&av_year=2025
    """
    serial_clean = serial.replace(":", "")
    url = f"https://www.utahcounty.gov/LandRecords/PropertyValues.asp?av_serial={serial_clean}&av_year=2025"

    result = {
        "market_value": None,
        "land_value": None,
        "building_value": None,
        "acres": None,
        "owner_name": ""
    }

    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, 'html.parser')

        # Extract owner name from page header
        owner_match = re.search(r'Owner:\s*([^<\n]+)', response.text)
        if owner_match:
            result["owner_name"] = owner_match.group(1).strip()

        # Look for market value in tables
        # The page has a table with year columns and value rows
        tables = soup.find_all('table')

        in_real_estate_section = False
        in_improvements_section = False

        for table in tables:
            rows = table.find_all('tr')
            for row in rows:
                cells = row.find_all('td')
                if len(cells) < 2:
                    continue

                cell_texts = [c.get_text().strip() for c in cells]
                row_text = ' '.join(cell_texts).upper()

                # Track which section we're in
                if '* * REAL ESTATE' in row_text:
                    in_real_estate_section = True
                    in_improvements_section = False
                    continue
                if '* * IMPROVEMENTS' in row_text:
                    in_real_estate_section = False
                    in_improvements_section = True
                    continue
                if 'TOTAL REAL PROPERTY' in row_text:
                    in_real_estate_section = False
                    in_improvements_section = False
                    # This row has the grand total: Taxable | Market
                    # Look for pattern like: $151,305 $275,100
                    dollar_values = []
                    for cell in cells:
                        text = cell.get_text().strip()
                        if text.startswith('$'):
                            try:
                                dollar_values.append(float(text.replace(',', '').replace('$', '')))
                            except (ValueError, TypeError):
                                pass
                    if len(dollar_values) >= 2:
                        result["market_value"] = dollar_values[-1]  # Last value is Market
                    continue

                # Look for Totals row in each section
                if 'TOTALS' in row_text:
                    # Get the market value (last column with $)
                    for cell in reversed(cells):
                        text = cell.get_text().strip()
                        if text.startswith('$'):
                            try:
                                val = float(text.replace(',', '').replace('$', ''))
                                if in_real_estate_section and result["land_value"] is None:
                                    result["land_value"] = val
                                elif in_improvements_section and result["building_value"] is None:
                                    result["building_value"] = val
                            except (ValueError, TypeError):
                                pass
                            break

        # Also try to get acres from this page
        text = soup.get_text()
        acre_match = re.search(r'Acreage[:\s]+([\d.]+)', text, re.IGNORECASE)
        if acre_match:
            try:
                result["acres"] = float(acre_match.group(1))
            except (ValueError, TypeError):
                pass

        return result

    except Exception as e:
        print(f"    Error fetching values for {serial}: {e}")
        return result


def fetch_property_summary(serial: str) -> Optional[Dict]:
    """Fetch basic property info from main property page."""
    serial_clean = serial.replace(":", "")
    url = f"https://www.utahcounty.gov/LandRecords/Property.asp?av_serial={serial_clean}"

    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, 'html.parser')

        data = {
            "situs_address": "",
            "mailing_address": "",
            "owner_name": "",
            "acres": None,
            "tax_area": "",
            "subdivision_map": "",
            "taxing_description": ""
        }

        # Extract owner name
        owner_match = re.search(r'Owner[^<]*<[^>]*>\s*([^<]+)', response.text, re.IGNORECASE)
        if owner_match:
            data["owner_name"] = owner_match.group(1).strip()

        # Extract property address
        addr_match = re.search(r'Property Address[^<]*<[^>]*>\s*([^<]+)', response.text, re.IGNORECASE)
        if addr_match:
            data["situs_address"] = addr_match.group(1).strip()

        # Extract acres from page text
        text = soup.get_text()
        acre_match = re.search(r'Acreage[:\s]+([\d.]+)', text, re.IGNORECASE)
        if acre_match:
            try:
                data["acres"] = float(acre_match.group(1))
            except (ValueError, TypeError):
                pass

        return data if data["owner_name"] or data["situs_address"] else None

    except Exception as e:
        print(f"    Error fetching summary for {serial}: {e}")
        return None


def process_input_file(input_path: Path, output_path: Path):
    """Main processing loop with Perplexity spec."""

    # Read input CSV
    input_rows = []
    with open(input_path, 'r', newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            input_rows.append(row)

    print(f"Loaded {len(input_rows)} total properties from {input_path}")

    # Filter to only real Utah County serials
    real_properties = [r for r in input_rows if is_real_utah_county_serial(r.get("serial", ""))]
    skipped = len(input_rows) - len(real_properties)

    print(f"Filtered to {len(real_properties)} real Utah County properties (skipped {skipped} seed/test)")
    print()

    # Process each property
    results = []
    for i, row in enumerate(real_properties, 1):
        serial = row.get("serial", "").strip()
        balance_str = row.get("balance_due", "0").replace(",", "").replace("$", "")

        try:
            balance = float(balance_str) if balance_str else 0.0
        except ValueError:
            balance = 0.0

        print(f"[{i}/{len(real_properties)}] Processing {serial}...")

        # Fetch summary data
        summary = fetch_property_summary(serial) or {}

        # Fetch market values
        print(f"    Fetching market values...")
        values = fetch_property_values(serial)

        # Combine data
        owner_name = values.get("owner_name") or summary.get("owner_name") or row.get("owner_name_raw", "")
        record = {
            "serial": serial,
            "situs_address": summary.get("situs_address", ""),
            "mailing_address": summary.get("mailing_address", ""),
            "owner_name": owner_name,
            "owner_type_tag": classify_owner_type(owner_name),
            "acres": values.get("acres") or summary.get("acres"),
            "market_value": values.get("market_value"),
            "land_value": values.get("land_value"),
            "building_value": values.get("building_value"),
            "tax_area": summary.get("tax_area", ""),
            "subdivision_map": summary.get("subdivision_map", ""),
            "taxing_description": summary.get("taxing_description", ""),
            "balance_due": balance,
            "payoff_to_value_ratio": None,
            "is_micro_parcel": False,
            "is_likely_condo": False,
            "score": 0,
            "data_source": "Utah County Land Records"
        }

        # Calculate derived fields
        if record["market_value"] and record["market_value"] > 0 and balance > 0:
            record["payoff_to_value_ratio"] = balance / record["market_value"]

        # Check for micro-parcel
        if record["acres"] and record["market_value"]:
            record["is_micro_parcel"] = (record["acres"] < 0.02 and record["market_value"] < 30000)

        # Check for condo
        desc = record["taxing_description"] or ""
        sub = record["subdivision_map"] or ""
        condo_keywords = ["UNIT", "CONDO", "CONDOMINIUM", "BUILDING", "PHASE", "TOWNHOME", "TOWNHOUSE"]
        record["is_likely_condo"] = any(k in desc.upper() or k in sub.upper() for k in condo_keywords)

        # Calculate score using Perplexity's algorithm
        record["score"] = calculate_score(
            record["market_value"],
            balance,
            record["owner_type_tag"],
            record["acres"]
        )

        results.append(record)

        # Be nice to the server
        time.sleep(1.5)

    # Write output CSV
    if results:
        fieldnames = [
            "serial", "situs_address", "mailing_address", "owner_name",
            "owner_type_tag", "acres", "market_value", "land_value",
            "building_value", "tax_area", "subdivision_map", "taxing_description",
            "balance_due", "payoff_to_value_ratio", "is_micro_parcel",
            "is_likely_condo", "score", "data_source"
        ]

        with open(output_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(results)

        print(f"\n{'='*50}")
        print(f"Wrote {len(results)} records to {output_path}")
        print(f"{'='*50}")

        # Summary statistics
        micro_count = sum(1 for r in results if r.get("is_micro_parcel"))
        condo_count = sum(1 for r in results if r.get("is_likely_condo"))
        individual_count = sum(1 for r in results if r.get("owner_type_tag") == "INDIVIDUAL")
        high_scores = sum(1 for r in results if r.get("score", 0) > 50)

        print("\n=== SUMMARY ===")
        print(f"Total processed: {len(results)}")
        print(f"Micro-parcels (auto-skip): {micro_count}")
        print(f"Likely condos: {condo_count}")
        print(f"Individual owners: {individual_count}")
        print(f"High scores (>50): {high_scores}")

        # Top 5 by score
        print("\n=== TOP 5 PROPERTIES BY SCORE ===")
        sorted_results = sorted(results, key=lambda x: x.get("score", 0), reverse=True)
        for i, r in enumerate(sorted_results[:5], 1):
            mv_str = f"${r['market_value']:,.0f}" if r['market_value'] else "N/A"
            print(f"{i}. {r['serial']}: Score {r['score']}, "
                  f"MV {mv_str}, "
                  f"Payoff ${r['balance_due']:,.2f}, "
                  f"Owner: {r['owner_type_tag']}")


def main():
    """CLI entry point."""
    if len(sys.argv) < 3:
        print("Usage: python utah_county_scraper_v2.py scrape <input.csv>")
        print("\nExample:")
        print("  python utah_county_scraper_v2.py scrape utah_parcels_from_db.csv")
        sys.exit(1)

    command = sys.argv[1]
    input_path = Path(sys.argv[2])

    if command != "scrape":
        print(f"Unknown command: {command}")
        sys.exit(1)

    if not input_path.exists():
        print(f"Error: Input file not found: {input_path}")
        sys.exit(1)

    output_path = Path("output_parcels_scored.csv")
    process_input_file(input_path, output_path)


if __name__ == "__main__":
    main()
