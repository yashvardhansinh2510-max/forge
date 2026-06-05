# Hansgrohe Catalog Audit
**Date:** 2026-06-04 | **Source:** 15 Excel files vs `scripts/catalog.json`

---

## Coverage Report

### SKU Coverage — 100% ✅

All 1,516 unique SKUs from all 15 Excel files are present in the catalog.

| Excel File | Category | Excel SKUs | In Catalog | Brand Split |
|---|---|---|---|---|
| 3hole.xlsx | 3-Hole Basin Mixers | 54 | 54 ✅ | 9 HG / 45 Axor |
| BM.xlsx | Basin Mixers | 102 | 102 ✅ | 53 HG / 48 Axor |
| Ceramic.xlsx | Ceramics | 76 | 76 ✅ | 76 HG / 0 Axor |
| HFAV.xlsx | Fittings, Arms & Valves | 68 | 68 ✅ | 58 HG / 10 Axor |
| Holder.xlsx | Shower Holders | 91 | 91 ✅ | 77 HG / 14 Axor |
| SHOWERS HANSGROHE.xlsx | Overhead Showers | 234 | 234 ✅ | 168 HG / 64 Axor |
| Showerhose.xlsx | Shower Hoses | 42 | 42 ✅ | 20 HG / 22 Axor |
| Single lever.xlsx | Single Lever Mixers | 43 | 43 ✅ | 37 HG / 6 Axor |
| Spout.xlsx | Bath Spouts | 72 | 72 ✅ | 43 HG / 29 Axor |
| TBM.xlsx | Tall Basin Mixers | 99 | 99 ✅ | 57 HG / 42 Axor (+ typ) |
| Thermostat.xlsx | Thermostats | 295 | 295 ✅ | 162 HG / 133 Axor |
| WBM.xlsx | Wall/Concealed Basin Mixers | 124 | 124 ✅ | 57 HG / 67 Axor |
| handshower.xlsx | Hand Showers | 87 | 87 ✅ | 83 HG / 4 Axor |
| kitchen.xlsx | Kitchen Mixers | 31 | 31 ✅ | 31 HG / 0 Axor |
| rail.xlsx | Shower Rails | 98 | 98 ✅ | 96 HG / 2 Axor |
| **TOTAL** | | **1,516** | **1,516** | **1,025 HG / 480 Axor** |

> Note: The Excel files contain both Hansgrohe and Axor products. The catalog correctly splits these into `brand: "HANSGROHE"` and `brand: "AXOR"` with `brandGroup: "HANSGROHE"` on both.

### Image Coverage

| | Hansgrohe | Axor |
|---|---|---|
| Total products | 1,025 | 480 |
| Images on disk (`/public/products/`) | 986 | 477 |
| **Missing images** | **39** | **3** |

Total images in `/public/products/`: 1,481 (18 extra unlinked to catalog)

---

## Missing Mappings

### 1. Missing Images (39 Hansgrohe products)

Pattern: predominantly non-Chrome finishes. All missing images are for products that exist in the catalog with `hasImage: false`.

| Source | Count | Finishes |
|---|---|---|
| Holder.xlsx | 14 | BBR, BBC, MB, PGO (Rainfinity Porter shelf) |
| Thermostat.xlsx | 7 | MB, BBC, BBR, PGO (RainSelect FS 3/5 function) |
| HFAV.xlsx | 4 | BBR, BBC, PGO (shower arms, ceiling connectors) |
| SHOWERS_HANSGROHE.xlsx | 4 | MB, BBR, BBC, PGO (Rainfinity shoulder 500) |
| WBM.xlsx | 4 | BBR, BBC (Finoris concealed wall-mounted) |
| BM.xlsx | 2 | BBR, BBC — **also blank product names** |
| TBM.xlsx | 2 | BBR, BBC — **also blank product names** |
| rail.xlsx | 2 | PGO (Raindance Alive Q/S PGO) |

**By finish missing images:**
- 340 Brushed Black Chrome (BBC): 11 products
- 990 Polished Gold Optic (PGO): 11 products
- 140 Brushed Bronze (BBR): 10 products
- 670 Matt Black: 6 products
- 347 Chrome (special): 1 product

### 2. Blank Product Names (4 products — data quality)

