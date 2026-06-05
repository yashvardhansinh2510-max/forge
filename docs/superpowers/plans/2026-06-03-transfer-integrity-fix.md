# Transfer Integrity Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the data model so customer purchase commitments (`qtyOrdered`) are immutable across transfers, while stage allocation ceilings remain correct via two new net-transfer fields.

**Architecture:** Add `qtyTransferredIn` and `qtyTransferredOut` to `POLineItem`. The effective allocation ceiling becomes `qtyOrdered + qtyTransferredIn - qtyTransferredOut`. The UNALLOCATED stage is derived from this ceiling, not directly from `qtyOrdered`. The transfer API route stops mutating `qtyOrdered` and instead increments the appropriate transfer field. A data migration restores the original `qtyOrdered` values from the `StageMovement` audit log.

**Tech Stack:** Prisma (schema + migration), PostgreSQL (Neon), Next.js API routes, TypeScript

---

## Architecture — Read This Before Implementing

### Problem Statement

`POLineItem.qtyOrdered` currently serves two conflicting purposes:

| Purpose | Behaviour | Correct? |
|---|---|---|
| Purchase commitment record | "Customer A ordered 2 units" — set at line creation, should be immutable | Must be immutable |
| Stage allocation ceiling | `UNALLOCATED = qtyOrdered − sum(stage fields)` — must reflect current entitlement | Must track net transfers |

These diverge the moment a transfer occurs. The transfer route patches both purposes simultaneously by decrementing the source `qtyOrdered` and incrementing the target `qtyOrdered`. This preserves the UNALLOCATED arithmetic but silently overwrites the original order record.

**Semantic clarification:** In Buildcon House's business, a transfer is an **allocation reassignment** — "Customer B's site is urgent; we're sending them Customer A's godown stock and will replenish Customer A later." Customer A's original commitment (2 units ordered) does not change. The system must honour this.

### The Root Force

Without the `qtyOrdered` mutation, the target line would have:

```
qtyAtGodown=3 > qtyOrdered=2   ← schema invariant violated
```

So the mutation was forced by the current invariant. The fix is to update the invariant, not to keep mutating `qtyOrdered`.

### New Data Model

```
Effective ceiling = qtyOrdered + qtyTransferredIn - qtyTransferredOut

Invariant: sum(stage fields) <= effective ceiling

UNALLOCATED = max(0, effective ceiling − sum(stage fields))
```

Two new fields on `POLineItem`:

| Field | Default | Meaning |
|---|---|---|
| `qtyTransferredIn` | 0 | Cumulative units received via inbound transfers |
| `qtyTransferredOut` | 0 | Cumulative units sent via outbound transfers |

Why two fields instead of one net field (`qtyTransferAdjust`):
- Enables per-direction reporting: "this line gave out 3 units and received 1"
- Enables future validation: `qtyTransferredIn` and `qtyTransferredOut` are both non-negative integers — a single signed field is harder to guard at the DB level
- The StageMovement log already records transfers directionally (TRANSFERRED_OUT / TRANSFERRED_IN) — the fields mirror that existing convention

### What Changes

#### Schema (`packages/db/prisma/schema.prisma`)
- Add `qtyTransferredIn Int @default(0)` to `POLineItem`
- Add `qtyTransferredOut Int @default(0)` to `POLineItem`
- Update schema comment from `sum <= qtyOrdered` to `sum <= qtyOrdered + qtyTransferredIn - qtyTransferredOut`

#### Migration (`packages/db/prisma/migrations/`)
Two-step migration:
1. Add the two columns (DDL)
2. Restore `qtyOrdered` to original values + populate new fields from `StageMovement` audit log

