# Purchases V6 — Visual Clarity Sprint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Purchases stock view so a warehouse worker understands inventory in under 5 seconds — real product images, visual stage pipeline with counts, location from movement history, last-activity timestamps, filtered CSV export.

**Architecture:** The existing SWR → Next.js API route → Prisma (or mock fallback) pipeline is preserved. We add `location String?` to `StageMovement` in the Prisma schema, derive `currentLocation` and `lastActivityAt` server-side, surface them on `PurchaseTrackerLine`, then build new UI components. All location data flows through API routes — zero localStorage, no new state managers.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS v4, React 18, SWR, Prisma, Zod

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `packages/db/prisma/schema.prisma` | Modify | Add `location String?` to `StageMovement` |
| `apps/web/src/lib/purchases-tracker.ts` | Modify | Add `currentLocation`, `lastActivityAt` to `PurchaseTrackerLine`; add `location` to `Movement`; add `formatRelativeTime` helper |
| `apps/web/src/lib/mock/procurement-data.ts` | Modify | Add `currentLocation`, `lastActivityAt` to `MockPOLineItem`; populate mock values |
| `apps/web/src/lib/purchases-fallback.ts` | Modify | Map new fields; accept `location` in mock move-stage |
| `apps/web/src/lib/purchases-export.ts` | Create | `exportToCSV(lines, filename?)` — client-side CSV blob download |
| `apps/web/src/app/api/purchase-orders/lines/route.ts` | Modify | Fetch latest movement per line; surface `currentLocation` + `lastActivityAt` |
| `apps/web/src/app/api/purchase-orders/lines/[lineId]/move-stage/route.ts` | Modify | Accept `location?: string` in body; persist to `StageMovement` |
| `apps/web/src/app/api/purchase-orders/lines/[lineId]/history/route.ts` | Modify | Return `location` on each movement |
| `apps/web/src/components/purchases/StageTracker.tsx` | Create | 5-segment visual pipeline with per-stage counts + color rules |
| `apps/web/src/components/purchases/WorkspaceTrackStock.tsx` | Modify | Full redesign — visual smart rows, section grouping, export button |
| `apps/web/src/components/purchases/WorkspaceDispatch.tsx` | Modify | Add 48px thumbnail to every ready + blocked row |
| `apps/web/src/components/purchases/WorkspaceCustomers.tsx` | Modify | Add 48px thumbnail to every line row in `CustomerDetail` |
| `apps/web/src/components/purchases/ContextPanel.tsx` | Modify | Send `location` as separate field (not embedded in `note`) |

---

## Task 1: Add `location` to Prisma `StageMovement` + migrate

**Files:**
- Modify: `packages/db/prisma/schema.prisma:462-473`

- [ ] **Step 1: Add `location` field to schema**

In `packages/db/prisma/schema.prisma`, find the `StageMovement` model and add `location` after `note`:

```prisma
model StageMovement {
  id           String     @id @default(cuid())
  poLineItemId String
  poLineItem   POLineItem @relation(fields: [poLineItemId], references: [id])
  fromStage    String
  toStage      String
  qty          Int
  movedById    String
  movedBy      User       @relation("StageMovements", fields: [movedById], references: [id])
  note         String?
  location     String?
  movedAt      DateTime   @default(now())
}
```

- [ ] **Step 2: Run migration**

```bash
pnpm --filter @forge/db prisma migrate dev --name add-location-to-stage-movement
```

Expected output: `Your database is now in sync with your schema.`

- [ ] **Step 3: Verify migration file created**

```bash
ls packages/db/prisma/migrations/ | tail -3
```

Expected: a new folder ending in `add_location_to_stage_movement`.

- [ ] **Step 4: Commit**

```bash
git add packages/db/prisma/schema.prisma packages/db/prisma/migrations/
git commit -m "feat(db): add location field to StageMovement"
```

---

## Task 2: Extend `PurchaseTrackerLine` and `Movement` types

**Files:**
- Modify: `apps/web/src/lib/purchases-tracker.ts`

- [ ] **Step 1: Add fields to `PurchaseTrackerLine`**

In `purchases-tracker.ts`, find `export interface PurchaseTrackerLine` and add two fields after `followUpStatus`:

```typescript
export interface PurchaseTrackerLine {
  id: string
  poId: string
  poNumber: string
  vendorName: string | null
  projectId: string | null
  createdAt?: string
  customer: {
    id: string
    name: string
    siteAddress: string | null
  } | null
  product: {
    id: string
    sku: string
    name: string
    brand: string
    imageUrl: string | null
    seriesName: string | null
    finishName: string | null
    articleNumber: string | null
    mrp: number
    unit: string
    tier: string
  }
  qtyOrdered: number
  qtyTransferredIn: number
  qtyTransferredOut: number
  qtyReceived: number
  stages: HeaderCounts
  followUpStatus?: string | null
  currentLocation: string | null      // ← NEW: derived from latest StageMovement.location
  lastActivityAt: string | null       // ← NEW: ISO string of latest StageMovement.movedAt
}
```

- [ ] **Step 2: Add `location` to the `Movement` type**

In `purchases-tracker.ts`, find the `Movement` interface (used by ContextPanel) — it lives in `ContextPanel.tsx` actually, not here. Skip this for now; it will be updated in Task 9.

- [ ] **Step 3: Add `formatRelativeTime` helper**

At the bottom of `purchases-tracker.ts`, add:

```typescript
export function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  if (diffMins < 2) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHrs = Math.floor(diffMins / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  const diffDays = Math.floor(diffHrs / 24)
  return `${diffDays}d ago`
}

export function lastActivityColor(lastActivityAt: string | null): string {
  if (!lastActivityAt) return 'var(--text-muted)'
  const days = (Date.now() - new Date(lastActivityAt).getTime()) / 86_400_000
  if (days > 14) return '#ef4444'
  if (days > 7)  return '#f59e0b'
  return 'var(--text-muted)'
}
```

- [ ] **Step 4: Verify type-check passes**

```bash
pnpm type-check 2>&1 | head -30
```