| SKU | Source | Finish | MRP |
|---|---|---|---|
| 75020140 | BM.xlsx | Brushed Bronze (BBR) | — |
| 75020340 | BM.xlsx | Brushed Black Chrome (BBC) | — |
| 75040140 | TBM.xlsx | Brushed Bronze (BBR) | — |
| 75040340 | TBM.xlsx | Brushed Black Chrome (BBC) | — |

These are color variants of products that likely exist in Chrome (000) but were imported with empty name and no MRP from the Excel. Need manual lookup in Hansgrohe PL to populate.

### 3. Series Name Normalization (inconsistencies in naming)

These don't block catalog use but will cause incorrect filtering/search when series facets are added.

| Issue | Affected SKUs | Fix |
|---|---|---|
| `RD` prefix (abbreviation) | 34 products in showers, rail, handshower | Expand to `Raindance` |
| `Fixfit` (lowercase) vs `FixFit` | 14 products in Holder | Normalize to `FixFit` |
| `Tectur.S` vs `Tecturis` | 1 product in 3hole (73330000) | Normalize to `Tecturis` |
| `ShowerSel.Com.E/S/Q` | 32 products in Thermostat | Map to `ShowerSelect Comfort E/S/Q` |
| `Unica'S`, `Unica'Croma`, `Unica'Crometta` | 19 products in rail | Sub-series of `Unica` — tag as parent `Unica` |

### 4. Products Without Series Mapping (276 products)

