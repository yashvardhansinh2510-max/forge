#!/usr/bin/env python3
"""
Build actionable review files from catalog QA output.

Input:
- QA JSON from qa_catalog_json.py
- Source catalog JSON (optional, recommended)

Output:
- CSV review sheet
- Markdown review summary
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from collections import Counter
from pathlib import Path
from typing import Any, Dict, List


DIMENSION_TOKEN_RE = re.compile(r"^\d{2,5}X\d{2,5}(MM|CM)?$", re.IGNORECASE)


def load_json(path: Path) -> Dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def by_sku(products: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    return {str(p.get("sku", "")).strip(): p for p in products}


def extract_tokens(message: str) -> List[str]:
    if ":" not in message:
        return []
    suffix = message.split(":", 1)[1].strip()
    if not suffix:
        return []
    return [part.strip() for part in suffix.split(",") if part.strip()]


def priority_and_action(issue: Dict[str, Any]) -> tuple[str, str]:
    code = issue.get("code", "")
    message = str(issue.get("message", ""))
    if code == "VERY_LOW_PRICE":
        return (
            "high",
            "Verify PDF value for this SKU and correct price in extracted JSON before next import.",
        )

    if code == "POSSIBLE_MERGED_ROW":
        tokens = extract_tokens(message)
        if tokens and all(DIMENSION_TOKEN_RE.match(t) for t in tokens):
            return (
                "low",
                "Likely dimension token in name; validate quickly and keep if product title is correct.",
            )
        return (
            "medium",
            "Check for merged rows in PDF text; split/clean product name if extra SKU-like token is not expected.",
        )

    if issue.get("severity") == "critical":
        return ("high", "Fix before import.")
    return ("medium", "Review and confirm.")


def build_rows(qa: Dict[str, Any], source_products: Dict[str, Dict[str, Any]]) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    for issue in qa.get("issues", []):
        sku = str(issue.get("sku", "")).strip()
        product = source_products.get(sku, {})
        priority, action = priority_and_action(issue)
        rows.append(
            {
                "priority": priority,
                "severity": issue.get("severity", ""),
                "code": issue.get("code", ""),
                "sku": sku,
                "row": issue.get("row", ""),
                "source": product.get("source", ""),
                "page": product.get("page", ""),
                "name": product.get("name", ""),
                "price": product.get("price", ""),
                "message": issue.get("message", ""),
                "suggested_action": action,
            }
        )
    # sort by priority then code then sku
    rank = {"high": 0, "medium": 1, "low": 2}
    rows.sort(key=lambda r: (rank.get(r["priority"], 9), r["code"], r["sku"]))
    return rows


def write_csv(path: Path, rows: List[Dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    headers = [
        "priority",
        "severity",
        "code",
        "sku",
        "row",
        "source",
        "page",
        "name",
        "price",
        "message",
        "suggested_action",
    ]
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        writer.writerows(rows)


def write_md(path: Path, rows: List[Dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    priorities = Counter(r["priority"] for r in rows)
    codes = Counter(r["code"] for r in rows)
    lines = [
        "# Catalog QA Review List",
        "",
        f"- Total issues: **{len(rows)}**",
        f"- High: **{priorities.get('high', 0)}**",
        f"- Medium: **{priorities.get('medium', 0)}**",
        f"- Low: **{priorities.get('low', 0)}**",
        "",
        "## By Issue Code",
    ]
    for code, count in sorted(codes.items()):
        lines.append(f"- {code}: {count}")

    lines.append("")
    lines.append("## Top Review Items")
    lines.append("")
    for row in rows[:40]:
        lines.append(
            f"- [{row['priority'].upper()}] `{row['sku']}` ({row['code']}) page {row['page']} :: {row['message']}"
        )
    path.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--qa-json", required=True, type=Path)
    parser.add_argument("--source-json", required=False, type=Path)
    parser.add_argument("--out-csv", required=True, type=Path)
    parser.add_argument("--out-md", required=True, type=Path)
    args = parser.parse_args()

    qa = load_json(args.qa_json)
    source_products = {}
    if args.source_json and args.source_json.exists():
        source = load_json(args.source_json)
        source_products = by_sku(source.get("products", []))

    rows = build_rows(qa, source_products)
    write_csv(args.out_csv, rows)
    write_md(args.out_md, rows)

    print(
        json.dumps(
            {
                "issues": len(rows),
                "out_csv": str(args.out_csv),
                "out_md": str(args.out_md),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