Restore logic (SQL):
```sql
-- Set qtyTransferredOut = sum of all outbound transfer movements for this line
UPDATE "POLineItem" p
SET "qtyTransferredOut" = COALESCE(
  (SELECT SUM(qty) FROM "StageMovement" sm
   WHERE sm."poLineItemId" = p.id AND sm."toStage" = 'TRANSFERRED_OUT'),
  0
);

-- Set qtyTransferredIn = sum of all inbound transfer movements for this line
UPDATE "POLineItem" p
SET "qtyTransferredIn" = COALESCE(
  (SELECT SUM(qty) FROM "StageMovement" sm
   WHERE sm."poLineItemId" = p.id AND sm."fromStage" = 'TRANSFERRED_IN'),
  0
);

-- Restore original qtyOrdered by reversing past corruption
-- Original = current_corrupted + transferred_out - transferred_in
UPDATE "POLineItem"
SET "qtyOrdered" = "qtyOrdered" + "qtyTransferredOut" - "qtyTransferredIn";
```

**Verification invariant to assert after migration:**
```sql
SELECT COUNT(*) FROM "POLineItem"
WHERE ("qtyPendingCo" + "qtyPendingDist" + "qtyAtGodown" +
       "qtyInBox" + "qtyDispatched" + "qtyNotDisplayed")
      > ("qtyOrdered" + "qtyTransferredIn" - "qtyTransferredOut");
-- Must return 0
```

#### Core library (`apps/web/src/lib/purchases-tracker.ts`)

The `countsFromDbLine` function must accept the new fields and use the effective ceiling:

```ts
// BEFORE
UNALLOCATED: Math.max(0, line.qtyOrdered - staged)

// AFTER
const ceiling = line.qtyOrdered + line.qtyTransferredIn - line.qtyTransferredOut
UNALLOCATED: Math.max(0, ceiling - staged)
```

The `PurchaseTrackerLine` interface gains two new optional-with-default fields.
The `buildStageTotals` function signature gains the two new fields.
A new exported helper `effectiveCeiling(line)` centralises the formula.

#### Transfer route (`apps/web/src/app/api/purchase-orders/lines/[lineId]/transfer/route.ts`)

```ts
// REMOVE from source update:
qtyOrdered: { decrement: qty },

// ADD to source update:
qtyTransferredOut: { increment: qty },

// REMOVE from target update:
qtyOrdered: { increment: qty },

// ADD to target update:
qtyTransferredIn: { increment: qty },
```

#### Server-side stage totals (`apps/web/src/lib/server/purchase-stage-totals.ts`)
- `select` must include `qtyTransferredIn` and `qtyTransferredOut`
- Pass both fields through to `buildStageTotals`

#### API routes that select POLineItem fields

Every route that selects qty fields for UNALLOCATED computation must add:
- `apps/web/src/app/api/purchase-orders/stage-totals/route.ts` — aggregate new fields
- `apps/web/src/app/api/customers/[customerId]/stage-totals/route.ts` — select + sum new fields
- `apps/web/src/app/api/customers/[customerId]/by-stage/route.ts` — select new fields; fix `totalOrdered` in summary to use effective ceiling
- `apps/web/src/app/api/purchase-orders/lines/route.ts` — include new fields in line responses
- `apps/web/src/app/api/purchase-orders/[id]/lines/route.ts` — same

#### UI (`apps/web/src/components/purchases/WorkspaceCustomers.tsx`)

The `totalOrdered` function currently returns `sum(l.qtyOrdered)`. Two choices:
- "Ordered" chip → keep showing `qtyOrdered` (original contract quantity; honest to customer)
- Progress bar denominator → use `sum(effectiveCeiling(l))` so the bar reaches 100% correctly

Both values are now available in the line object. The chip label stays "Ordered" and shows the original commitment. The progress percentage uses effective ceiling as denominator.

### Backward Compatibility

- `qtyOrdered` remains in all API responses (now restored to original values)
- `qtyTransferredIn` / `qtyTransferredOut` are additive new fields — no removal of existing fields
- No API contract changes; clients that ignore the new fields continue to work
- Excel export (`exportToXlsx`) uses `l.qtyOrdered` — after migration this shows the original order quantity, which is the correct historical value for reports

### Reporting Implications