Expected: errors about `currentLocation`/`lastActivityAt` missing from callers — fix these in Tasks 3–7. Note them; don't fix yet.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/purchases-tracker.ts
git commit -m "feat(types): add currentLocation, lastActivityAt, formatRelativeTime to tracker"
```

---

## Task 3: Update mock data — `MockPOLineItem`

**Files:**
- Modify: `apps/web/src/lib/mock/procurement-data.ts`

- [ ] **Step 1: Add fields to `MockPOLineItem` interface**

Find `export interface MockPOLineItem` (line ~94) and add after `customerAllocations`:

```typescript
export interface MockPOLineItem {
  id:                   string
  productId:            string
  productName:          string
  productSku:           string
  productBrand:         string
  productImage:         string
  qtyOrdered:           number
  qtyReceived:          number
  qtyPendingCo:         number
  qtyPendingDist:       number
  qtyAtGodown:          number
  qtyInBox:             number
  qtyDispatched:        number
  qtyNotDisplayed:      number
  landingCost:          number | null
  clientOfferRate:      number | null
  status:               POLineStatus
  customerAllocations:  CustomerAllocation[]
  currentLocation:      string | null    // ← NEW
  lastActivityAt:       string | null    // ← NEW
}
```

- [ ] **Step 2: Populate mock values on all existing line items**

For every line item object in `MOCK_PURCHASE_ORDERS`, add the two new fields. Rules:
- `qtyAtGodown > 0` → `currentLocation: 'Rack B-3'`, `lastActivityAt: new Date(Date.now() - 2 * 3600_000).toISOString()` (2h ago)
- `qtyInBox > 0` → `currentLocation: 'Box 12'`, `lastActivityAt: new Date(Date.now() - 5 * 3600_000).toISOString()` (5h ago)
- `qtyPendingDist > 0` only → `currentLocation: null`, `lastActivityAt: new Date(Date.now() - 14 * 86_400_000).toISOString()` (14d ago)
- `qtyPendingCo > 0` only → `currentLocation: null`, `lastActivityAt: new Date(Date.now() - 3 * 86_400_000).toISOString()` (3d ago)
- `qtyDispatched > 0` only → `currentLocation: null`, `lastActivityAt: new Date(Date.now() - 1 * 86_400_000).toISOString()` (1d ago)

Use `new Date(Date.now() - N).toISOString()` directly in the object literal. These are static values set at module load time — that's fine for mock data.

- [ ] **Step 3: Run type-check to confirm no regressions**

```bash
pnpm type-check 2>&1 | grep "procurement-data" | head -10
```

Expected: no errors from this file.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/mock/procurement-data.ts
git commit -m "feat(mock): add currentLocation and lastActivityAt to MockPOLineItem"
```

---

## Task 4: Update `purchases-fallback.ts`

**Files:**
- Modify: `apps/web/src/lib/purchases-fallback.ts`

- [ ] **Step 1: Map new fields in `mapMockLine`**

Find the `mapMockLine` function and add `currentLocation` and `lastActivityAt` to the returned object:

```typescript
function mapMockLine(order: MockPurchaseOrder, line: MockPOLineItem): PurchaseTrackerLine {
  return {
    id: line.id,
    poId: order.id,
    poNumber: order.poNumber,
    vendorName: order.vendorName,
    projectId: order.projectId,
    createdAt: order.createdAt,
    customer: order.projectId && order.clientName
      ? { id: order.projectId, name: order.clientName, siteAddress: null }
      : null,
    product: {
      id: line.productId,
      sku: line.productSku,
      name: line.productName,
      brand: line.productBrand,
      imageUrl: line.productImage || null,
      seriesName: null,
      finishName: null,
      articleNumber: null,
      mrp: 0,
      unit: 'pcs',
      tier: 'premium',
    },
    qtyOrdered: line.qtyOrdered,
    qtyTransferredIn: 0,
    qtyTransferredOut: 0,
    qtyReceived: line.qtyReceived,
    stages: countsFromDbLine({
      qtyOrdered: line.qtyOrdered,
      qtyPendingCo: line.qtyPendingCo,
      qtyPendingDist: line.qtyPendingDist,
      qtyAtGodown: line.qtyAtGodown,
      qtyInBox: line.qtyInBox,
      qtyDispatched: line.qtyDispatched,
      qtyNotDisplayed: line.qtyNotDisplayed,
    }),
    followUpStatus: null,
    currentLocation: line.currentLocation,   // ← NEW
    lastActivityAt: line.lastActivityAt,      // ← NEW
  }
}
```

- [ ] **Step 2: Accept `location` in `moveFallbackStage`**

Find the `moveFallbackStage` export (or the function that handles mock move-stage). Add `location?: string` parameter and update `currentLocation` on the mock line when moving to GODOWN or IN_BOX:

```typescript
export function moveFallbackStage(
  lineId: string,
  fromStage: PurchaseStage,
  toStage: PurchaseStage,
  qty: number,
  note?: string,
  location?: string,           // ← NEW param
): { stageTotals: HeaderCounts } | { message: string } {
  const found = getMutableLine(lineId)
  if (!found) return { message: `Line ${lineId} not found` }
  const { line } = found

  // ... existing stage qty mutation logic stays unchanged ...

  // After mutation: update location if provided
  if (location && (toStage === 'GODOWN' || toStage === 'IN_BOX')) {
    line.currentLocation = location
  }
  // Update lastActivityAt
  line.lastActivityAt = new Date().toISOString()

  return { stageTotals: computeStageTotalsForBrand('ALL') }
}
```

> **Note:** If `moveFallbackStage` doesn't exist yet as a named export, locate the equivalent inline function in the fallback's PATCH handler and apply the same changes there.

- [ ] **Step 3: Verify type-check**

```bash
pnpm type-check 2>&1 | grep "purchases-fallback" | head -10
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/purchases-fallback.ts
git commit -m "feat(mock): surface currentLocation + lastActivityAt in fallback mapper"
```

---

## Task 5: Update lines API route

