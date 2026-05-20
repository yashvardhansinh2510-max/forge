#!/usr/bin/env python3
"""Extract comprehensive product catalog and generate TypeScript products array."""

import re
import sys
import json

try:
    import pdfplumber
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pdfplumber", "-q"])
    import pdfplumber

def parse_indian_number(s):
    """Convert Indian formatted number to float."""
    if not s or not isinstance(s, str):
        return 0
    s = s.strip().replace(',', '')
    try:
        return float(s) if s else 0
    except:
        return 0

def extract_hansgrohe_full():
    """Extract all Hansgrohe products."""
    pdf_path = "/Users/yashvardhansinhjhala/forge/HANSGROHE MRP 2027-28.pdf"
    products = []

    try:
        with pdfplumber.open(pdf_path) as pdf:
            print(f"Processing {len(pdf.pages)} Hansgrohe pages...")

            for page_num in range(len(pdf.pages)):
                page = pdf.pages[page_num]
                table = page.extract_table()

                if not table or len(table) < 2:
                    continue

                for row in table[1:]:
                    if len(row) >= 5:
                        try:
                            article = str(row[1]).strip() if row[1] else ""
                            product_name = str(row[2]).strip() if row[2] else ""
                            mrp_str = str(row[4]).strip() if row[4] else "0"

                            if article and article.isdigit() and len(article) == 8:
                                mrp = parse_indian_number(mrp_str)
                                if mrp > 100:  # Reasonable minimum
                                    products.append({
                                        'article': article,
                                        'name': product_name[:70],
                                        'mrp': int(mrp)
                                    })
                        except:
                            continue

    except Exception as e:
        print(f"Error: {e}")

    # Deduplicate by article
    seen = {}
    unique = []
    for p in products:
        if p['article'] not in seen:
            seen[p['article']] = True
            unique.append(p)

    return unique

def extract_vitra_full():
    """Extract all Vitra products."""
    pdf_path = "/Users/yashvardhansinhjhala/forge/vitra Price Table 2026.pdf"
    products = []

    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page_num in range(len(pdf.pages)):
                page = pdf.pages[page_num]
                text = page.extract_text()

                if not text:
                    continue

                # Pattern: alphanumeric code followed by price
                pattern = r'([A-Z0-9]{8,20})\s+(\d{1,3}(?:,\d{2,3})*)'
                matches = re.findall(pattern, text)

                for code, mrp_str in matches:
                    mrp = parse_indian_number(mrp_str)
                    if mrp > 100:
                        products.append({
                            'article': code,
                            'name': f'Vitra {code}',
                            'mrp': int(mrp)
                        })

    except Exception as e:
        print(f"Error: {e}")

    # Deduplicate
    seen = {}
    unique = []
    for p in products:
        if p['article'] not in seen:
            seen[p['article']] = True
            unique.append(p)

    return unique

def extract_grohe_full():
    """Extract Grohe products from text content."""
    pdf_path = "/Users/yashvardhansinhjhala/forge/Grohe Pricing -10th July.pdf"
    products = []

    try:
        with pdfplumber.open(pdf_path) as pdf:
            print(f"Processing {len(pdf.pages)} Grohe pages...")

            for page_num in range(len(pdf.pages)):
                page = pdf.pages[page_num]

                # Try table first
                table = page.extract_table()
                if table and len(table) > 2:
                    for row in table[1:]:
                        if len(row) >= 3:
                            try:
                                article = str(row[0]).strip() if row[0] else ""
                                product_name = str(row[1]).strip() if row[1] else ""
                                mrp_str = str(row[2]).strip() if row[2] else "0"

                                # Article number pattern for Grohe (usually 8 digits)
                                if article and len(article) >= 6 and any(c.isdigit() for c in article):
                                    mrp = parse_indian_number(mrp_str)
                                    if mrp > 100:
                                        products.append({
                                            'article': article,
                                            'name': product_name[:70],
                                            'mrp': int(mrp)
                                        })
                            except:
                                continue

    except Exception as e:
        print(f"Error: {e}")

    seen = {}
    unique = []
    for p in products:
        if p['article'] not in seen:
            seen[p['article']] = True
            unique.append(p)

    return unique

if __name__ == "__main__":
    print("Extracting complete catalogs...\n")

    hansgrohe = extract_hansgrohe_full()
    print(f"Hansgrohe: {len(hansgrohe)} products")
    if hansgrohe:
        print(f"  Sample: {hansgrohe[0]}")

    vitra = extract_vitra_full()
    print(f"Vitra: {len(vitra)} products")
    if vitra:
        print(f"  Sample: {vitra[0]}")

    grohe = extract_grohe_full()
    print(f"Grohe: {len(grohe)} products")
    if grohe:
        print(f"  Sample: {grohe[0]}")

    # Save as JSON for reference
    catalog = {
        'hansgrohe': hansgrohe,
        'vitra': vitra,
        'grohe': grohe,
        'total': len(hansgrohe) + len(vitra) + len(grohe)
    }

    with open('/tmp/product_catalog.json', 'w') as f:
        json.dump(catalog, f, indent=2)

    print(f"\nTotal: {catalog['total']} products")
    print("Saved to /tmp/product_catalog.json")
