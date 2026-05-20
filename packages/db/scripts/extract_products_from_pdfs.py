#!/usr/bin/env python3
"""
Extract product rows from GROHE / HANSGROHE pricing PDFs into normalized JSON.

This parser is built for large catalog imports where rows are represented as:
- article code
- product description
- MRP

It also supports optional page-level image extraction so each product can get
an immediate image URL fallback.
"""

from __future__ import annotations

import argparse
import json
import os
import re
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Iterable, List, Optional

from pypdf import PdfReader


CODE_RE = re.compile(r"^(?=.*\d)[A-Z0-9]{8,12}$")
PRICE_RE = re.compile(r"[`₹]?\s*([0-9]{1,2}(?:,[0-9]{2,3})+|[0-9]{4,})")
ROW_START_RE = re.compile(r"^\d+\s+([A-Z0-9]{8,12})\s+(.+)$")
HANS_ROW_RE = re.compile(r"(?:^|\s)(\d{1,4})\s+([A-Z0-9]{8,12})\s+(.+?)(?=(?:\s\d{1,4}\s+[A-Z0-9]{8,12}\s)|$)", re.S)


@dataclass
class ExtractedProduct:
    source: str
    page: int
    sku: str
    name: str
    price: int
    brand_hint: str
    category_hint: Optional[str]
    image_url: Optional[str]


def clean_lines(text: str) -> List[str]:
    return [ln.strip() for ln in text.splitlines() if ln and ln.strip()]


def parse_price(value: str) -> Optional[int]:
    m = PRICE_RE.search(value)
    if not m:
        return None
    raw = m.group(1).replace(",", "")
    try:
        parsed = int(raw)
        # Price sanity filter to reject OCR/merge artifacts
        if parsed < 100 or parsed > 10_000_000:
            return None
        return parsed
    except ValueError:
        return None


def looks_like_heading(line: str) -> bool:
    if len(line) < 3:
        return False
    if CODE_RE.match(line):
        return False
    if PRICE_RE.search(line):
        return False
    # Keep title-like lines as category hints
    return bool(re.match(r"^[A-Za-z&/\-\s]+$", line))


def extract_page_image(reader: PdfReader, page_index: int, output_dir: Path, prefix: str) -> Optional[str]:
    page = reader.pages[page_index]
    images = getattr(page, "images", None)
    if not images:
        return None
    first = images[0]
    ext = first.name.split(".")[-1].lower() if "." in first.name else "jpg"
    if ext not in {"jpg", "jpeg", "png", "webp"}:
        ext = "jpg"
    output_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{prefix}-p{page_index + 1:04d}.{ext}"
    target = output_dir / filename
    if not target.exists():
        target.write_bytes(first.data)
    # Public URL path for Next.js static serving
    return f"/catalog/imported/{filename}"


def extract_grohe(grohe_pdf: Path, image_dir: Optional[Path]) -> List[ExtractedProduct]:
    reader = PdfReader(str(grohe_pdf))
    rows: List[ExtractedProduct] = []

    for page_idx, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        lines = clean_lines(text)
        if not lines:
            continue

        category_hint: Optional[str] = None
        image_url = extract_page_image(reader, page_idx, image_dir, "grohe") if image_dir else None

        i = 0
        while i < len(lines):
            line = lines[i]
            if looks_like_heading(line) and line.lower() not in {"bathroom fittings", "contents"}:
                category_hint = line

            if not CODE_RE.match(line):
                i += 1
                continue

            sku = line
            j = i + 1
            name_parts: List[str] = []
            price: Optional[int] = None

            while j < len(lines):
                nxt = lines[j]

                # Stop if next product code starts and we still have no price
                if CODE_RE.match(nxt) and name_parts:
                    break

                # Price line found
                maybe_price = parse_price(nxt)
                if maybe_price is not None:
                    price = maybe_price
                    break

                if nxt.lower().startswith("must buy"):
                    j += 1
                    continue

                if re.match(r"^\d+$", nxt) and len(nxt) <= 3:
                    j += 1
                    continue

                name_parts.append(nxt)
                j += 1

            if price is not None:
                name = " ".join(name_parts).strip() or f"GROHE Product {sku}"
                rows.append(
                    ExtractedProduct(
                        source="grohe",
                        page=page_idx + 1,
                        sku=sku,
                        name=name,
                        price=price,
                        brand_hint="GROHE",
                        category_hint=category_hint,
                        image_url=image_url,
                    )
                )
                i = max(j + 1, i + 1)
            else:
                i += 1

    return rows