**Files:**
- Modify: `apps/web/src/app/api/purchase-orders/lines/route.ts`

- [ ] **Step 1: Update the `stageMovements` select to fetch location + movedAt**

Find the `stageMovements` include inside `prisma.pOLineItem.findMany`. Replace it:

```typescript
stageMovements: {
  orderBy: { movedAt: 'desc' as const },
  take: 5,                              // enough to find latest with non-null location
  select: { location: true, movedAt: true },
},
```

Remove the old `where: { toStage: { in: ['GODOWN', 'IN_BOX'] }, note: { not: null } }` filter — we now query the latest 5 movements unrestricted so we can derive both `currentLocation` and `lastActivityAt`.

- [ ] **Step 2: Update `mapLine` function signature and body**

Update the `stageMovements` type in the inline parameter type of `mapLine`:

```typescript
stageMovements: Array<{ location: string | null; movedAt: Date }>
```

Then replace `locationNote: line.stageMovements[0]?.note ?? null` with:

```typescript
const movements = line.stageMovements
const lastActivityAt = movements[0]?.movedAt?.toISOString() ?? null
const currentLocation = movements.find((m) => m.location !== null)?.location ?? null
```

And update the returned object:

```typescript
return {
  // ... all existing fields ...
  currentLocation,      // ← replaces locationNote
  lastActivityAt,       // ← NEW
  followUpStatus: line.followUpStatus,
}
```

Remove the old `locationNote` property from the return object entirely.

- [ ] **Step 3: Run type-check**

```bash
pnpm type-check 2>&1 | grep "lines/route" | head -10
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/api/purchase-orders/lines/route.ts
git commit -m "feat(api): surface currentLocation and lastActivityAt on purchase lines"
```

---

## Task 6: Update move-stage API route

**Files:**
- Modify: `apps/web/src/app/api/purchase-orders/lines/[lineId]/move-stage/route.ts`

- [ ] **Step 1: Add `location` to Zod schema**

Find `const MoveStageSchema = z.object({...})` and add:

```typescript
const MoveStageSchema = z.object({
  fromStage: z.enum(FROM_STAGES),
  toStage: z.enum(TO_STAGES),
  qty: z.number().int().min(1),
  customerId: z.string().optional(),
  note: z.string().max(500).optional(),
  location: z.string().max(200).optional(),   // ← NEW
  brand: z.enum(BRAND_TABS).optional(),
})
```

- [ ] **Step 2: Destructure `location` from body**

Find `const { fromStage, toStage, qty, customerId, note } = body` and add `location`:

```typescript
const { fromStage, toStage, qty, customerId, note, location } = body
```

- [ ] **Step 3: Persist `location` in `stageMovement.create`**

Find `prisma.stageMovement.create` and add the `location` field:

```typescript
prisma.stageMovement.create({
  data: {
    poLineItemId: lineId,
    fromStage,
    toStage,
    qty,
    movedById: user.id,
    note: customerId
      ? `${note ? `${note} | ` : ''}customer:${customerId}`
      : note ?? null,
    location: location ?? null,   // ← NEW
  },
}),
```

- [ ] **Step 4: Run type-check**

```bash
pnpm type-check 2>&1 | grep "move-stage" | head -10
```

Expected: no errors. (Prisma client regenerates automatically after schema migration; if it doesn't, run `pnpm --filter @forge/db prisma generate`.)

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/api/purchase-orders/lines/\[lineId\]/move-stage/route.ts
git commit -m "feat(api): accept and persist location on StageMovement"
```

---

## Task 7: Update history API route

**Files:**
- Modify: `apps/web/src/app/api/purchase-orders/lines/[lineId]/history/route.ts`

- [ ] **Step 1: Add `location` to the select**

Find `prisma.stageMovement.findMany` and add `location: true` to the select (or add a `select` block if currently using `include` only):

```typescript
const movements = await prisma.stageMovement.findMany({
  where: { poLineItemId: lineId },
  select: {
    id: true,
    fromStage: true,
    toStage: true,
    qty: true,
    note: true,
    location: true,          // ← NEW
    movedAt: true,
    movedBy: {
      select: { id: true, name: true, email: true },
    },
  },
  orderBy: { movedAt: 'desc' },
  take: 30,
})
```

> **Note:** The existing route uses `include: { movedBy: ... }` not a full `select`. Switch to `select` to add `location`, or just add a separate `select` alongside include — Prisma allows `include` plus top-level scalar fields implicitly.  
> Simplest fix: change `include` to `select` with all needed fields listed explicitly, as shown above.

- [ ] **Step 2: Update `Movement` type in `ContextPanel.tsx`**

In `apps/web/src/components/purchases/ContextPanel.tsx`, find the `Movement` interface (line ~32) and add `location`:

```typescript
interface Movement {
  id: string
  fromStage: string
  toStage: string
  qty: number
  note: string | null
  location: string | null    // ← NEW
  movedAt: string
  movedBy: { name: string; email: string }
}
```

- [ ] **Step 3: Display `location` in the history list**

In `ContextPanel.tsx`, find where each movement is rendered in `HistorySection`. After the existing note line, add:

```tsx
{m.location && (
  <p className="mt-0.5 text-[11px] text-[#0369a1]">
    📦 {m.location}
  </p>
)}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/api/purchase-orders/lines/\[lineId\]/history/route.ts \
        apps/web/src/components/purchases/ContextPanel.tsx
git commit -m "feat(api): return location on each StageMovement in history"
```

---

## Task 8: Update `ContextPanel.tsx` — send `location` as dedicated field

**Files:**
- Modify: `apps/web/src/components/purchases/ContextPanel.tsx`

- [ ] **Step 1: Update `doMove` to send `location` separately**

Find the `doMove` function in `MoveSection`. Replace the current `note` construction and `fetch` body:

```typescript
async function doMove() {
  if (!fromStage || !toStage) return
  setSaving(true)
  setErr('')
  try {
    const res = await fetch(
      `/api/purchase-orders/lines/${encodeURIComponent(line.id)}/move-stage`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromStage,
          toStage,
          qty,
          brand: activeBrand,
          note: undefined,                                       // keep for future use
          location: locationNote.trim() || undefined,            // ← dedicated field
        }),
      },
    )
    const data = await res.json() as { stageTotals?: HeaderCounts; message?: string; error?: string }
    if (!res.ok || !data.stageTotals) {
      setErr(data.message ?? data.error ?? 'Move failed')
      return
    }
    onMoved(data.stageTotals, line.id, fromStage, toStage, qty)
    setQty(1)
    setLocationNote('')
    setErr('')
  } catch {
    setErr('Network error')
  } finally {
    setSaving(false)
  }
}
```

The location label can stay as-is (`locationNote` state variable name is fine internally).

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/purchases/ContextPanel.tsx
git commit -m "feat(ui): send location as dedicated field in ContextPanel move form"
```