| Report | Before fix | After fix |
|---|---|---|
| `SUM(qtyOrdered)` per customer | Understated for sources, overstated for targets | Correct original commitments |
| Global UNALLOCATED count | Arithmetically correct (because mutation made the math work) | Still correct (formula uses effective ceiling) |
| Per-line UNALLOCATED | Correct | Correct |
| "Dispatched / Ordered" % | Wrong denominator for transferred lines | Correct when using effective ceiling |
| Transfer history | StageMovement has TRANSFERRED_OUT / TRANSFERRED_IN entries | Unchanged — audit log is unaffected |

---

## File Map

| File | Action | Why |
|---|---|---|
| `packages/db/prisma/schema.prisma` | Modify | Add two new fields to POLineItem |
| `packages/db/prisma/migrations/YYYYMMDD.../migration.sql` | Create | DDL + data repair |
| `apps/web/src/lib/purchases-tracker.ts` | Modify | `countsFromDbLine`, `buildStageTotals`, `PurchaseTrackerLine`, add `effectiveCeiling` |
| `apps/web/src/lib/server/purchase-stage-totals.ts` | Modify | Select + forward new fields |
| `apps/web/src/app/api/purchase-orders/lines/[lineId]/transfer/route.ts` | Modify | Remove qtyOrdered mutations; add qtyTransferredIn/Out mutations |
| `apps/web/src/app/api/purchase-orders/stage-totals/route.ts` | Modify | Aggregate new fields in UNALLOCATED calc |
| `apps/web/src/app/api/customers/[customerId]/stage-totals/route.ts` | Modify | Select + sum new fields |
| `apps/web/src/app/api/customers/[customerId]/by-stage/route.ts` | Modify | Select new fields; fix summary totalOrdered |
| `apps/web/src/app/api/purchase-orders/lines/route.ts` | Modify | Include new fields in responses |
| `apps/web/src/app/api/purchase-orders/[id]/lines/route.ts` | Modify | Include new fields in responses |
| `apps/web/src/components/purchases/WorkspaceCustomers.tsx` | Modify | Progress bar uses effective ceiling; chip shows original qtyOrdered |

---

## Task 1: Schema — Add Transfer Fields

**Files:**
- Modify: `packages/db/prisma/schema.prisma`

- [ ] **Step 1: Add fields to POLineItem in schema**

In `schema.prisma`, find the `POLineItem` model. Replace the stage-tracking comment and the `qtyOrdered` / stage fields block:

```prisma
  qtyOrdered        Int
  qtyReceived       Int            @default(0)
  // Stage-by-stage quantity tracking
  // Invariant: sum(stage fields) <= qtyOrdered + qtyTransferredIn - qtyTransferredOut
  qtyPendingCo      Int            @default(0)
  qtyPendingDist    Int            @default(0)
  qtyAtGodown       Int            @default(0)
  qtyInBox          Int            @default(0)
  qtyDispatched     Int            @default(0)
  qtyNotDisplayed   Int            @default(0)
  // Transfer adjustment fields — qtyOrdered is NEVER mutated by transfers
  qtyTransferredIn  Int            @default(0)
  qtyTransferredOut Int            @default(0)
```

- [ ] **Step 2: Generate migration with data repair SQL**

```bash
cd packages/db
npx prisma migrate dev --name add_transfer_fields --create-only
```

This creates the migration SQL file. Do NOT run `migrate dev` fully yet — you will edit the SQL in the next step.

- [ ] **Step 3: Edit the generated migration SQL to include data repair**

Open the generated file at `packages/db/prisma/migrations/YYYYMMDD_HHMMSS_add_transfer_fields/migration.sql`.

Append after the `ALTER TABLE` statements:

```sql
-- Populate qtyTransferredOut from audit: sum of TRANSFERRED_OUT movements
UPDATE "POLineItem" p
SET "qtyTransferredOut" = COALESCE(
  (SELECT SUM(qty) FROM "StageMovement" sm
   WHERE sm."poLineItemId" = p.id AND sm."toStage" = 'TRANSFERRED_OUT'),
  0
);

-- Populate qtyTransferredIn from audit: sum of TRANSFERRED_IN movements
UPDATE "POLineItem" p
SET "qtyTransferredIn" = COALESCE(
  (SELECT SUM(qty) FROM "StageMovement" sm
   WHERE sm."poLineItemId" = p.id AND sm."fromStage" = 'TRANSFERRED_IN'),
  0
);

-- Restore original qtyOrdered — undo the corruption from past transfers
-- Original = corrupted_current + transferred_out - transferred_in
UPDATE "POLineItem"
SET "qtyOrdered" = "qtyOrdered" + "qtyTransferredOut" - "qtyTransferredIn";
```

