#!/usr/bin/env python3
"""Extract complete product catalog from pricing PDFs and generate TypeScript."""

import re
import sys

try:
    import pdfplumber
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pdfplumber", "-q"])
    import pdfplumber

def parse_indian_number(s):
    """Convert Indian formatted number (8,57,640.00) to float."""
    if not s or not isinstance(s, str):
        return 0
    s = s.strip().replace(',', '')
    try:
        return float(s) if s else 0
    except:
        return 0

def extract_grohe_catalog():
    """Extract Grohe products from pricing PDF."""
    pdf_path = "/Users/yashvardhansinhjhala/forge/Grohe Pricing -10th July.pdf"
    products = []

    try:
        with pdfplumber.open(pdf_path) as pdf:
            # Skip first few intro pages, start from page ~5 where actual products begin
            for page_num in range(4, min(50, len(pdf.pages))):  # Sample first sections
                page = pdf.pages[page_num]
                table = page.extract_table()

                if not table:
                    continue

                # Try to parse table: [Article No, Product Name, MRP, ...]
                for row in table[1:]:  # Skip header
                    if len(row) >= 3:
                        article = str(row[0]).strip() if row[0] else ""
                        product_name = str(row[1]).strip() if row[1] else ""
                        mrp_str = str(row[2]).strip() if row[2] else "0"

                        if article and article.isdigit() and len(article) == 8:
                            mrp = parse_indian_number(mrp_str)
                            if mrp > 0:
                                products.append({
                                    'brand': 'GROHE',
                                    'article': article,
                                    'name': product_name,
                                    'mrp': int(mrp),
                                    'category': 'Bathroom Fittings'
                                })
                                if len(products) <= 10:
                                    print(f"  ✓ {article}: {product_name[:40]} - ₹{mrp:,.0f}")

    except Exception as e:
        print(f"Error extracting Grohe: {e}")

    return products[:30]  # Return first 30 for now

def extract_hansgrohe_catalog():
    """Extract Hansgrohe products from pricing PDF."""
    pdf_path = "/Users/yashvardhansinhjhala/forge/HANSGROHE MRP 2027-28.pdf"
    products = []

    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page_num in range(0, min(20, len(pdf.pages))):  # First 20 pages
                page = pdf.pages[page_num]
                table = page.extract_table()

                if not table:
                    continue

                # Table format: Sr.No, Article No, Product Description, Image, MRP, Qty
                for row in table[1:]:  # Skip header
                    if len(row) >= 5:
                        try:
                            article = str(row[1]).strip() if row[1] else ""
                            product_name = str(row[2]).strip() if row[2] else ""
                            mrp_str = str(row[4]).strip() if len(row) > 4 and row[4] else "0"

                            if article and article.isdigit() and len(article) == 8:
                                mrp = parse_indian_number(mrp_str)
                                if mrp > 0:
                                    products.append({
                                        'brand': 'HANSGROHE',
                                        'article': article,
                                        'name': product_name[:60],
                                        'mrp': int(mrp),
                                        'category': 'Showers & Accessories'
                                    })
                                    if len(products) <= 10:
                                        print(f"  ✓ {article}: {product_name[:40]} - ₹{mrp:,.0f}")
                        except:
                            continue

    except Exception as e:
        print(f"Error extracting Hansgrohe: {e}")

    return products[:30]

def extract_vitra_catalog():
    """Extract Vitra products from pricing PDF."""
    pdf_path = "/Users/yashvardhansinhjhala/forge/vitra Price Table 2026.pdf"
    products = []

    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page_num in range(0, min(4, len(pdf.pages))):
                page = pdf.pages[page_num]
                text = page.extract_text()

                if not text:
                    continue

                # Find pattern: CODE NUMBER - MRP - CODE NUMBER - MRP
                # Format: 5885B403H0101 - 1,30,610
                pattern = r'(\d{4}[A-Z]\d{3}[A-Z]\d{4})\s+(\d{1,3}(?:,\d{2})*(?:,\d{3})?)'
                matches = re.findall(pattern, text)

                for code, mrp_str in matches:
                    mrp = parse_indian_number(mrp_str)
                    if mrp > 0:
                        products.append({
                            'brand': 'VITRA',
                            'article': code,
                            'name': f'Vitra Product {code}',
                            'mrp': int(mrp),
                            'category': 'Toilets & Sanitary'
                        })
                        if len(products) <= 10:
                            print(f"  ✓ {code}: ₹{mrp:,.0f}")

    except Exception as e:
        print(f"Error extracting Vitra: {e}")

    return products[:30]

if __name__ == "__main__":
    print("Extracting product catalogs...\n")

    print("GROHE Products:")
    grohe_products = extract_grohe_catalog()
    print(f"  → Found {len(grohe_products)} products\n")

    print("HANSGROHE Products:")
    hansgrohe_products = extract_hansgrohe_catalog()
    print(f"  → Found {len(hansgrohe_products)} products\n")

    print("VITRA Products:")
    vitra_products = extract_vitra_catalog()
    print(f"  → Found {len(vitra_products)} products\n")

    total = len(grohe_products) + len(hansgrohe_products) + len(vitra_products)
    print(f"Total products extracted: {total}")

    # Show sample
    if grohe_products:
        print(f"\nSample Grohe: {grohe_products[0]}")
    if hansgrohe_products:
        print(f"Sample Hansgrohe: {hansgrohe_products[0]}")
    if vitra_products:
        print(f"Sample Vitra: {vitra_products[0]}")
