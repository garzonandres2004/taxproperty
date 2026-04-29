#!/usr/bin/env python3
"""
Research scraper for Tax Lien School Knowledge Vault
Scrapes free public pages for competitive research
"""

import requests
from bs4 import BeautifulSoup
import os
import time

# Free public pages from Knowledge Vault
pages = [
    "https://vault.taxlienschool.com/tax-deed/tax-deed-investing-overview/understanding-tax-deed-investing/",
    "https://vault.taxlienschool.com/tax-deed/tax-deed-investing-overview/how-to-prepare-for-a-tax-deed-auction/",
    "https://vault.taxlienschool.com/tax-deed/tax-deed-investing-overview/top-10-tax-deed-mistakes-you-need-to-avoid/",
    "https://vault.taxlienschool.com/tax-lien/tax-lien-investing-overview/understanding-tax-lien-certificates/",
    "https://vault.taxlienschool.com/tax-lien/tax-lien-investing-overview/how-to-prepare-for-a-tax-lien-auction/",
    "https://vault.taxlienschool.com/redeemable-tax-deed/redeemable-tax-deed-overview/understanding-a-redeemable-tax-deed/",
]

output_dir = "knowledge"
os.makedirs(output_dir, exist_ok=True)

headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

def clean_filename(url):
    """Create clean filename from URL"""
    # Remove protocol and domain
    path = url.replace("https://vault.taxlienschool.com/", "")
    # Remove trailing slash
    path = path.rstrip("/")
    # Replace slashes with hyphens
    path = path.replace("/", "-")
    # Limit length
    if len(path) > 100:
        path = path[:100]
    return f"{path}.txt"

def extract_article_content(html):
    """Extract clean text from article content"""
    soup = BeautifulSoup(html, 'html.parser')

    # Remove script and style elements
    for script in soup(["script", "style", "nav", "header", "footer"]):
        script.decompose()

    # Try to find main content area
    content = soup.find('main') or soup.find('article') or soup.find('div', class_='content')

    if content:
        text = content.get_text(separator='\n', strip=True)
    else:
        # Fallback to body text
        text = soup.get_text(separator='\n', strip=True)

    # Clean up excessive whitespace
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    return '\n\n'.join(lines)

def scrape_page(url):
    """Scrape a single page"""
    print(f"Scraping: {url}")

    try:
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()

        content = extract_article_content(response.text)

        filename = clean_filename(url)
        filepath = os.path.join(output_dir, filename)

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(f"Source: {url}\n")
            f.write(f"Scraped: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write("=" * 80 + "\n\n")
            f.write(content)

        print(f"  ✓ Saved to: {filename}")
        print(f"  ✓ Content length: {len(content)} chars\n")

        return True

    except requests.exceptions.RequestException as e:
        print(f"  ✗ Error: {e}\n")
        return False
    except Exception as e:
        print(f"  ✗ Unexpected error: {e}\n")
        return False

def main():
    print("=" * 80)
    print("Tax Lien School Knowledge Vault Scraper")
    print("For competitive research and product development")
    print("=" * 80 + "\n")

    success_count = 0
    failed_count = 0

    for url in pages:
        if scrape_page(url):
            success_count += 1
        else:
            failed_count += 1

        # Be polite - add delay between requests
        time.sleep(2)

    print("=" * 80)
    print(f"Scraping complete:")
    print(f"  ✓ Successful: {success_count}")
    print(f"  ✗ Failed: {failed_count}")
    print(f"  Files saved to: {output_dir}/")
    print("=" * 80)

if __name__ == "__main__":
    main()