- [ ] **Step 4: Run the migration**

```bash
cd packages/db
npx prisma migrate dev
```

Expected: migration applied, Prisma client regenerated.

- [ ] **Step 5: Verify migration integrity on Neon**

Run this assertion query against the database (via `npx prisma studio` or Neon console):

```sql
-- Assert: no line violates the new invariant
SELECT id, qtyOrdered, qtyTransferredIn, qtyTransferredOut,
       qtyPendingCo + qtyPendingDist + qtyAtGodown + qtyInBox + qtyDispatched + qtyNotDisplayed AS staged_sum,
       qtyOrdered + qtyTransferredIn - qtyTransferredOut AS ceiling
FROM "POLineItem"
WHERE (qtyPendingCo + qtyPendingDist + qtyAtGodown + qtyInBox + qtyDispatched + qtyNotDisplayed)
      > (qtyOrdered + qtyTransferredIn - qtyTransferredOut);
-- Expected: 0 rows
```

- [ ] **Step 6: Commit**

```bash
git add packages/db/prisma/schema.prisma packages/db/prisma/migrations/
git commit -m "feat: add qtyTransferredIn/Out to POLineItem; restore qtyOrdered from audit"
```

---

## Task 2: Core Library — Update `purchases-tracker.ts`

**Files:**
- Modify: `apps/web/src/lib/purchases-tracker.ts`

- [ ] **Step 1: Add `effectiveCeiling` helper and update `PurchaseTrackerLine`**

In `purchases-tracker.ts`, add the helper function immediately before `countsFromDbLine`:

```ts
export function effectiveCeiling(line: {
  qtyOrdered: number
  qtyTransferredIn?: number
  qtyTransferredOut?: number
}): number {
  return line.qtyOrdered + (line.qtyTransferredIn ?? 0) - (line.qtyTransferredOut ?? 0)
}
```

Update the `countsFromDbLine` function signature and body:

```ts
export function countsFromDbLine(line: {
  qtyOrdered: number
  qtyTransferredIn?: number
  qtyTransferredOut?: number
  qtyPendingCo: number
  qtyPendingDist: number
  qtyAtGodown: number
  qtyInBox: number
  qtyDispatched: number
  qtyNotDisplayed: number
}): HeaderCounts {
  const staged =
    line.qtyPendingCo +
    line.qtyPendingDist +
    line.qtyAtGodown +
    line.qtyInBox +
    line.qtyDispatched +
    line.qtyNotDisplayed

  return {
    UNALLOCATED: Math.max(0, effectiveCeiling(line) - staged),
    PENDING_CO: line.qtyPendingCo,
    PENDING_DIST: line.qtyPendingDist,
    GODOWN: line.qtyAtGodown,
    IN_BOX: line.qtyInBox,
    DISPATCHED: line.qtyDispatched,
    NOT_DISPLAYED: line.qtyNotDisplayed,
  }
}
```

- [ ] **Step 2: Update `buildStageTotals` signature**

```ts
export function buildStageTotals(lines: Array<{
  qtyOrdered: number
  qtyTransferredIn?: number
  qtyTransferredOut?: number
  qtyPendingCo: number
  qtyPendingDist: number
  qtyAtGodown: number
  qtyInBox: number
  qtyDispatched: number
  qtyNotDisplayed: number
}>): HeaderCounts {
  return lines.reduce((acc, line) => {
    const next = countsFromDbLine(line)
    return {
      UNALLOCATED: acc.UNALLOCATED + next.UNALLOCATED,
      PENDING_CO: acc.PENDING_CO + next.PENDING_CO,
      PENDING_DIST: acc.PENDING_DIST + next.PENDING_DIST,
      GODOWN: acc.GODOWN + next.GODOWN,
      IN_BOX: acc.IN_BOX + next.IN_BOX,
      DISPATCHED: acc.DISPATCHED + next.DISPATCHED,
      NOT_DISPLAYED: acc.NOT_DISPLAYED + next.NOT_DISPLAYED,
    }
  }, createEmptyHeaderCounts())
}
```

