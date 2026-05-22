# Changelog

## [0.1.0] - 2026-05-22

### Features
- Live DB APIs: CRM contacts CRUD, dashboard stats (KPIs, revenue, pipeline, activity)
- POS series filtering wired to real DB; removed all mock data arrays
- Quotation full-page editor with room-based structure, PDF fixes, GST% column, brand pills
- Mark-received endpoint for purchase order line items
- Settings hub with company profile and users & roles pages
- `brandLabel` field on quotations; finish/series display in print

### Fixes
- Stored XSS in quotation print (`esc()` applied to all user-supplied fields)
- Delete-before-create data loss in quotation PATCH (SKU lookup moved before `deleteMany`)
- Auth guard added to GET `/api/settings/company` (was unauthenticated)
- NaN pagination from `Number("")` → `parseInt(param, 10) || default`
- Brand-filtered total count pushed to DB level (was JS post-filter giving wrong totals)
- Non-null assertions on `rooms[idx]` index access after `Promise.all`
- 5 performance indexes on `quotation_items`, `po_line_items`, `contacts` tables

### Tests
- Bootstrap vitest + @testing-library/react test framework
- Coverage for `purchases-tracker`, `purchases-fallback`, `pos-catalog` components
- XSS regression tests for `generateQuotationPrintHTML` (10 tests)

### Chores
- Migrated gstack from vendored to team mode
- Added `.gitignore` entries for large binary asset dirs (236MB products, 42MB catalog)
- Added skill routing rules to `CLAUDE.md`