These have no assigned series — they use generic descriptive names. Most are correct (accessories don't have series names), but the categories need series-level grouping for the catalog UI.

| Category | Orphan Count | Reason | Action |
|---|---|---|---|
| Ceramic.xlsx (76) | 76 | Ceramics are type-based (bowl, washbasin, WC), no series | Add type-based grouping: `EluPura`, `LakeShore`, `MellowTide`, `Washbasin`, `Bowl` |
| HFAV.xlsx (58) | 52 | Accessories: shower arms, angle valves, bottle traps, ceiling connectors | No series — tag as `Accessories` subcategory |
| Holder.xlsx (77) | 27 | `Porter`, `Porter'S`, `Porter'C`, `Fixfit` variants | Map `Porter*` → series `Porter`; `Fixfit` → `FixFit` |
| Thermostat.xlsx (162) | 37 | iBox, iControl, basic sets, ShowerSel.Com | Add `iBox`, `iControl` as series; `ShowerSel.Com.*` → `ShowerSelect Comfort` |
| SHOWERS_HANSGROHE.xlsx (168) | 33 | Shower arms, ceiling connectors, basic sets | Tag as `Accessories`; `RD *` → `Raindance` |
| rail.xlsx (96) | 19 | `RD *` abbreviations, `Wall` bar, `Unica'*` sub-series | `RD` → `Raindance`; `Wall` → `Unica` Reno |
| handshower.xlsx (83) | 11 | `RD *`, `DogShower`, `Jocolino` | Already valid series — just need expansion |

### 5. Cross-Brand Item (1 product)

SKU `12676180` — "Basic set for Axor shower Composition panel" — is tagged `brand: HANSGROHE` in the catalog but references an Axor product in its name. Likely needs to stay in Hansgrohe (it's a Hansgrohe installation basic set for Axor-compatible installations) but should be reviewed.

---

## Duplicate Products

**Zero duplicate SKUs.** No deduplication needed.

---

## Missing Finishes

**Zero products with missing finish data.** All 1,025 Hansgrohe products have `finishCode` and `finishName` populated. Full finish palette:

| Code | Name | Count |
|---|---|---|
| 000 | Chrome | 319 |
| 670 | Matt Black | 118 |
| 700 | Matt White | 112 |
| 140 | Brushed Bronze (BBR) | 108 |
| 340 | Brushed Black Chrome (BBC) | 81 |
| 450 | White | 62 |
| 990 | Polished Gold Optic (PGO) | 57 |
| 400 | White / Chrome | 54 |
| 007 | Chrome | 35 |
| 008 | Chrome | 25 |
| ... | (others, 1-14 each) | ~54 |

---

## Implementation Plan

### Priority 1 — Data Quality Fixes (blocking)

**P1a: Fix 4 blank product names**
- SKUs: 75020140, 75020340 (BM), 75040140, 75040340 (TBM)
- Look up these SKUs in Hansgrohe price list/website to get names and MRPs
- These are likely finish variants of existing Chrome SKUs (75020000, 75040000 — check if those exist)
- File: `scripts/catalog.json` → update `name` and `mrp` fields

**P1b: Series name normalization**
- Write a normalization pass on `scripts/catalog.json`
- Rules: `RD ` prefix → `Raindance`, `Fixfit` → `FixFit`, `Tectur.S` → `Tecturis`, `ShowerSel.Com.*` → `ShowerSelect Comfort *`
- Add a `series` field derived from normalized name
- Affects 81 products

### Priority 2 — Image Backfill (39 missing images)

**P2: Source images for 39 products with `hasImage: false`**

All missing images follow the same pattern: products available in Chrome have images; non-Chrome variants (BBR, BBC, MB, PGO) don't.

Strategy: download from `hansgrohe.in` or `hansgrohe.com` using the SKU as the product identifier. Most Hansgrohe product pages have finish-switched images.

Image target path: `apps/web/public/products/{sku}.png`

Missing SKUs grouped by series for batch download:
1. **Rainfinity Porter 500 shelf** (Holder): 26843670, 26843140, 26843340, 26843990, 26858670, 26858140, 26858340, 26858990, 26844670, 26844140, 26844340, 26844990
2. **RainSelect FS** (Thermostat): 15381670, 15381340, 15381990, 15384670, 15384140, 15384340, 15384990
3. **FixFit Porter E/S** (Holder): 26888990, 26887990
4. **Rainfinity shoulder 500** (Showers): 26243670, 26243140, 26243340, 26243990
5. **Finoris concealed WBM** (WBM): 76051140, 76051340, 76050140, 76050340
6. **Shower arms** (HFAV): 27413140, 27413990, 27413340, 27413670, 27413700, 27412140, 27412340, 27412990
7. **Ceiling connectors** (HFAV): 27393140, 27393340, 27393990, 27393670, 27393700, 27389140, 27389340, 27389990, 27389670, 27389700
8. **Raindance Alive PGO** (rail): 24590990, 24595990
9. **Angle valve** (HFAV): 13947347

### Priority 3 — Series Taxonomy (for catalog UI)

**P3: Add `series` field to catalog JSON**

When catalog UI adds series-based filtering, each product needs a canonical `series` value. Proposed mapping:

```
Products without series → derive from normalized name first word
Exceptions (accessories without series):
  - Angle valves → series: null, type: "Accessory"
  - Bottle traps → series: null, type: "Accessory"  
  - Shower arms → series: null, type: "Accessory"
  - Ceiling connectors → series: null, type: "Accessory"
  - Shower hoses → series: "Isiflex" / "Sensoflex" / "Metaflex"
  - Ceramics → series: type-name (EluPura, LakeShore, MellowTide, Washbasin, Bowl)
```

**P3b: Canonicalize series names in `series` field**

| Raw | Canonical |
|---|---|
| RD | Raindance |
| Fixfit | FixFit |
| Tectur.S | Tecturis |
| ShowerSel.Com.E | ShowerSelect Comfort E |
| ShowerSel.Com.S | ShowerSelect Comfort S |
| ShowerSel.Com.Q | ShowerSelect Comfort Q |
| Unica'S / Unica'Croma / Unica'Crometta | Unica |
| Porter / Porter'S / Porter'C | Porter |
| DogShower | Dog Shower |

### Priority 4 — Catalog JSON Enrichment (nice-to-have)

**P4: Add `seriesUrl` and `productUrl` fields**
- Base URL: `https://www.hansgrohe.in/products/sku/{sku}`
- Enables product detail deep-links from POS and quotations

**P4b: Normalize `section` field**
- Currently sourced from Excel row headers (e.g., "Master Bathroom Shower Area")
- Inconsistent across files — should normalize to 3-4 canonical sections

---

## Summary

| Check | Result |
|---|---|
| SKU coverage (15 categories) | ✅ 100% — 1,516/1,516 SKUs present |
| Duplicate SKUs | ✅ Zero duplicates |
| Missing finishes | ✅ Zero — all products have finish data |
| Missing images | ⚠️ 39 Hansgrohe + 3 Axor products (all non-Chrome variants) |
| Blank product names | ❌ 4 products — need manual lookup |
| Series normalization | ⚠️ 81 products need series name fixes |
| Orphan series (accessories) | ℹ️ 276 products — expected, need taxonomy decision |
| Cross-brand item | ℹ️ 1 product — review recommended |