- [ ] **Step 3: Update `computeStageTotalsResult` to accept net transfer fields**

```ts
export interface StageSums {
  ordered: number
  transferredIn?: number
  transferredOut?: number
  pendingCo: number
  pendingDist: number
  godown: number
  inBox: number
  dispatched: number
  notDisplayed: number
}

export function computeStageTotalsResult(sums: StageSums) {
  const ceiling = sums.ordered + (sums.transferredIn ?? 0) - (sums.transferredOut ?? 0)
  const staged =
    sums.pendingCo + sums.pendingDist + sums.godown +
    sums.inBox + sums.dispatched + sums.notDisplayed
  return {
    unallocated: Math.max(0, ceiling - staged),
    pendingCo: sums.pendingCo,
    pendingDist: sums.pendingDist,
    godown: sums.godown,
    inBox: sums.inBox,
    dispatched: sums.dispatched,
    notDisplayed: sums.notDisplayed,
  }
}
```

- [ ] **Step 4: Add `qtyTransferredIn` / `qtyTransferredOut` to `PurchaseTrackerLine`**

In the `PurchaseTrackerLine` interface, add after `qtyOrdered`:

```ts
qtyOrdered: number
qtyTransferredIn: number
qtyTransferredOut: number
qtyReceived: number
```

- [ ] **Step 5: Type-check**

```bash
cd apps/web
pnpm type-check 2>&1 | head -60
```

Expected: errors will exist (callers not yet updated). Note them — they guide the next tasks.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/purchases-tracker.ts
git commit -m "feat: update purchases-tracker to use effectiveCeiling for UNALLOCATED"
```

---

## Task 3: Server-Side Stage Totals

**Files:**
- Modify: `apps/web/src/lib/server/purchase-stage-totals.ts`

- [ ] **Step 1: Add new fields to select and forward them**

Replace the entire file content:

```ts
import { prisma } from '@forge/db'
import { buildStageTotals, getBrandsForTab, type BrandTab, type HeaderCounts } from '@/lib/purchases-tracker'

export async function getStageTotalsForScope(scope: BrandTab): Promise<HeaderCounts> {
  const brands = getBrandsForTab(scope)
  const lines = await prisma.pOLineItem.findMany({
    where: brands
      ? { product: { brand: { in: brands as never[] } } }
      : undefined,
    select: {
      qtyOrdered: true,
      qtyTransferredIn: true,
      qtyTransferredOut: true,
      qtyPendingCo: true,
      qtyPendingDist: true,
      qtyAtGodown: true,
      qtyInBox: true,
      qtyDispatched: true,
      qtyNotDisplayed: true,
    },
  })

  return buildStageTotals(lines)
}
```

- [ ] **Step 2: Type-check**

```bash
cd apps/web
pnpm type-check 2>&1 | grep purchase-stage-totals
```

Expected: no errors for this file.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/server/purchase-stage-totals.ts
git commit -m "feat: include qtyTransferredIn/Out in getStageTotalsForScope"
```

---

## Task 4: Transfer API Route — Remove `qtyOrdered` Mutation

**Files:**
- Modify: `apps/web/src/app/api/purchase-orders/lines/[lineId]/transfer/route.ts`

- [ ] **Step 1: Update the Prisma transaction**

In the `prisma.$transaction([...])` block, replace the two `pOLineItem.update` calls:

