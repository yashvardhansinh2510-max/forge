# PRD: Purchase Tracker — Final Complete Overhaul
## Project: Forge SaaS OS for Buildcon House

---

## Problem Statement
Complete overhaul of the Purchase Tracker page to implement a 7-stage pipeline procurement system with live stage tracking, partial qty moves, Excel exports, and reactive UI cascade.

---

## Architecture

### Tech Stack
- **Frontend**: Next.js 15 App Router, React, Zustand + Immer (client state), TypeScript
- **Backend**: Next.js API routes, Prisma ORM (mock data for now)
- **Data**: Mock data in `/lib/mock/procurement-data.ts`, real DB via `@forge/db`

### Key Files Modified / Created
- `packages/db/prisma/schema.prisma` — added stage qty fields + StageMovement model
- `src/lib/mock/procurement-data.ts` — 7-stage types, LEGAL_TRANSITIONS, STAGE_LABELS, STAGE_COLORS
- `src/lib/tracker-utils.ts` — computeKPIs, getLinesForKPIDrillDown, getCustomerStageCounts
- `src/lib/procurement-store.ts` — moveStage action (Zustand+Immer)
- `src/lib/usePurchasesStore.ts` — moveStageModal, openKPICard state
- `src/lib/excelExporter.ts` — exportStageLines, exportTrackerLines, exportCustomerLines
- `src/components/procurement/TrackerKPIStrip.tsx` — redesigned 7 KPI cards
- `src/components/procurement/StatDrillDownPanel.tsx` — drill-down + Excel export
- `src/components/procurement/CompanyView/CodeTableRow.tsx` — per-stage columns + pipeline dots + Move button
- `src/components/procurement/CompanyView/CodeTable.tsx` — updated 7-stage headers
- `src/components/procurement/CompanyView/CompanyView.tsx` — wired Export button
- `src/components/procurement/CustomerView/CustomerDetailPanel.tsx` — 7 stage stat boxes + Excel
- `src/components/procurement/PartialMoveModal.tsx` — qty selector + legal stage transitions
- `src/app/api/purchase-orders/lines/[lineId]/move-stage/route.ts` — server-side move validation
- `src/app/api/purchase-orders/by-stage/route.ts` — stage drill-down API
- `src/app/api/customers/[customerId]/by-stage/route.ts` — customer stage filter API

---

## Core Requirements (Static)

### 7-Stage Pipeline
```
Total Ordered → Pending Co. → Pending Dist. → At Godown → In Box → Dispatched → Not Displayed
```

### Stage Colors
| Stage | Color |
|-------|-------|
| Pend. from Co. | #F5A623 amber |
| Pend. from Dist. | #E8762C orange |
| At Godown | #4A90D9 blue |
| In Box | #7B68EE purple |
| Dispatched | #27AE60 green |
| Not Displayed | #95A5A6 grey |

### Brand Groups (post Step 3)
- ALL | GROHE | HANSGROHE+AXOR | VITRA | GEBERIT
- KAJARIA: removed entirely

### Legal Transitions (enforced client + server)
- ORDERED → PENDING_CO | PENDING_DIST
- PENDING_CO → PENDING_DIST | AT_GODOWN
- PENDING_DIST → AT_GODOWN
- AT_GODOWN → IN_BOX
- IN_BOX → DISPATCHED
- DISPATCHED → NOT_DISPLAYED
- NOT_DISPLAYED → terminal

---

## What's Been Implemented

### Session 1–3 (Previous sessions)
- [x] Step 1: File audit
- [x] Step 2: Prisma schema — 6 new stage qty fields + StageMovement model; prisma generate run
- [x] Step 3: Remove Kajaria everywhere; merge Axor under Hansgrohe tab
- [x] Step 4: Remove "Needs PO" from all surfaces
- [x] Step 5: API routes — move-stage, by-stage, customers/[id]/by-stage
- [x] Step 6: excelExporter.ts — exportStageLines, exportTrackerLines, exportCustomerLines
- [x] Step 7: PartialMoveModal — qty selector, FROM/TO stage pills, legal transitions enforced

### Session 4 (2026-03-31)
- [x] Step 8: Stat cards redesign — colored top accent bar, progress bars, pct of total, OPEN badge
- [x] Step 8: Drill-down panel — Export Excel button wired to exportStageLines
- [x] Step 9: CodeTableRow — 7-stage columns (PEND. CO / PEND. DIST / GODOWN / IN BOX / DISPATCHED), pipeline dot strip under SKU, Move Stage button
- [x] Step 9: CodeTable headers — updated to match 7-stage columns
- [x] Step 10: CustomerDetailPanel — 7 stage stat boxes with click-to-filter, Export button, stage filter indicator
- [x] Step 11: Reactive cascade — Zustand+Immer ensures moveStage updates propagate to all KPI cards, row columns, pipeline dots instantly
- [x] Step 12: UI pass — #FAFAF8 warm background, #FFFFFF cards, colored accent borders

---

## Prioritized Backlog

### P0 (Must have — not yet done)
- Connect to real Prisma DB (schema migrated, routes written, mock data in place)
- Auth guard for move-stage API

### P1 (High value)
- Partial move history / audit trail (StageMovement table exists in schema)
- "Mark Received" button — update qtyReceived and promote to AT_GODOWN
- Customer panel: show pipeline dots per OrderRow (currently shows BoxAllocationStatus only)

### P2 (Nice to have)
- Push notifications when qty moves to IN_BOX for customer's project
- Overdue indicator if stock has been at a stage > N days
- PDF export for customer summaries

---

## Next Tasks
1. Wire up real DB — run `prisma migrate dev` in production environment
2. Add `moveStage` API call from PartialMoveModal (currently optimistic Zustand only)
3. OrderRow in Customer View: update to show per-stage pipeline dots instead of old BoxAllocationStatus funnel
4. "Mark Received" workflow — update qtyReceived + stage promotion
