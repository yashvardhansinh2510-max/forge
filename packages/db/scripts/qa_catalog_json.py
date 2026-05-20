#!/usr/bin/env python3
"""
Strict QA checks for extracted product catalog JSON.

Validates:
- SKU format and duplicates
- Name quality
- Price sanity
- Possible row-merge artifacts
"""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from pathlib import Path
from typing import Any, Dict, List

SKU_RE = re.compile(r"^(?=.*\d)[A-Z0-9]{8,12}$")
EMBEDDED_SKU_RE = re.compile(r"\b(?=[A-Z0-9]{8,12}\b)(?=[A-Z0-9]*\d)[A-Z0-9]+\b")


def load_products(path: Path) -> List[Dict[str, Any]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    products = payload.get("products")
    if not isinstance(products, list):
        raise ValueError("Input JSON must contain a 'products' array")
    return products


def check(products: List[Dict[str, Any]]) -> Dict[str, Any]:
    issues: List[Dict[str, Any]] = []
    skus = [str(p.get("sku", "")).strip().upper() for p in products]
    sku_counter = Counter(skus)

    for idx, p in enumerate(products, start=1):
        sku = str(p.get("sku", "")).strip().upper()
        name = str(p.get("name", "")).strip()
        price = p.get("price")

        if not SKU_RE.match(sku):
            issues.append({
                "severity": "critical",
                "code": "INVALID_SKU",
                "row": idx,
                "sku": sku,
                "message": "SKU does not match [A-Z0-9]{8,12}",
            })

        if sku_counter.get(sku, 0) > 1:
            issues.append({
                "severity": "critical",
                "code": "DUPLICATE_SKU",
                "row": idx,
                "sku": sku,
                "message": f"SKU appears {sku_counter[sku]} times",
            })

        if not name or len(name) < 8:
            issues.append({
                "severity": "critical",
                "code": "BAD_NAME",
                "row": idx,
                "sku": sku,
                "message": "Product name too short/empty",
            })
        else:
            embedded = [m.group(0) for m in EMBEDDED_SKU_RE.finditer(name.upper())]
            embedded = [token for token in embedded if token != sku]
            if embedded:
                issues.append({
                    "severity": "warning",
                    "code": "POSSIBLE_MERGED_ROW",
                    "row": idx,
                    "sku": sku,
                    "message": f"Name contains additional SKU-like token(s): {', '.join(embedded[:3])}",
                })

        if not isinstance(price, int):
            issues.append({
                "severity": "critical",
                "code": "PRICE_NOT_INT",
                "row": idx,
                "sku": sku,
                "message": "Price must be an integer",
            })
            continue

        if price < 100 or price > 10_000_000:
            issues.append({
                "severity": "critical",
                "code": "PRICE_OUT_OF_RANGE",
                "row": idx,
                "sku": sku,
                "message": f"Price {price} outside allowed range",
            })
        elif price < 1000:
            issues.append({
                "severity": "warning",
                "code": "VERY_LOW_PRICE",
                "row": idx,
                "sku": sku,
                "message": f"Price {price} looks unusually low",
            })

    critical_count = sum(1 for i in issues if i["severity"] == "critical")
    warning_count = sum(1 for i in issues if i["severity"] == "warning")
    return {
        "summary": {
            "total_products": len(products),
            "critical_issues": critical_count,
            "warning_issues": warning_count,
            "total_issues": len(issues),
        },
        "issues": issues,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-json", required=True, type=Path)
    parser.add_argument("--out-json", type=Path)
    parser.add_argument("--max-print", type=int, default=20)
    parser.add_argument("--no-fail", action="store_true")
    args = parser.parse_args()

    products = load_products(args.input_json)
    report = check(products)

    if args.out_json:
        args.out_json.parent.mkdir(parents=True, exist_ok=True)
        args.out_json.write_text(json.dumps(report, indent=2), encoding="utf-8")

    summary = report["summary"]
    print(json.dumps(summary, indent=2))

    if report["issues"]:
        print("\nTop issues:")
        for issue in report["issues"][: args.max_print]:
            print(f"- [{issue['severity']}] {issue['code']} sku={issue['sku']} row={issue['row']} :: {issue['message']}")

    if summary["critical_issues"] > 0 and not args.no_fail:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