```ts
await prisma.$transaction([
  prisma.pOLineItem.update({
    where: { id: lineId },
    data: {
      qtyTransferredOut: { increment: qty },
      [field]: { decrement: qty },
    },
  }),
  prisma.pOLineItem.update({
    where: { id: targetLineId },
    data: {
      qtyTransferredIn: { increment: qty },
      [field]: { increment: qty },
    },
  }),
  prisma.stageMovement.create({
    data: {
      poLineItemId: lineId,
      fromStage: stage,
      toStage: 'TRANSFERRED_OUT',
      qty,
      movedById: user.id,
      note: auditNote,
    },
  }),
  prisma.stageMovement.create({
    data: {
      poLineItemId: targetLineId,
      fromStage: 'TRANSFERRED_IN',
      toStage: stage,
      qty,
      movedById: user.id,
      note: auditNote,
    },
  }),
])
```

Note: `qtyOrdered` no longer appears in either update.

- [ ] **Step 2: Verify the invariant check still works**

The `availableQty` check (`qty > availableQty`) uses `getQtyAtStage` which reads the stage field — not `qtyOrdered`. This is already correct and needs no change.

- [ ] **Step 3: Type-check**

```bash
cd apps/web
pnpm type-check 2>&1 | grep transfer
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/api/purchase-orders/lines/[lineId]/transfer/route.ts
git commit -m "fix: transfer no longer mutates qtyOrdered — use qtyTransferredIn/Out instead"
```

---

## Task 5: Global Stage-Totals Route

**Files:**
- Modify: `apps/web/src/app/api/purchase-orders/stage-totals/route.ts`

- [ ] **Step 1: Aggregate new fields**

Replace the `prisma.pOLineItem.aggregate` call and `computeStageTotalsResult` call:

```ts
const totals = await prisma.pOLineItem.aggregate({
  _sum: {
    qtyOrdered: true,
    qtyTransferredIn: true,
    qtyTransferredOut: true,
    qtyPendingCo: true,
    qtyPendingDist: true,
    qtyAtGodown: true,
    qtyInBox: true,
    qtyDispatched: true,
    qtyNotDisplayed: true,
  },
  where: Object.keys(where).length > 0 ? where : undefined,
})

const result = computeStageTotalsResult({
  ordered: totals._sum.qtyOrdered ?? 0,
  transferredIn: totals._sum.qtyTransferredIn ?? 0,
  transferredOut: totals._sum.qtyTransferredOut ?? 0,
  pendingCo: totals._sum.qtyPendingCo ?? 0,
  pendingDist: totals._sum.qtyPendingDist ?? 0,
  godown: totals._sum.qtyAtGodown ?? 0,
  inBox: totals._sum.qtyInBox ?? 0,
  dispatched: totals._sum.qtyDispatched ?? 0,
  notDisplayed: totals._sum.qtyNotDisplayed ?? 0,
})
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/api/purchase-orders/stage-totals/route.ts
git commit -m "feat: include transfer adjustments in global stage-totals UNALLOCATED calc"
```

---

## Task 6: Customer Stage-Totals Route

**Files:**
- Modify: `apps/web/src/app/api/customers/[customerId]/stage-totals/route.ts`

- [ ] **Step 1: Add new fields to select and sum**

```ts
const items = await prisma.pOLineItem.findMany({
  where: { po: { projectId: customerId } },
  select: {
    qtyOrdered: true,
    qtyTransferredIn: true,
    qtyTransferredOut: true,
    qtyPendingCo: true,
    qtyPendingDist: true,
    qtyAtGodown: true,
    qtyInBox: true,
    qtyDispatched: true,
    qtyNotDisplayed: true,
  },
})

const sum = (field: keyof (typeof items)[0]) =>
  items.reduce((acc, i) => acc + (i[field] as number), 0)

return NextResponse.json(computeStageTotalsResult({
  ordered: sum('qtyOrdered'),
  transferredIn: sum('qtyTransferredIn'),
  transferredOut: sum('qtyTransferredOut'),
  pendingCo: sum('qtyPendingCo'),
  pendingDist: sum('qtyPendingDist'),
  godown: sum('qtyAtGodown'),
  inBox: sum('qtyInBox'),
  dispatched: sum('qtyDispatched'),
  notDisplayed: sum('qtyNotDisplayed'),
}))
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/api/customers/[customerId]/stage-totals/route.ts
git commit -m "feat: customer stage-totals uses effective ceiling for UNALLOCATED"
```

---

