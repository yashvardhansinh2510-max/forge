#!/usr/bin/env python3
"""Extract product catalog data from pricing PDFs."""

import sys
import re

try:
    import pdfplumber
except ImportError:
    print("Installing pdfplumber...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pdfplumber", "-q"])
    import pdfplumber

def extract_grohe_pricing():
    """Extract from Grohe Pricing -10th July.pdf"""
    pdf_path = "/Users/yashvardhansinhjhala/forge/Grohe Pricing -10th July.pdf"
    products = []

    try:
        with pdfplumber.open(pdf_path) as pdf:
            print(f"Grohe PDF has {len(pdf.pages)} pages")

            for page_num, page in enumerate(pdf.pages[:5]):  # First 5 pages
                text = page.extract_text()
                print(f"\n=== Grohe Page {page_num + 1} ===")
                print(text[:1000] if text else "No text")

    except Exception as e:
        print(f"Error reading Grohe PDF: {e}")

def extract_hansgrohe_pricing():
    """Extract from HANSGROHE MRP 2027-28.pdf"""
    pdf_path = "/Users/yashvardhansinhjhala/forge/HANSGROHE MRP 2027-28.pdf"
    products = []

    try:
        with pdfplumber.open(pdf_path) as pdf:
            print(f"Hansgrohe PDF has {len(pdf.pages)} pages")

            for page_num, page in enumerate(pdf.pages[:5]):  # First 5 pages
                text = page.extract_text()
                print(f"\n=== Hansgrohe Page {page_num + 1} ===")
                print(text[:1000] if text else "No text")

    except Exception as e:
        print(f"Error reading Hansgrohe PDF: {e}")

def extract_vitra_pricing():
    """Extract from vitra Price Table 2026.pdf"""
    pdf_path = "/Users/yashvardhansinhjhala/forge/vitra Price Table 2026.pdf"
    products = []

    try:
        with pdfplumber.open(pdf_path) as pdf:
            print(f"Vitra PDF has {len(pdf.pages)} pages")

            for page_num, page in enumerate(pdf.pages[:5]):  # First 5 pages
                text = page.extract_text()
                print(f"\n=== Vitra Page {page_num + 1} ===")
                print(text[:1000] if text else "No text")

    except Exception as e:
        print(f"Error reading Vitra PDF: {e}")

if __name__ == "__main__":
    print("Extracting pricing data from PDFs...\n")
    extract_grohe_pricing()
    print("\n" + "="*60)
    extract_hansgrohe_pricing()
    print("\n" + "="*60)
    extract_vitra_pricing()