---

## Task 9: Create `StageTracker.tsx`

**Files:**
- Create: `apps/web/src/components/purchases/StageTracker.tsx`

- [ ] **Step 1: Write the component**

```typescript
'use client'

import { getLineUrgency, type PurchaseTrackerLine } from '@/lib/purchases-tracker'

const TRACKER_STAGES = ['PENDING_CO', 'PENDING_DIST', 'GODOWN', 'IN_BOX', 'DISPATCHED'] as const
type TrackerStage = typeof TRACKER_STAGES[number]

const TRACKER_LABEL: Record<TrackerStage, string> = {
  PENDING_CO:  'Ordered',
  PENDING_DIST: 'Dist.',
  GODOWN:      'Godown',
  IN_BOX:      'Packed',
  DISPATCHED:  'Done',
}

function stageColor(
  stage: TrackerStage,
  qty: number,
  line: PurchaseTrackerLine,
): string {
  if (qty === 0) return '#e5e7eb'                     // grey — nothing here
  if (stage === 'DISPATCHED') return '#10b981'        // green — done
  if (stage === 'IN_BOX') return '#10b981'            // green — ready
  const urgency = getLineUrgency(line)
  if (urgency === 'critical') return '#ef4444'        // red — overdue
  if (urgency === 'warning')  return '#f59e0b'        // amber — late
  return '#2563eb'                                    // blue — active
}

function stageGlow(stage: TrackerStage, qty: number, line: PurchaseTrackerLine): string | undefined {
  if (qty === 0) return undefined
  const color = stageColor(stage, qty, line)
  // Lighten the color for box-shadow
  const glowMap: Record<string, string> = {
    '#10b981': '#bbf7d0',
    '#ef4444': '#fecaca',
    '#f59e0b': '#fde68a',
    '#2563eb': '#bfdbfe',
  }
  const glow = glowMap[color]
  return glow ? `0 0 0 3px ${glow}` : undefined
}

interface Props {
  line: PurchaseTrackerLine
}

export default function StageTracker({ line }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      {/* Dot + line row */}
      <div className="flex items-center">
        {TRACKER_STAGES.map((stage, i) => {
          const qty = stage === 'DISPATCHED'
            ? line.stages.DISPATCHED + line.stages.NOT_DISPLAYED
            : line.stages[stage as keyof typeof line.stages] ?? 0
          const color = stageColor(stage, qty, line)
          const glow = stageGlow(stage, qty, line)
          const isLast = i === TRACKER_STAGES.length - 1
          return (
            <div key={stage} className="flex items-center" style={{ flex: isLast ? '0 0 auto' : 1 }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: color,
                  flexShrink: 0,
                  boxShadow: glow,
                  transition: 'background 0.2s, box-shadow 0.2s',
                }}
              />
              {!isLast && (
                <div
                  style={{
                    flex: 1,
                    height: 2,
                    background: qty > 0 ? color : '#e5e7eb',
                    minWidth: 8,
                    transition: 'background 0.2s',
                  }}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Label + count row */}
      <div className="flex items-start">
        {TRACKER_STAGES.map((stage, i) => {
          const qty = stage === 'DISPATCHED'
            ? line.stages.DISPATCHED + line.stages.NOT_DISPLAYED
            : line.stages[stage as keyof typeof line.stages] ?? 0
          const color = stageColor(stage, qty, line)
          const isLast = i === TRACKER_STAGES.length - 1
          return (
            <div
              key={stage}
              style={{
                flex: isLast ? '0 0 auto' : 1,
                minWidth: isLast ? undefined : 0,
                paddingRight: isLast ? 0 : 4,
              }}
            >
              <div style={{ fontSize: 9, fontWeight: 700, color: qty > 0 ? color : '#9ca3af', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {TRACKER_LABEL[stage]}
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: 'var(--font-ui)',
                  fontVariantNumeric: 'tabular-nums',
                  color: qty > 0 ? color : '#d1d5db',
                }}
              >
                {qty}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run type-check**

```bash
pnpm type-check 2>&1 | grep "StageTracker" | head -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/purchases/StageTracker.tsx
git commit -m "feat(ui): StageTracker — 5-segment pipeline with counts + urgency colors"
```

---

## Task 10: Create `purchases-export.ts`

**Files:**
- Create: `apps/web/src/lib/purchases-export.ts`

- [ ] **Step 1: Write the export utility**

```typescript
import {
  formatRelativeTime,
  getLineDispatchStatuses,
  getLinePrimaryStatus,
  DISPATCH_STATUS_LABEL,
  type PurchaseTrackerLine,
} from '@/lib/purchases-tracker'

function escapeCell(value: string | number | null | undefined): string {
  const str = String(value ?? '')
  return `"${str.replace(/"/g, '""')}"`
}

