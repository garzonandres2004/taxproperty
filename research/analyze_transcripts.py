#!/usr/bin/env python3
"""Analyze Dustin Hahn transcripts and extract knowledge for product development"""

import os
import re
import glob

# Read all transcript files
transcript_files = glob.glob("research/transcripts/*.txt")
transcript_files = [f for f in transcript_files if not f.endswith('summary.json')]

print("="*60)
print("Analyzing Transcripts for Knowledge Extraction")
print(f"Files found: {len(transcript_files)}")
print("="*60 + "\n")

all_text = ""
for filepath in transcript_files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        all_text += content + "\n\n"

print(f"Total text loaded: {len(all_text):,} characters\n")

# Extract sections
extracted = {
    "tools_websites": [],
    "formulas_calculations": [],
    "due_diligence_steps": [],
    "red_flags": [],
    "state_rules": [],
    "key_concepts": [],
    "roi_interest_rates": [],
    "process_workflows": []
}

# Patterns to search for
patterns = {
    "tools_websites": [
        r'\b(Zillow|Redfin|Realtor\.com|Trulia|Propstream|LandGlide|Google Maps|Google Earth|PACER|county recorder|county assessor|county treasurer|GIS|MLS)\b',
        r'\b(website|online|search|database|tool|app|software)\b.*?(?=:|;|\.|,|\n)',
    ],
    "formulas_calculations": [
        r'\d+%.*?\brule\b',
        r'\$[\d,]+.*?\b(profit|margin|bid|return)\b',
        r'\b(calculate|formula|percent|%)\b.*?\d+',
        r'ARV|after repair value',
        r'\d+\s*%(?:\s*to\s*\d+%)?\s*(?:interest|return|ROI)',
    ],
    "due_diligence_steps": [
        r'(?i)(?:first|second|third|next|then|finally|step \d+|#\d+)\s*[\.:]?\s*([^.]+?(?:check|research|verify|look|search|drive|call|review)[^.]*\.?)',
        r'(?i)(?:you need to|make sure to|always|don\'t forget to)\s+([^.]+)',
    ],
    "red_flags": [
        r'(?i)(?:avoid|watch out|beware|red flag|danger|warning|never|don\'t)\s+[\w\s]+?(?:\.|,|;|\n)',
        r'(?i)(?:mistake|error|problem)\s+(?:is|to|that)[^.]+',
    ],
    "state_rules": [
        r'\b(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming)\b[^.]*(?:tax|lien|deed|sale|auction|redemption|interest)',
        r'\b(UT|FL|TX|CA|AZ|CO|NY|PA|OH|IL|GA|NC|SC|WA|OR|NV|NM|KS|MO|OK|AR|LA|MS|AL|TN|KY|WV|VA|MD|DE|NJ|CT|RI|MA|NH|VT|ME|MN|IA|WI|MI|IN|OH|ND|SD|NE|ID|MT|WY|HI|AK)\b[^.]*(?:tax|lien|deed)',
    ],
    "roi_interest_rates": [
        r'\d+%\s*(?:return|ROI|interest|rate)',
        r'\$\d+[\d,]*\s*(?:profit|return|bid|investment)',
        r'(?:up to|as high as|maximum of)\s*\d+%',
    ],
    "process_workflows": [
        r'(?i)(?:process|workflow|steps?|procedure|how to)\s*[\.:]?\s*([^.]+)',
        r'(?i)(?:start|begin)\s+by\s+([^.]+)',
        r'(?i)(?:after|once|when)\s+[\w\s]+,\s*([^.]+)',
    ]
}

# Search for patterns
for category, pattern_list in patterns.items():
    found_items = set()
    for pattern in pattern_list:
        matches = re.findall(pattern, all_text, re.IGNORECASE | re.MULTILINE)
        for match in matches:
            if isinstance(match, tuple):
                match = match[0]
            clean = match.strip()
            if len(clean) > 10 and len(clean) < 300:
                found_items.add(clean)
    extracted[category] = sorted(list(found_items))[:30]  # Top 30 unique items

# Generate output
output = """# Extracted Knowledge from Dustin Hahn YouTube Transcripts

**Source:** 16 videos, 46,399 words
**Topics:** Due diligence, research, tax deeds, tax liens, beginner guides
**Date:** 2026-04-28

---

## Tools & Websites Mentioned

"""

for item in extracted["tools_websites"]:
    output += f"- {item}\n"

output += """

---

## Formulas & Calculations

"""

for item in extracted["formulas_calculations"]:
    output += f"- {item}\n"

output += """

---

## Due Diligence Steps & Processes

"""

for i, item in enumerate(extracted["due_diligence_steps"], 1):
    output += f"{i}. {item}\n"

output += """

---

## Red Flags & Warnings

"""

for item in extracted["red_flags"]:
    output += f"- {item}\n"

output += """

---

## State-Specific Rules

"""

for item in extracted["state_rules"]:
    output += f"- {item}\n"

output += """

---

## ROI & Interest Rates Mentioned

"""

for item in extracted["roi_interest_rates"]:
    output += f"- {item}\n"

output += """

---

## Process Workflows

"""

for item in extracted["process_workflows"]:
    output += f"- {item}\n"

output += """

---

## Key Concepts & Terminology

"""

# Extract common terms
terms = [
    "tax deed", "tax lien", "redemption period", "quiet title",
    "over the counter", "OTC", "premium bid", "bid down",
    "county auction", "municipal", "delinquent", "assessed value",
    "market value", "payoff amount", "back taxes", "interest rate"
]

for term in terms:
    count = all_text.lower().count(term.lower())
    if count > 5:
        output += f"- **{term.title()}** (mentioned {count} times)\n"

output += """

---

## Insights for Product Development

### What Users Are Searching For (from transcripts):
1. Step-by-step beginner guides
2. How to research properties before bidding
3. What mistakes to avoid
4. State-specific rules and differences
5. ROI calculations and profit margins
6. Due diligence checklists
7. Tools and resources to use

### What Experts Do Manually (automation opportunities):
1. Check county websites for tax history
2. Search for liens at county recorder
3. Calculate max bid using formulas
4. Research state-specific rules
5. Drive by properties for inspection
6. Verify zoning and buildability

### Common Pain Points (to solve in app):
1. "Too many county websites to check"
2. "Don't know what to research"
3. "Don't know max bid to set"
4. "Don't understand state differences"
5. "Miss important red flags"

---

*Extracted automatically from publicly available YouTube content.*
*For research and product development purposes only.*
"""

# Save output
with open("research/EXTRACTED_KNOWLEDGE.md", 'w', encoding='utf-8') as f:
    f.write(output)

print("✅ Analysis complete!")
print(f"✅ Extracted {sum(len(v) for v in extracted.values())} knowledge items")
print("✅ Saved to: research/EXTRACTED_KNOWLEDGE.md")
print("\nPreview of extracted content:")
print("-" * 60)
print(output[:2000])
print("\n... (truncated)")
