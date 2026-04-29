#!/usr/bin/env python3
"""Extract clean text from downloaded HTML files"""

from bs4 import BeautifulSoup
import os

html_files = [
    ("understanding-tax-deed.html", "understanding-tax-deed.txt"),
    ("how-to-prepare.html", "how-to-prepare-for-auction.txt"),
    ("top-10-mistakes.html", "top-10-mistakes.txt"),
    ("understanding-tax-lien.html", "understanding-tax-lien.txt"),
    ("prepare-tax-lien.html", "prepare-for-tax-lien-auction.txt"),
    ("understanding-redeemable.html", "understanding-redeemable-deed.txt"),
]

def extract_article(html_path):
    """Extract article content from HTML"""
    with open(html_path, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f.read(), 'html.parser')

    # Remove unwanted elements
    for elem in soup(['script', 'style', 'nav', 'header', 'footer', 'aside']):
        elem.decompose()

    # Try to find main article content
    content = soup.find('main') or soup.find('article') or soup.find('div', class_='entry-content')

    if content:
        # Get all paragraphs and headings
        text_parts = []
        for elem in content.find_all(['p', 'h1', 'h2', 'h3', 'h4', 'li']):
            text = elem.get_text(strip=True)
            if text and len(text) > 10:  # Skip very short fragments
                text_parts.append(text)

        return '\n\n'.join(text_parts)
    else:
        # Fallback: get all text
        return soup.get_text(separator='\n', strip=True)

def main():
    for html_file, txt_file in html_files:
        print(f"Extracting: {html_file}")

        if not os.path.exists(html_file):
            print(f"  ✗ File not found: {html_file}")
            continue

        try:
            content = extract_article(html_file)

            with open(txt_file, 'w', encoding='utf-8') as f:
                f.write(f"Source: {html_file}\n")
                f.write("=" * 80 + "\n\n")
                f.write(content)

            print(f"  ✓ Saved to: {txt_file}")
            print(f"  ✓ Content length: {len(content)} chars\n")

        except Exception as e:
            print(f"  ✗ Error: {e}\n")

if __name__ == "__main__":
    os.chdir('/Users/andres/taxproperty_ai/research/knowledge')
    main()