export function exportToCSV(lines: PurchaseTrackerLine[], filename = 'stock-export.csv'): void {
  const headers = [
    'Product', 'SKU', 'Finish', 'Brand',
    'Customer', 'Project',
    'Stage', 'Qty Ordered', 'Qty at Stage',
    'Location', 'Last Activity', 'Age (days)',
  ]

  const rows = lines.map((l) => {
    const primary = getLinePrimaryStatus(l)
    const primaryQty = getLineDispatchStatuses(l).find((s) => s.status === primary)?.qty ?? 0
    const ageDays = l.createdAt
      ? Math.floor((Date.now() - new Date(l.createdAt).getTime()) / 86_400_000)
      : ''
    const lastActivity = l.lastActivityAt
      ? formatRelativeTime(new Date(l.lastActivityAt))
      : ''

    return [
      l.product.name,
      l.product.sku,
      l.product.finishName ?? '',
      l.product.brand,
      l.customer?.name ?? '',
      l.customer?.siteAddress ?? '',
      DISPATCH_STATUS_LABEL[primary],
      l.qtyOrdered,
      primaryQty,
      l.currentLocation ?? '',
      lastActivity,
      ageDays,
    ]
  })

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => escapeCell(cell)).join(','))
    .join('\n')

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
```

> The `﻿` BOM ensures Excel opens the CSV with correct UTF-8 encoding (important for ₹ and Indian brand names).

- [ ] **Step 2: Run type-check**

```bash
pnpm type-check 2>&1 | grep "purchases-export" | head -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/purchases-export.ts
git commit -m "feat(lib): add exportToCSV utility for filtered stock export"
```

---

## Task 11: Redesign `WorkspaceTrackStock.tsx`

**Files:**
- Modify: `apps/web/src/components/purchases/WorkspaceTrackStock.tsx`

This is a full rewrite. Replace the entire file content.

- [ ] **Step 1: Write the new component**

```typescript
'use client'

import Image from 'next/image'
import { useState } from 'react'
import {
  formatRelativeTime,
  getLineDispatchStatuses,
  getLinePrimaryStatus,
  lastActivityColor,
  type BrandTab,
  type HeaderCounts,
  type PurchaseStage,
  type PurchaseTrackerLine,
} from '@/lib/purchases-tracker'
import { exportToCSV } from '@/lib/purchases-export'
import StageTracker from '@/components/purchases/StageTracker'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  lines: PurchaseTrackerLine[]
  allLines: PurchaseTrackerLine[]
  activeBrand: BrandTab
  isLoading: boolean
  onMoved: (newCounts: HeaderCounts, lineId: string, fromStage: PurchaseStage, toStage: PurchaseStage, qty: number) => void
  onSelectLine: (lineId: string, tab?: 'move' | 'transfer' | 'history') => void
  onMoveMaterial?: (productId: string, sourceLineId: string) => void
}

// ─── Grid layout ──────────────────────────────────────────────────────────────
// Columns: thumb | product+finish | customer+project | stage-tracker | qty | location+activity | action
const GRID = 'grid grid-cols-[72px_minmax(0,1fr)_160px_220px_56px_140px_136px]'

// ─── Product thumbnail ─────────────────────────────────────────────────────────

function ProductThumb({ line, size = 64 }: { line: PurchaseTrackerLine; size?: number }) {
  if (line.product.imageUrl) {
    return (
      <div style={{ width: size, height: size, position: 'relative', flexShrink: 0 }}>
        <Image
          src={line.product.imageUrl}
          alt={line.product.name}
          fill
          className="rounded-xl border border-[var(--border)] object-contain p-1"
          unoptimized
        />
      </div>
    )
  }
  return (
    <div
      className="flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--n-50)]"
      style={{ width: size, height: size, flexShrink: 0, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}
    >
      {line.product.brand.slice(0, 3).toUpperCase()}
    </div>
  )
}

// ─── Finish pill ──────────────────────────────────────────────────────────────

function FinishPill({ finishName }: { finishName: string }) {
  // Map common finish names to approximate hex colors
  const color =
    /chrome|chromé/i.test(finishName) ? '#c0c0c0' :
    /brushed nickel|nickel brossé/i.test(finishName) ? '#a8a8a8' :
    /graphite|graph/i.test(finishName) ? '#3d3d3d' :
    /gold|or\b/i.test(finishName) ? '#c5a028' :
    /white|blanc/i.test(finishName) ? '#f5f5f4' :
    /black|noir/i.test(finishName) ? '#1c1c1c' :
    /steel|inox/i.test(finishName) ? '#b0b8c1' :
    '#9ca3af'

  return (
    <span className="mt-1 inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--n-50)] px-1.5 py-0.5">
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, border: '1px solid rgba(0,0,0,0.12)', flexShrink: 0 }} />
      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)' }}>{finishName}</span>
    </span>
  )
}

// ─── Mark Packed inline action ─────────────────────────────────────────────────

function MarkPackedAction({
  line,
  onMoved,
  onDone,
}: {
  line: PurchaseTrackerLine
  onMoved: Props['onMoved']
  onDone: () => void
}) {
  const [location, setLocation] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const qty = line.stages.GODOWN

  async function doPack() {
    setSaving(true)
    setErr('')
    try {
      const res = await fetch(
        `/api/purchase-orders/lines/${encodeURIComponent(line.id)}/move-stage`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fromStage: 'GODOWN',
            toStage: 'IN_BOX',
            qty,
            location: location.trim() || undefined,
          }),
        },
      )
      const data = await res.json() as { stageTotals?: HeaderCounts; message?: string }
      if (!res.ok || !data.stageTotals) { setErr(data.message ?? 'Pack failed'); return }
      onMoved(data.stageTotals, line.id, 'GODOWN', 'IN_BOX', qty)
      onDone()
    } catch {
      setErr('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <input
        type="text"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Box / shelf"
        autoFocus
        className="w-28 rounded-lg border border-[var(--border)] px-2 py-1 text-xs outline-none focus:border-[#60a5fa]"
      />
      {err && <span className="text-[11px] text-[#dc2626]">{err}</span>}
      <button
        type="button"
        onClick={() => void doPack()}
        disabled={saving}
        className="rounded-lg bg-[#2563eb] px-3 py-1 text-[11px] font-bold text-white disabled:opacity-40"
      >
        {saving ? '…' : 'Pack'}
      </button>
      <button type="button" onClick={onDone} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">×</button>
    </div>
  )
}