## Task 7: Customer By-Stage Route

**Files:**
- Modify: `apps/web/src/app/api/customers/[customerId]/by-stage/route.ts`

- [ ] **Step 1: Add new fields to both selects**

In the first query (`lines`), the `include` block returns full line objects — Prisma will include the new fields automatically.

In the second query (`allLines`), update the `select`:

```ts
select: {
  qtyOrdered:       true,
  qtyTransferredIn:  true,
  qtyTransferredOut: true,
  qtyPendingCo:     true,
  qtyPendingDist:   true,
  qtyAtGodown:      true,
  qtyInBox:         true,
  qtyDispatched:    true,
  qtyNotDisplayed:  true,
},
```

- [ ] **Step 2: Fix the summary `totalOrdered` to use effective ceiling**

Replace the summary reduce:

```ts
const summary = allLines.reduce(
  (acc, l) => {
    const ceiling = l.qtyOrdered + l.qtyTransferredIn - l.qtyTransferredOut
    acc.totalOrdered    += ceiling          // effective ceiling, not raw qtyOrdered
    acc.originalOrdered += l.qtyOrdered     // original commitment, for reference
    acc.pendingFromCo   += l.qtyPendingCo
    acc.pendingFromDist += l.qtyPendingDist
    acc.atGodown        += l.qtyAtGodown
    acc.inBox           += l.qtyInBox
    acc.dispatched      += l.qtyDispatched
    acc.notDisplayed    += l.qtyNotDisplayed
    return acc
  },
  {
    totalOrdered: 0, originalOrdered: 0,
    pendingFromCo: 0, pendingFromDist: 0,
    atGodown: 0, inBox: 0, dispatched: 0, notDisplayed: 0,
  },
)
```

The `originalOrdered` field is additive and backward-compatible — callers that don't use it are unaffected.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/api/customers/[customerId]/by-stage/route.ts
git commit -m "feat: by-stage summary uses effective ceiling; adds originalOrdered field"
```

---

## Task 8: Purchase Order Lines Routes

**Files:**
- Modify: `apps/web/src/app/api/purchase-orders/lines/route.ts`
- Modify: `apps/web/src/app/api/purchase-orders/[id]/lines/route.ts`

- [ ] **Step 1: Check what each route selects / includes**

```bash
grep -n "qtyOrdered\|select\|include" apps/web/src/app/api/purchase-orders/lines/route.ts | head -30
grep -n "qtyOrdered\|select\|include" apps/web/src/app/api/purchase-orders/[id]/lines/route.ts | head -30
```

- [ ] **Step 2: Add new fields to any explicit `select` blocks**

For every `select` block that includes `qtyOrdered`, add:
```ts
qtyTransferredIn: true,
qtyTransferredOut: true,
```

For routes using `include` (full model fetch), no change needed — Prisma automatically includes new fields.

- [ ] **Step 3: In any place that calls `countsFromDbLine` or `buildStageTotals`, ensure new fields are passed**

If the line object comes from a `findMany` with explicit `select`, you must add the new fields to that select. If it comes from a full model fetch (`include`), the fields are present automatically.

- [ ] **Step 4: Type-check**

```bash
cd apps/web
pnpm type-check 2>&1 | grep "purchase-orders"
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/api/purchase-orders/lines/route.ts apps/web/src/app/api/purchase-orders/[id]/lines/route.ts
git commit -m "feat: purchase-orders line routes include transfer adjustment fields"
```

---

## Task 9: UI — WorkspaceCustomers Progress Bar

**Files:**
- Modify: `apps/web/src/components/purchases/WorkspaceCustomers.tsx`

- [ ] **Step 1: Import `effectiveCeiling` from purchases-tracker**

Add `effectiveCeiling` to the import:

```ts
import {
  STAGE_ORDER,
  effectiveCeiling,
  getBrandSectionKey,
  matchesBrandTab,
  normalizeBrandTab,
  type BrandTab,
  type HeaderCounts,
  type PurchaseStage,
  type PurchaseTrackerLine,
} from '@/lib/purchases-tracker'
```

- [ ] **Step 2: Update the progress bar denominator**

The `totalOrdered` function is used in two ways:
1. "Dispatched/Total" chip label — should show original `qtyOrdered` (customer's actual commitment)
2. Progress bar % — should use effective ceiling (so it reaches 100% when all allocated units are dispatched)

Add a second helper:

```ts
function totalEffective(lines: PurchaseTrackerLine[]) {
  return lines.reduce((s, l) => s + effectiveCeiling(l), 0)
}
```

- [ ] **Step 3: Update the progress bar computation**

Find the progress bar percent calculation in the customer list render:

```ts
// BEFORE
const pct = total > 0 ? Math.round((dispatched / total) * 100) : 0
```

Replace `total` with `totalEffective(c.lines)`:

```ts
const effective = totalEffective(c.lines)
const pct = effective > 0 ? Math.round((dispatched / effective) * 100) : 0
```

Keep `total` (from `totalOrdered`) for the chip label: `{dispatched}/{total} dispatched` — this shows the original ordered quantity in the human-readable chip, preserving the customer's contractual record.

- [ ] **Step 4: Type-check**

```bash
cd apps/web
pnpm type-check 2>&1 | grep WorkspaceCustomers
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/purchases/WorkspaceCustomers.tsx
git commit -m "feat: progress bar uses effective ceiling; Ordered chip shows original qtyOrdered"
```

---

## Task 10: Final Type-Check and Verification

- [ ] **Step 1: Full type-check**

```bash
cd apps/web
pnpm type-check 2>&1 | grep -v "^$" | head -50
```

Expected: 0 errors.

- [ ] **Step 2: Run any existing tests**

```bash
pnpm test 2>&1 | tail -20
```

Expected: all pass.

- [ ] **Step 3: Verify DB invariant holds (post-migration)**

Using `npx prisma studio` or the Neon console:

```sql
-- Zero rows = invariant holds for all lines
SELECT COUNT(*) AS violations FROM "POLineItem"
WHERE (qtyPendingCo + qtyPendingDist + qtyAtGodown + qtyInBox + qtyDispatched + qtyNotDisplayed)
      > (qtyOrdered + qtyTransferredIn - qtyTransferredOut);
