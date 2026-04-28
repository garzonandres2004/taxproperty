#!/usr/bin/env python3
"""
Utah County Property Scraper v1.1
Reads serial numbers + balances, scrapes Utah County Land Records, outputs scored CSV.
Team: User (PM), Perplexity (Architect), Claude Code (Engineer)

This version uses web scraping since the ArcGIS API requires authentication.
"""

import csv
import json
import re
import sys
import time
from pathlib import Path
from typing import Optional, Dict
from urllib.parse import quote
import requests
from bs4 import BeautifulSoup


def classify_owner_type(owner_name: str) -> str:
    """Classify owner into category based on name patterns."""
    if not owner_name:
        return "UNKNOWN"

    owner_upper = owner_name.upper()

    # Government entities
    if any(x in owner_upper for x in ["CITY OF", "COUNTY OF", "STATE OF", "UTAH", "TOWNSHIP"]):
        return "CITY"

    # HOAs and associations
    if any(x in owner_upper for x in ["HOMEOWNERS", "HOA", "ASSOCIATION", "COMMUNITY", "CONDOMINIUM"]):
        return "HOA"

    # Business entities
    if any(x in owner_upper for x in [" LLC", " INC", " CORP", " LTD", " L.L.C.", "LIMITED", "PARTNERSHIP"]):
        return "LLC"

    # Trusts
    if "TRUST" in owner_upper:
        return "TRUST"

    # Individuals (default)
    return "INDIVIDUAL"


def is_micro_parcel(acres: Optional[float], market_value: Optional[float]) -> bool:
    """Determine if parcel is a tiny sliver/easement not worth pursuing."""
    if acres is None or market_value is None:
        return False
    return acres < 0.02 and market_value < 30000


def is_likely_condo(tax_description: str, subdivision: str) -> bool:
    """Check if property is likely a condo based on description."""
    if not tax_description:
        return False

    desc_upper = tax_description.upper()
    sub_upper = (subdivision or "").upper()

    condo_indicators = [
        "UNIT", "CONDO", "CONDOMINIUM", "APT", "APARTMENT",
        "BUILDING", "PHASE", "TOWNHOME", "TOWNHOUSE"
    ]

    return any(indicator in desc_upper or indicator in sub_upper for indicator in condo_indicators)


def fetch_property_summary(serial: str) -> Optional[Dict]:
    """
    Scrape Utah County Land Records summary page for a given serial.
    Returns parsed data or None if not found.
    """
    # Utah County Land Records uses a different format - the serial needs to be split
    # Format like 55:109:0006 becomes separate parts
    serial_clean = serial.replace(":", "")

    # Try the property search URL
    url = f"https://www.utahcounty.gov/LandRecords/Property.asp?av_serial={serial_clean}"

    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, 'html.parser')

        # Extract basic info from the page
        data = {
            "serial": serial,
            "situs_address": "",
            "mailing_address": "",
            "owner_name": "",
            "acres": None,
            "market_value": None,
            "land_value": None,
            "building_value": None,
            "tax_area": "",
            "subdivision_map": "",
            "taxing_description": "",
            "data_source": "Utah County Land Records"
        }

        # Try to find owner name
        owner_match = re.search(r'Owner:\s*<[^>]*>\s*([^<]+)', response.text)
        if owner_match:
            data["owner_name"] = owner_match.group(1).strip()

        # Try to find address
        addr_match = re.search(r'Property Address:\s*<[^>]*>\s*([^<]+)', response.text, re.IGNORECASE)
        if addr_match:
            data["situs_address"] = addr_match.group(1).strip()

        # Check if we got meaningful data
        if not data["owner_name"] and not data["situs_address"]:
            # Try alternative parsing
            # Look for table data
            tables = soup.find_all('table')
            for table in tables:
                text = table.get_text()
                if "Owner" in text:
                    # Extract owner from table
                    rows = table.find_all('tr')
                    for row in rows:
                        cells = row.find_all('td')
                        if cells and len(cells) >= 2:
                            label = cells[0].get_text().strip()
                            if "Owner" in label:
                                data["owner_name"] = cells[1].get_text().strip()
                            elif "Property Address" in label:
                                data["situs_address"] = cells[1].get_text().strip()

        return data if data["owner_name"] or data["situs_address"] else None

    except requests.RequestException as e:
        print(f"  Error fetching {serial}: {e}")
        return None


def parse_tax_year_from_pdf(serial: str, year: int) -> Optional[float]:
    """
    Fetch specific tax year details from Utah County Tax Detail page.
    This is a placeholder - in production you'd parse the actual page.
    """
    # Example URL: https://www.utahcounty.gov/LandRecords/TaxDetailPie.asp?av_serial=20190041&av_year=2009
    # For now, return None as this requires more complex parsing
    return None