// ─── Next-action button ───────────────────────────────────────────────────────

function NextActionButton({
  line,
  onSelectLine,
  onMoved,
}: {
  line: PurchaseTrackerLine
  onSelectLine: Props['onSelectLine']
  onMoved: Props['onMoved']
}) {
  const [packing, setPacking] = useState(false)
  const primary = getLinePrimaryStatus(line)

  if (primary === 'ready') {
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onSelectLine(line.id, 'move') }}
        className="w-full rounded-lg bg-[#10b981] px-3 py-2 text-[11px] font-bold text-white transition hover:bg-[#059669]"
      >
        Dispatch ▷
      </button>
    )
  }

  if (primary === 'awaiting_packing') {
    if (packing) {
      return <MarkPackedAction line={line} onMoved={onMoved} onDone={() => setPacking(false)} />
    }
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setPacking(true) }}
        className="w-full rounded-lg border border-[#bfdbfe] bg-[#eff6ff] px-3 py-2 text-[11px] font-bold text-[#2563eb] transition hover:bg-[#dbeafe]"
      >
        Mark Packed →
      </button>
    )
  }

  if (primary === 'awaiting_distributor') {
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onSelectLine(line.id, 'history') }}
        className="w-full rounded-lg border border-[#fcd34d] bg-[#fffbeb] px-3 py-2 text-[11px] font-bold text-[#d97706] transition hover:bg-[#fef3c7]"
      >
        Follow Up ⚠
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onSelectLine(line.id) }}
      className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-[11px] font-medium text-[var(--text-muted)] transition hover:border-[var(--border-strong)]"
    >
      View →
    </button>
  )
}

// ─── Single stock row ──────────────────────────────────────────────────────────

function StockRow({
  line,
  onSelectLine,
  onMoved,
}: {
  line: PurchaseTrackerLine
  onSelectLine: Props['onSelectLine']
  onMoved: Props['onMoved']
}) {
  const primary = getLinePrimaryStatus(line)
  const primaryQty = getLineDispatchStatuses(line).find((s) => s.status === primary)?.qty ?? 0

  const rowBg =
    primary === 'ready'           ? 'bg-[#f0fdf4] hover:bg-[#dcfce7]' :
    primary === 'awaiting_packing' ? 'hover:bg-[var(--n-50)]' :
    'opacity-90 hover:bg-[var(--n-50)]'

  const leftBorder =
    primary === 'ready'            ? '3px solid #10b981' :
    primary === 'awaiting_packing' ? '3px solid #2563eb' :
    primary === 'awaiting_distributor' ? '3px solid #f59e0b' :
    '3px solid transparent'

  return (
    <div
      className={`${GRID} cursor-pointer items-center gap-0 border-b border-[var(--border)] px-4 py-3 transition ${rowBg}`}
      style={{ borderLeft: leftBorder }}
      onClick={() => onSelectLine(line.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelectLine(line.id)}
    >
      {/* Thumbnail */}
      <div className="pr-3">
        <ProductThumb line={line} size={60} />
      </div>

      {/* Product + finish */}
      <div className="min-w-0 pr-3">
        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{line.product.name}</p>
        <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{line.product.sku}</p>
        {line.product.finishName && <FinishPill finishName={line.product.finishName} />}
      </div>

      {/* Customer + project */}
      <div className="min-w-0 pr-3">
        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
          {line.customer?.name ?? <span className="text-[var(--text-muted)]">No customer</span>}
        </p>
        {line.customer?.siteAddress && (
          <p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">{line.customer.siteAddress}</p>
        )}
      </div>

      {/* Stage tracker */}
      <div className="pr-3">
        <StageTracker line={line} />
      </div>

      {/* Qty */}
      <div className="pr-2 text-center">
        <p
          className="text-lg font-bold text-[var(--text-primary)]"
          style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}
        >
          {primaryQty}
        </p>
        <p className="text-[9px] text-[var(--text-muted)]">units</p>
      </div>

      {/* Location + last activity */}
      <div className="pr-3">
        {line.currentLocation ? (
          <span className="inline-flex items-center gap-1 rounded-md border border-[#bae6fd] bg-[#f0f9ff] px-2 py-0.5 text-[11px] font-semibold text-[#0369a1]">
            📦 {line.currentLocation}
          </span>
        ) : (
          <span className="text-[11px] text-[var(--text-muted)]">—</span>
        )}
        {line.lastActivityAt && (
          <p
            className="mt-1 text-[10px]"
            style={{ color: lastActivityColor(line.lastActivityAt) }}
          >
            {formatRelativeTime(new Date(line.lastActivityAt))}
          </p>
        )}
      </div>

      {/* Next action */}
      <div onClick={(e) => e.stopPropagation()}>
        <NextActionButton line={line} onSelectLine={onSelectLine} onMoved={onMoved} />
      </div>
    </div>
  )
}

// ─── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ label, count, color, bg }: { label: string; count: number; color: string; bg: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color }}>{label}</span>
      <div className="h-px flex-1 bg-[var(--border)]" />
      <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: bg, color }}>{count}</span>
    </div>
  )
}

// ─── Table header ─────────────────────────────────────────────────────────────

function TableHeader() {
  return (
    <div
      className={`${GRID} border-b border-[var(--border)] bg-[var(--n-50)] px-4 py-2.5`}
      style={{ borderLeft: '3px solid transparent' }}
    >
      <div />
      <div className="pr-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Product</div>
      <div className="pr-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Customer · Project</div>
      <div className="pr-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Stage</div>
      <div className="pr-2 text-center text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Qty</div>
      <div className="pr-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Location · Activity</div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Next Action</div>
    </div>
  )
}

// ─── Loading skeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-2 p-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-20 rounded-xl bg-[linear-gradient(90deg,#f4f4f3,#ffffff,#f4f4f3)] animate-shimmer" />
      ))}
    </div>
  )
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'ready' | 'awaiting_packing' | 'awaiting_distributor' | 'awaiting_company'

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All stock' },
  { value: 'ready', label: '● Ready' },
  { value: 'awaiting_packing', label: 'Awaiting Packing' },
  { value: 'awaiting_distributor', label: 'With Distributor' },
  { value: 'awaiting_company', label: 'Awaiting Company' },
]

