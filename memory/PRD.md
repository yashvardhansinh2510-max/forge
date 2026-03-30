# PRD: Forge — Purchase Tracker

## Product Overview
Forge is a SaaS Operating System for **Buildcon House** (premium bath fixtures dealer).
The **Purchase Tracker** is a core module for tracking procurement pipeline of PO line items through 7 stages.

## 7-Stage Pipeline
```
ORDERED → PENDING_CO → PENDING_DIST → AT_GODOWN → IN_BOX → DISPATCHED → NOT_DISPLAYED
```

## Architecture
- **Frontend**: Next.js 15 App Router (monorepo at `/app/apps/web/`)
- **State**: SWR for API data (stat cards, customer counts) + Zustand for UI state and drill-down panels
- **Database**: PostgreSQL via Prisma ORM (`/app/packages/db/`)
- **API Routes**: Next.js API routes at `/app/apps/web/src/app/api/`

## What's Been Implemented

### Steps 1-7 (Previous Sessions)
- Base Purchase Tracker UI, sidebar, brand tabs, company/customer views
- Zustand procurement store with mock data
- PO line items table, stage pipeline dots
- Move stage modal with legal transitions

### Steps 8-12 (Previous Fork)
- KPI stat cards with percentage indicators (Step 8)
- Excel export via ExcelJS (Step 8)
- Per-stage qty split in CodeTableRow + pipeline dots (Step 9)
- Customer panel with 7 stat boxes and stage filter (Step 10)
- Reactive cascade — Zustand updates on mutations (Step 11)
- Color system updates (#FAFAF8 background, #FFFFFF cards) (Step 12)

### Emergency Fix Session (Current - March 30, 2026)
- **Installed PostgreSQL** and seeded DB with mock procurement data
- **FIX 1**: API Route `/api/purchase-orders/lines/[id]/move-stage` — now connects to real PostgreSQL DB via Prisma (was crashing due to missing DB)
- **FIX 2**: Created `/api/purchase-orders/stage-totals` — aggregated stage qty totals from DB
- **FIX 3**: Created `/api/customers/[customerId]/stage-totals` — customer-scoped stage totals from DB
- **FIX 4**: Wired `PartialMoveModal` to call API first, then optimistic Zustand update (was Zustand-only)
- **FIX 5**: Wired `TrackerKPIStrip` to use SWR from `/api/purchase-orders/stage-totals` (was Zustand-only)
- **FIX 6**: Wired `CustomerDetailPanel` to use SWR from `/api/customers/[customerId]/stage-totals` (was Zustand-only)
- **FIX 7**: Added `LEGAL_TRANSITIONS` enforcement to Move button (hidden when no legal moves)
- **FIX 8**: Fixed React hooks order violation in `CustomerDetailPanel` (found by testing agent)
- **Backend proxy**: Created FastAPI proxy on port 8001 → port 3000 for Kubernetes ingress compatibility
- **SWR helpers**: Created `/app/apps/web/src/lib/swr-helpers.ts` with typed hooks and revalidation

## Key API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| PATCH | `/api/purchase-orders/lines/[id]/move-stage` | Move qty between stages |
| GET | `/api/purchase-orders/stage-totals` | Aggregated stage totals |
| GET | `/api/customers/[customerId]/stage-totals` | Customer-scoped stage totals |

## Key Files
- `/app/apps/web/src/components/procurement/TrackerKPIStrip.tsx` — KPI stat cards (SWR)
- `/app/apps/web/src/components/procurement/PartialMoveModal.tsx` — Move stage modal (API + Zustand)
- `/app/apps/web/src/components/procurement/CustomerView/CustomerDetailPanel.tsx` — Customer panel (SWR)
- `/app/apps/web/src/components/procurement/CompanyView/CodeTableRow.tsx` — Product rows + Move button
- `/app/apps/web/src/lib/swr-helpers.ts` — SWR hooks and revalidation
- `/app/apps/web/src/lib/procurement-store.ts` — Zustand store (mock data for drill-downs)
- `/app/packages/db/prisma/schema.prisma` — Prisma schema
- `/app/packages/db/prisma/seed.ts` — DB seed script

## What's Still Mocked
- **CompanyView table rows** — reads from Zustand mock data (`procurement-store`)
- **StatDrillDownPanel detail items** — reads from Zustand mock data
- The stat card COUNTS and customer panel COUNTS are now from real DB via SWR

## Upcoming Tasks (P1)
- Hydrate CompanyView table rows from real Prisma API (replace Zustand mock data)
- Add "Mark Received" workflow (update qtyReceived + auto-promote to AT_GODOWN)
- Pipeline dots per OrderRow in Customer View

## Future Tasks (P2)
- Auth guard for move-stage API
- StageMovement audit trail UI
- Push notifications for IN_BOX stage
- Overdue indicator for stalled inventory
- PDF export for customer summaries
- Connect full procurement store to Prisma (replace all mock data)

## Database
- PostgreSQL at `postgresql://postgres:postgres@localhost:5432/forge`
- Seed: `cd /app/packages/db && npx tsx prisma/seed.ts`
- 8 Purchase Orders, 11 Line Items, 7 Projects, 11 Products

## Testing
- Test report: `/app/test_reports/iteration_1.json`
- Backend: 12/12 tests passed (100%)
- Frontend: 95% (minor hydration warning for initial SWR load)