def process_input_file(input_path: Path, output_path: Path):
    """Main processing loop."""

    # Read input CSV
    input_rows = []
    with open(input_path, 'r', newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            input_rows.append(row)

    print(f"Loaded {len(input_rows)} properties from {input_path}")
    print("\nNOTE: Web scraping mode enabled. API requires authentication.")
    print("This will fetch data from Utah County Land Records website.\n")

    # Process each property
    results = []
    for i, row in enumerate(input_rows, 1):
        serial = row.get("serial", "").strip()
        balance_str = row.get("balance_due", "0").replace(",", "").replace("$", "")

        try:
            balance = float(balance_str) if balance_str else 0.0
        except ValueError:
            balance = 0.0

        print(f"[{i}/{len(input_rows)}] Processing {serial}...")

        # Fetch from web
        attrs = fetch_property_summary(serial)

        if attrs:
            # Add computed fields
            attrs["balance_due"] = balance
            attrs["owner_type_tag"] = classify_owner_type(attrs.get("owner_name", ""))
            attrs["is_micro_parcel"] = is_micro_parcel(attrs.get("acres"), attrs.get("market_value"))
            attrs["is_likely_condo"] = is_likely_condo(attrs.get("taxing_description", ""), attrs.get("subdivision_map", ""))

            # Calculate payoff ratio
            if attrs.get("market_value") and attrs["market_value"] > 0 and balance:
                attrs["payoff_to_value_ratio"] = balance / attrs["market_value"]
            else:
                attrs["payoff_to_value_ratio"] = None

            results.append(attrs)
        else:
            # Create minimal record for not found
            results.append({
                "serial": serial,
                "situs_address": "",
                "mailing_address": "",
                "owner_name": row.get("owner_name_raw", ""),
                "owner_type_tag": classify_owner_type(row.get("owner_name_raw", "")),
                "acres": None,
                "market_value": None,
                "land_value": None,
                "building_value": None,
                "tax_area": "",
                "subdivision_map": "",
                "taxing_description": "",
                "balance_due": balance,
                "payoff_to_value_ratio": None,
                "is_micro_parcel": False,
                "is_likely_condo": False,
                "data_source": "NOT_FOUND"
            })

        # Be nice to the server
        time.sleep(1.5)

    # Write output CSV
    if results:
        fieldnames = [
            "serial", "situs_address", "mailing_address", "owner_name",
            "owner_type_tag", "acres", "market_value", "land_value",
            "building_value", "tax_area", "subdivision_map", "taxing_description",
            "balance_due", "payoff_to_value_ratio", "is_micro_parcel",
            "is_likely_condo", "data_source"
        ]

        with open(output_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(results)

        print(f"\nWrote {len(results)} records to {output_path}")

        # Print summary
        micro_count = sum(1 for r in results if r.get("is_micro_parcel"))
        condo_count = sum(1 for r in results if r.get("is_likely_condo"))
        individual_count = sum(1 for r in results if r.get("owner_type_tag") == "INDIVIDUAL")
        not_found = sum(1 for r in results if r.get("data_source") == "NOT_FOUND")

        print("\n=== SUMMARY ===")
        print(f"Total processed: {len(results)}")
        print(f"Micro-parcels (auto-skip): {micro_count}")
        print(f"Likely condos: {condo_count}")
        print(f"Individual owners: {individual_count}")
        print(f"Not found in web scrape: {not_found}")


def create_sample_input(output_path: Path):
    """Create a sample input file for testing."""
    sample_data = [
        {"serial": "55:555:0022", "balance_due": "5125.01", "owner_name_raw": "JACKSON, MARCUS"},
        {"serial": "55:109:0006", "balance_due": "8985.08", "owner_name_raw": "GAISFORD, KAREN COOK"},
        {"serial": "01:008:0006", "balance_due": "9539.04", "owner_name_raw": "BASES LOADED INVESTING LLC"},
        {"serial": "03:060:0016", "balance_due": "8673.39", "owner_name_raw": "HARBOLD, KAREN F"},
        {"serial": "03:013:0086", "balance_due": "413.06", "owner_name_raw": "SAMPSON, DALE W"},
    ]

    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=["serial", "balance_due", "owner_name_raw"])
        writer.writeheader()
        writer.writerows(sample_data)

    print(f"Created sample input file: {output_path}")


def main():
    """CLI entry point."""
    if len(sys.argv) < 2:
        print("Usage: python utah_county_scraper.py <command>")
        print("")
        print("Commands:")
        print("  sample              - Create sample input file")
        print("  scrape <input.csv>  - Process input CSV and output results")
        print("")
        print("Examples:")
        print("  python utah_county_scraper.py sample")
        print("  python utah_county_scraper.py scrape input_serials.csv")
        sys.exit(1)

    command = sys.argv[1]

    if command == "sample":
        create_sample_input(Path("input_serials.csv"))
        print("\nEdit input_serials.csv with your properties, then run:")
        print("  python utah_county_scraper.py scrape input_serials.csv")

    elif command == "scrape":
        if len(sys.argv) < 3:
            print("Error: Please provide input CSV path")
            sys.exit(1)

        input_path = Path(sys.argv[2])
        if not input_path.exists():
            print(f"Error: Input file not found: {input_path}")
            sys.exit(1)

        output_path = Path("output_parcels.csv")
        process_input_file(input_path, output_path)

    else:
        print(f"Unknown command: {command}")
        sys.exit(1)


if __name__ == "__main__":
    main()