// ─── Main export ──────────────────────────────────────────────────────────────

export default function WorkspaceTrackStock({
  lines,
  isLoading,
  onMoved,
  onSelectLine,
}: Props) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  if (isLoading) return <LoadingSkeleton />

  // Only lines with physical stock (exclude purely unallocated)
  const physicalLines = lines.filter(
    (l) =>
      l.stages.PENDING_CO > 0 || l.stages.PENDING_DIST > 0 ||
      l.stages.GODOWN > 0 || l.stages.IN_BOX > 0 ||
      l.stages.DISPATCHED > 0 || l.stages.NOT_DISPLAYED > 0,
  )

  // Apply status filter
  const filtered: PurchaseTrackerLine[] = statusFilter === 'all'
    ? physicalLines
    : physicalLines.filter((l) => getLinePrimaryStatus(l) === statusFilter)

  // Section grouping (order matters)
  const readyLines    = filtered.filter((l) => l.stages.IN_BOX > 0)
  const packingLines  = filtered.filter((l) => l.stages.GODOWN > 0 && l.stages.IN_BOX === 0)
  const waitingLines  = filtered.filter(
    (l) => (l.stages.PENDING_DIST > 0 || l.stages.PENDING_CO > 0) && l.stages.GODOWN === 0 && l.stages.IN_BOX === 0,
  )

  // Sort each section
  const byCustomer = (a: PurchaseTrackerLine, b: PurchaseTrackerLine) =>
    (a.customer?.name ?? '').localeCompare(b.customer?.name ?? '')
  readyLines.sort(byCustomer)
  packingLines.sort(byCustomer)
  waitingLines.sort((a, b) => {
    // Stale ones first
    const aAge = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : Infinity
    const bAge = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : Infinity
    return aAge - bAge
  })

  const handleExport = () => {
    exportToCSV(filtered, `stock-${statusFilter}-${new Date().toISOString().slice(0, 10)}.csv`)
  }

  if (physicalLines.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-10 text-center">
        <p className="text-sm font-semibold text-[var(--text-primary)]">No physical stock yet</p>
        <p className="max-w-xs text-xs text-[var(--text-muted)]">
          Items appear here once they move past Unallocated stage.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">

      {/* Filter + export bar */}
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-[var(--border)] bg-white px-4 py-3">
        {STATUS_FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setStatusFilter(opt.value)}
            className={[
              'rounded-full border px-3 py-1 text-[11px] font-semibold transition',
              statusFilter === opt.value
                ? 'border-[#0f172a] bg-[#0f172a] text-white'
                : 'border-[var(--border)] bg-white text-[var(--text-secondary)] hover:border-[var(--border-strong)]',
            ].join(' ')}
          >
            {opt.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-[var(--text-muted)]">{filtered.length} lines</span>
        <button
          type="button"
          onClick={handleExport}
          className="flex items-center gap-1.5 rounded-lg border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-1.5 text-[11px] font-semibold text-[#15803d] transition hover:bg-[#dcfce7]"
        >
          ⬇ Export CSV
        </button>
      </div>

      {/* Table header */}
      <TableHeader />

      {/* Ready section */}
      {readyLines.length > 0 && (
        <div>
          <SectionHeader label="● Ready to Dispatch" count={readyLines.length} color="#15803d" bg="#dcfce7" />
          {readyLines.map((l) => (
            <StockRow key={l.id} line={l} onSelectLine={onSelectLine} onMoved={onMoved} />
          ))}
        </div>
      )}

      {/* Awaiting packing section */}
      {packingLines.length > 0 && (
        <div>
          <SectionHeader label="■ Awaiting Packing" count={packingLines.length} color="#1d4ed8" bg="#eff6ff" />
          {packingLines.map((l) => (
            <StockRow key={l.id} line={l} onSelectLine={onSelectLine} onMoved={onMoved} />
          ))}
        </div>
      )}

      {/* Waiting external section */}
      {waitingLines.length > 0 && (
        <div>
          <SectionHeader label="⏳ Waiting — External" count={waitingLines.length} color="#d97706" bg="#fffbeb" />
          {waitingLines.map((l) => (
            <StockRow key={l.id} line={l} onSelectLine={onSelectLine} onMoved={onMoved} />
          ))}
        </div>
      )}

      {filtered.length === 0 && physicalLines.length > 0 && (
        <div className="p-10 text-center text-sm text-[var(--text-muted)]">
          No lines match this filter.
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run type-check**

```bash
pnpm type-check 2>&1 | grep "WorkspaceTrackStock" | head -20
```

Expected: no errors.

- [ ] **Step 3: Start dev server and verify page renders**

```bash
pnpm dev
```

Open `http://localhost:3000/purchases` → switch to **Stock** tab. Confirm:
- Rows render with thumbnail + finish pill + stage tracker + location
- Section headers appear (Ready / Awaiting Packing / Waiting External)
- Filter chips filter sections correctly
- Export CSV button downloads a file

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/purchases/WorkspaceTrackStock.tsx
git commit -m "feat(ui): Purchases V6 visual stock rows with stage tracker, location, export"
```

---

## Task 12: Add thumbnails to `WorkspaceDispatch.tsx`

**Files:**
- Modify: `apps/web/src/components/purchases/WorkspaceDispatch.tsx`

- [ ] **Step 1: Import `Image` from `next/image`**

At the top of `WorkspaceDispatch.tsx`, add:

```typescript
import Image from 'next/image'
```

- [ ] **Step 2: Add `ProductThumb` helper (48px)**

Before the `StatusPill` function, add:

```typescript
function ProductThumb({ line }: { line: PurchaseTrackerLine }) {
  if (line.product.imageUrl) {
    return (
      <div className="relative h-12 w-12 shrink-0">
        <Image
          src={line.product.imageUrl}
          alt={line.product.name}
          fill
          className="rounded-lg border border-[var(--border)] object-contain p-0.5"
          unoptimized
        />
      </div>
    )
  }
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--n-50)] text-[10px] font-bold text-[var(--text-muted)]">
      {line.product.brand.slice(0, 3)}
    </div>
  )
}
```

- [ ] **Step 3: Add thumbnail to ready rows**

Find the ready-row `div` inside `dispatchableGroups.map`. It currently has a checkbox and product name. Add `<ProductThumb line={line} />` immediately after the checkbox:

```tsx
<div
  key={line.id}
  className={['flex items-center gap-4 px-5 py-3 transition', checked ? 'bg-[#f8fbff]' : ''].join(' ')}
>
  <input type="checkbox" ... />
  <ProductThumb line={line} />   {/* ← ADD */}
  <div className="min-w-0 flex-1">
    ...
  </div>
  ...
</div>
```

- [ ] **Step 4: Add thumbnail to blocked rows**

Find the blocked-row `div` (inside `group.blockedLines.map` and `blockedOnlyGroups.map`). Add `<ProductThumb line={line} />` after the spacer `<div className="h-4 w-4 shrink-0" />`:

```tsx
<div key={line.id} className="flex items-center gap-4 px-5 py-3 opacity-60">
  <div className="h-4 w-4 shrink-0" />  {/* checkbox spacer */}
  <ProductThumb line={line} />            {/* ← ADD */}
  <div className="min-w-0 flex-1">
    ...
  </div>
  ...
</div>
```

Apply the same change to the `blockedOnlyGroups` section (the independent blocked-only cards at bottom).

- [ ] **Step 5: Verify in browser**

Open `http://localhost:3000/purchases` → switch to **Today** tab. Confirm thumbnails appear in ready and blocked rows.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/purchases/WorkspaceDispatch.tsx
git commit -m "feat(ui): add product thumbnails to dispatch board rows"
```

---

## Task 13: Add thumbnails to `WorkspaceCustomers.tsx`

**Files:**
- Modify: `apps/web/src/components/purchases/WorkspaceCustomers.tsx`

- [ ] **Step 1: Import `Image` from `next/image`**

```typescript
import Image from 'next/image'
```

- [ ] **Step 2: Add `ProductThumb` helper (48px)**

Before `MarkPackedInline`, add the same helper as Task 12 Step 2.

- [ ] **Step 3: Add thumbnail to ready lines in `CustomerDetail`**

Find the ready-lines section (`readyLines.map`). Each row is:
```tsx
<div className="flex items-center justify-between px-4 py-3">
  <div className="min-w-0">
    <p ...>{line.product.name}</p>
    ...
  </div>
  ...
</div>
```

Add `<ProductThumb line={line} />` inside the flex, before `<div className="min-w-0">`:

```tsx
<div className="flex items-center gap-3 px-4 py-3">
  <ProductThumb line={line} />
  <div className="min-w-0 flex-1">
    ...
  </div>
  ...
</div>
```

- [ ] **Step 4: Update `MarkPackedInline` to send `location` as dedicated field**

Find the `doPack` function in `MarkPackedInline` and replace the fetch body:

```typescript
body: JSON.stringify({
  fromStage: 'GODOWN',
  toStage: 'IN_BOX',
  qty,
  location: location.trim() || undefined,   // ← dedicated field (was embedded in note)
}),
```

Remove the old `const note = location.trim() ? \`Location: ${location.trim()}\` : undefined` line.

- [ ] **Step 5: Add thumbnail to godown lines, pending lines, delivered lines**

Apply the same `<ProductThumb line={line} />` pattern to the `godownLines.map`, `pendingLines.map`, and the expanded `deliveredLines.map` sections. Each follows the same flex-row pattern.

- [ ] **Step 6: Verify in browser**

Open `http://localhost:3000/purchases` → **Customers** tab → click a customer. Confirm thumbnails appear in all four sections (ready, packing, pending, delivered).

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/purchases/WorkspaceCustomers.tsx
git commit -m "feat(ui): add product thumbnails to customer detail and fix MarkPackedInline location field"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by |
|-----------------|-----------|
| Every row: image, name, finish, customer, project, stage, qty, location, next action | Task 11 (`StockRow`) |
| Visual stage tracker with counts + color | Task 9 (`StageTracker`) |
| Location from StageMovement (not line item) | Tasks 1, 5, 6 |
| Ready vs Blocked dispatch boards | Existing `WorkspaceDispatch`, thumbnails added Task 12 |
| Location visibility | Task 11 (`currentLocation` column) |
| Customer ownership visibility | Task 11 (Customer · Project column) |
| Excel/CSV export matches visible filters | Task 10 + 11 (`exportToCSV(filtered, ...)`) |
| Large product thumbnails everywhere | Tasks 11, 12, 13 |
| Last Activity on rows | Task 2 (`formatRelativeTime`) + Task 11 (row render) |
| Export matches filters exactly | `exportToCSV(filtered, ...)` receives already-filtered array |
| Remove ERP terminology | Visual rows use "Ready", "Packed", "Distributor" — no raw stage codes exposed |
| No localStorage | Zero localStorage usage introduced |
| Connected to backend API routes | All mutations via `fetch` to existing routes; SWR for reads |

**Placeholder scan:** No TBDs, no "fill in later" steps. All code shown in full.

**Type consistency check:**
- `currentLocation: string | null` — defined Task 2, mapped Task 4, surfaced Task 5, read Task 11 ✓
- `lastActivityAt: string | null` — defined Task 2, mapped Task 4, surfaced Task 5, read Task 11 ✓
- `location?: string` in move-stage body — Zod schema Task 6, Prisma persist Task 6, sent from UI Tasks 8/11/13 ✓
- `formatRelativeTime` — defined Task 2, imported Task 11 ✓
- `lastActivityColor` — defined Task 2, imported Task 11 ✓
- `exportToCSV` — defined Task 10, imported Task 11 ✓
- `StageTracker` — defined Task 9, imported Task 11 ✓