```

Expected: 0

```sql
-- Zero-sum check: for each product, net transfers cancel out
SELECT "productId",
       SUM("qtyTransferredOut") AS total_out,
       SUM("qtyTransferredIn") AS total_in
FROM "POLineItem"
GROUP BY "productId"
HAVING SUM("qtyTransferredOut") != SUM("qtyTransferredIn");
```

Expected: 0 rows (every transfer is symmetric — out from source must equal in to target)

- [ ] **Step 4: Manual transfer smoke test**

1. In the purchases workspace, find a product with two customer allocations.
2. Execute a transfer of 1 unit from Customer A to Customer B at any stage.
3. Verify in DB:
   - `qtyOrdered` for both lines is **unchanged** from before the transfer
   - Source `qtyTransferredOut` incremented by 1
   - Target `qtyTransferredIn` incremented by 1
   - Source stage field decremented by 1
   - Target stage field incremented by 1
4. Verify in UI: UNALLOCATED counts are consistent with effective ceiling.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: verify transfer integrity — all invariants hold post-fix"
```

---

## Self-Review Against Requirements

| Requirement | Task | Status |
|---|---|---|
| Original customer order quantities immutable | Tasks 1, 4 | ✓ Migration restores; route no longer mutates |
| Transfer history fully auditable | No change needed | ✓ StageMovement audit log is unaffected |
| Stage totals remain valid | Tasks 3, 5, 6 | ✓ buildStageTotals passes new fields through |
| UNALLOCATED calculations correct | Task 2 | ✓ `countsFromDbLine` uses `effectiveCeiling` |
| Customer commitments accurate | Tasks 6, 7, 9 | ✓ `qtyOrdered` restored to original commitment |
| Historical reporting accurate | Task 1 (migration), Task 9 | ✓ `qtyOrdered` = original after migration |
| No breaking API contract changes | All tasks | ✓ Only additive new fields; `qtyOrdered` restored not removed |
