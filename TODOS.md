# TODOS

## Database / Migrations

### Add missing SQL migrations for schema drift
**Priority:** P1
**Deferred from:** feat/pos-series-db (v0.1.1)

`QuotationItem.productId` changed to nullable in `schema.prisma` but no SQL migration was generated. Live DB column is still `NOT NULL` — inserts of custom items (`isCustom=true`, `productId=null`) will fail with a DB constraint violation.

Action: run `prisma migrate dev` and commit the generated migration.

### Drop orphaned POLineItem columns
**Priority:** P1
**Deferred from:** feat/pos-series-db (v0.1.1)

`qtyPendingDist` and `qtyNotDisplayed` removed from `POLineItem` in Prisma schema but no `DROP COLUMN` SQL exists. Future `prisma migrate deploy` will generate a destructive migration unexpectedly.

Action: generate and review the drop migration explicitly before deploying.

### Add CONCURRENTLY to perf indexes
**Priority:** P2
**Deferred from:** feat/pos-series-db (v0.1.1)

`20260522000000_add_perf_indexes/migration.sql` creates 6 indexes without `CONCURRENTLY`. On tables with existing rows this takes `AccessExclusiveLock` blocking reads and writes for the duration.

Action: rewrite migration to use `CREATE INDEX CONCURRENTLY IF NOT EXISTS` and run each statement outside a transaction block.

---

## API / Security

### Add in-handler auth to mutation routes
**Priority:** P1
**Deferred from:** feat/pos-series-db (v0.1.1)

The following routes rely solely on Clerk middleware for auth — no in-handler `auth()` check:
- `POST /api/purchase-orders/lines/[lineId]/mark-received`
- `PATCH /api/purchase-orders/lines/[lineId]/move-stage`
- `GET /api/crm/contacts/[id]`
- `GET /api/dashboard/stats`
- `GET /api/customers/[customerId]/by-stage` and `/stage-totals`

If the middleware is misconfigured or `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is absent, these are fully public.

### Fix TOCTOU races in mark-received and move-stage
**Priority:** P1
**Deferred from:** feat/pos-series-db (v0.1.1)

Both endpoints follow read-validate-write without a transaction or `SELECT FOR UPDATE`. Concurrent requests for the same `lineId` can double-increment stage counts above `qtyOrdered`.

Action: wrap in `prisma.$transaction([], { isolationLevel: 'Serializable' })`.

### Fix Vercel filesystem write in company settings PATCH
**Priority:** P1
**Deferred from:** feat/pos-series-db (v0.1.1)

`/api/settings/company` PATCH writes to `src/lib/company-settings.json` via `fs.writeFile`. Vercel filesystem is read-only — this will throw `EROFS` in production and return 500 silently.

Action: move company settings to a DB table (`CompanySettings` model) and persist via Prisma.

### Fix quotation number generation race
**Priority:** P2
**Deferred from:** feat/pos-series-db (v0.1.1)

`POST /api/quotations` computes number as `count() + 1` outside a transaction. Concurrent requests generate the same number → one succeeds, one fails with a P2002 unique constraint 500.

Action: use a DB sequence or a retry loop with `P2002` detection.

---

## Performance

### Replace unbounded POLineItem fetches with aggregates
**Priority:** P2
**Deferred from:** feat/pos-series-db (v0.1.1)

`mark-received` and `move-stage` fetch all `POLineItem` rows into Node.js memory to recompute stage totals after each mutation. Use `prisma.pOLineItem.aggregate({ _sum: {...} })` instead.

Same pattern in `GET /api/dashboard` (quotation pipeline value summed in app memory from nested eager-loaded revisions→rooms→items).

---

## Completed

<!-- Items completed in this PR will appear here -->
