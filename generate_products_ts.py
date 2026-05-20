#!/usr/bin/env python3
"""Generate TypeScript products array from extracted catalog."""

import json
import sys

# Read the extracted catalog
with open('/tmp/product_catalog.json', 'r') as f:
    catalog = json.load(f)

# Start building TypeScript
ts_code = """// Generated from pricing PDFs - Hansgrohe, Vitra products
export interface Product {
  id: string
  sku: string
  productName: string
  brand: 'GROHE' | 'HANSGROHE' | 'VITRA' | 'AXOR'
  category: string
  unitPrice: number
  gstRate: number
}

export const products: Product[] = [
"""

product_id = 1

# Add Hansgrohe products
hansgrohe = catalog.get('hansgrohe', [])
for i, p in enumerate(hansgrohe[:100]):  # First 100 Hansgrohe
    # Clean product name
    name = p['name'].replace('\n', ' ').replace('"', '\\"').strip()[:100]

    ts_code += f"""  {{ id: 'hg{product_id:03d}', sku: '{p['article']}', productName: '{name}',
    brand: 'HANSGROHE', category: 'Showers & Accessories', unitPrice: {p['mrp']}, gstRate: 18 }},
"""
    product_id += 1

# Add Vitra products
vitra = catalog.get('vitra', [])
for i, p in enumerate(vitra[:50]):  # First 50 Vitra
    name = p['name'].replace('"', '\\"').strip()[:100]

    ts_code += f"""  {{ id: 'vtr{i+1:03d}', sku: '{p['article']}', productName: '{name}',
    brand: 'VITRA', category: 'Toilets & Sanitary', unitPrice: {p['mrp']}, gstRate: 18 }},
"""

ts_code += """]
"""

# Write to file
output_path = '/tmp/products_generated.ts'
with open(output_path, 'w') as f:
    f.write(ts_code)

print(f"Generated {product_id + len(vitra)} products")
print(f"Saved to {output_path}")
print(f"\nFirst 500 chars:")
print(ts_code[:500])