def extract_hansgrohe(hg_pdf: Path, image_dir: Optional[Path]) -> List[ExtractedProduct]:
    reader = PdfReader(str(hg_pdf))
    rows: List[ExtractedProduct] = []

    for page_idx, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        lines = clean_lines(text)
        if not lines:
            continue

        image_url = extract_page_image(reader, page_idx, image_dir, "hansgrohe") if image_dir else None

        normalized_text = " ".join(lines)
        for _, sku, chunk in HANS_ROW_RE.findall(normalized_text):
            chunk = re.sub(r"\s+", " ", chunk).strip()
            # Capture "... <price> <qty>" pattern, qty usually 1
            price_match = re.search(r"(.*?)\s([0-9]{1,2}(?:,[0-9]{2,3})+|[0-9]{4,})\s+1(?:\s|$)", chunk)
            if not price_match:
                continue
            name = price_match.group(1).strip()
            price = parse_price(price_match.group(2))
            if not name or price is None:
                continue
            if len(name) < 5:
                continue

            # Infer brand from AX/HG prefix in description
            normalized = name.upper()
            if normalized.startswith("AX ") or normalized.startswith("AXOR "):
                brand_hint = "AXOR"
            elif normalized.startswith("HG "):
                brand_hint = "HANSGROHE"
            else:
                brand_hint = "HANSGROHE"

            rows.append(
                ExtractedProduct(
                    source="hansgrohe",
                    page=page_idx + 1,
                    sku=sku,
                    name=name,
                    price=price,
                    brand_hint=brand_hint,
                    category_hint=None,
                    image_url=image_url,
                )
            )

    return rows


def dedupe(rows: Iterable[ExtractedProduct]) -> List[ExtractedProduct]:
    best = {}
    for row in rows:
        existing = best.get(row.sku)
        if existing is None:
            best[row.sku] = row
            continue
        # Prefer row that has image_url or longer name
        if (row.image_url and not existing.image_url) or len(row.name) > len(existing.name):
            best[row.sku] = row
    return list(best.values())


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--grohe-pdf", required=True, type=Path)
    parser.add_argument("--hansgrohe-pdf", required=True, type=Path)
    parser.add_argument("--out-json", required=True, type=Path)
    parser.add_argument("--extract-images", action="store_true")
    parser.add_argument(
        "--image-output-dir",
        type=Path,
        default=Path("apps/web/public/catalog/imported"),
    )
    args = parser.parse_args()

    image_dir = args.image_output_dir if args.extract_images else None
    grohe = extract_grohe(args.grohe_pdf, image_dir)
    hans = extract_hansgrohe(args.hansgrohe_pdf, image_dir)
    merged = dedupe([*grohe, *hans])
    merged.sort(key=lambda r: (r.brand_hint, r.sku))

    args.out_json.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "meta": {
            "grohe_pdf": str(args.grohe_pdf),
            "hansgrohe_pdf": str(args.hansgrohe_pdf),
            "total_rows": len(merged),
            "extract_images": bool(args.extract_images),
        },
        "products": [asdict(r) for r in merged],
    }
    args.out_json.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    print(f"Extracted {len(merged)} products")
    print(f"Output: {args.out_json}")
    if args.extract_images:
        print(f"Images dir: {args.image_output_dir}")


if __name__ == "__main__":
    main()
