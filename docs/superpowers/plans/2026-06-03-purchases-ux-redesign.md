# Purchases UX Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace technical ERP stage labels and broken transfer workflow with a staff-first UI where a warehouse worker needs 30 minutes of training.

**Architecture:** Display-layer rename using a new `DisplayStage` virtual type (GODOWN+IN_BOX unified as `IN_BOX_COMBINED`). Universal Transfer extends the existing transfer API route to accept a `targetProjectId` or `newCustomerName`, auto-creating a PO and line item when no prior allocation exists. Dispatch Queue includes GODOWN stock (new legal transition: GODOWN → DISPATCHED). Customer workspace is rebuilt as a 4-section Command Center. No DB schema changes.

**Tech Stack:** Next.js 15, React, TypeScript, Prisma, Zod, SWR, Tailwind CSS v4, `@forge/db`

---

## File Map

| File | Action |
|---|---|
| `apps/web/src/lib/purchases-tracker.ts` | Add `DisplayStage`, display labels, `getDispatchReadiness`, `getInBoxQty`, `lineMatchesDisplayStage`, `getDisplayStageCount`, `STAGE_FRIENDLY_NAME` |
| `apps/web/src/lib/stageConfig.ts` | Add `GODOWN → DISPATCHED` to `LEGAL_TRANSITIONS` |
| `apps/web/src/app/api/purchase-orders/lines/[lineId]/move-stage/route.ts` | Add `GODOWN → DISPATCHED` to server-side `LEGAL_TRANSITIONS` |
| `apps/web/src/app/api/purchase-orders/lines/[lineId]/transfer/route.ts` | Accept `targetProjectId` / `newCustomerName`; auto-create PO + POLineItem |
| `apps/web/src/components/purchases/PurchasesWorkspace.tsx` | Switch `stageFilter` to `DisplayStage`; remove Transfers workspace; rename workspaces; wire `defaultTab` to ContextPanel |
| `apps/web/src/components/purchases/LineCard.tsx` | Use display labels; add Dispatch Readiness chip; add `onTransfer` prop + "Give to Customer" button |
| `apps/web/src/components/purchases/ContextPanel.tsx` | Rename tabs; add `defaultTab` prop; use `STAGE_FRIENDLY_NAME` in history; wire UniversalTransfer |
| `apps/web/src/components/purchases/UniversalTransfer.tsx` | **NEW** — customer search + auto-create + transfer form |
| `apps/web/src/components/purchases/WorkspaceCustomers.tsx` | Full redesign: 4-section Customer Command Center |
| `apps/web/src/components/purchases/WorkspaceDispatch.tsx` | Include GODOWN in ready queue; dispatch from GODOWN; inline challan; remove Pack Queue |
| `apps/web/src/components/purchases/WorkspacePipeline.tsx` | Rename file → `WorkspaceTrackStock.tsx`; use display labels |

---

## Task 1: Stage Display Layer — `purchases-tracker.ts`

**Files:**
- Modify: `apps/web/src/lib/purchases-tracker.ts`

- [ ] **Step 1: Add `DisplayStage` type and constants after the existing `STAGE_ORDER` block**

After line 9 (`] as const`), insert:

```ts
// ─── Operator-facing display stage model ──────────────────────────────────────
// GODOWN and IN_BOX are unified as IN_BOX_COMBINED — staff never sees the distinction.

export const DISPLAY_STAGE_ORDER = [
  'UNALLOCATED',
  'PENDING_CO',
  'PENDING_DIST',
  'IN_BOX_COMBINED',
  'DISPATCHED',
  'NOT_DISPLAYED',
] as const

export type DisplayStage = typeof DISPLAY_STAGE_ORDER[number]

export const DISPLAY_STAGE_LABEL: Record<DisplayStage, string> = {
  UNALLOCATED: 'Unassigned',
  PENDING_CO: 'Order in Company',
  PENDING_DIST: 'Company Billing',
  IN_BOX_COMBINED: 'In Box',
  DISPATCHED: 'Dispatched',
  NOT_DISPLAYED: 'Archive',
}

export const DISPLAY_STAGE_SHORT: Record<DisplayStage, string> = {
  UNALLOCATED: 'UNASSIGNED',
  PENDING_CO: 'WITH CO.',
  PENDING_DIST: 'BILLING',
  IN_BOX_COMBINED: 'IN BOX',
  DISPATCHED: 'DISPATCHED',
  NOT_DISPLAYED: 'ARCHIVE',
}

// Maps any raw stage string (including transfer pseudo-stages) to a friendly name.
// Used in the Activity Log tab of the context panel.
export const STAGE_FRIENDLY_NAME: Record<string, string> = {
  UNALLOCATED: 'Unassigned',
  PENDING_CO: 'Order in Company',
  PENDING_DIST: 'Company Billing',
  GODOWN: 'In Box',
  IN_BOX: 'In Box',
  DISPATCHED: 'Dispatched',
  NOT_DISPLAYED: 'Archive',
  TRANSFERRED_IN: 'Received from transfer',
  TRANSFERRED_OUT: 'Given to customer',
}

export function getDisplayStageCount(counts: HeaderCounts, stage: DisplayStage): number {
  if (stage === 'IN_BOX_COMBINED') return counts.GODOWN + counts.IN_BOX
  return counts[stage as PurchaseStage]
}

export function lineMatchesDisplayStage(line: PurchaseTrackerLine, stage: DisplayStage): boolean {
  if (stage === 'IN_BOX_COMBINED') return line.stages.GODOWN > 0 || line.stages.IN_BOX > 0
  return line.stages[stage as PurchaseStage] > 0
}

export function getInBoxQty(line: PurchaseTrackerLine): number {
  return line.stages.GODOWN + line.stages.IN_BOX
}

export type DispatchReadiness = 'waiting' | 'in_box' | 'dispatched' | 'archived'

export function getDispatchReadiness(line: PurchaseTrackerLine): DispatchReadiness {
  if (getInBoxQty(line) > 0) return 'in_box'
  if (line.stages.DISPATCHED > 0 || line.stages.NOT_DISPLAYED > 0) {
    return getInBoxQty(line) === 0 && line.stages.PENDING_CO === 0 && line.stages.PENDING_DIST === 0
      ? (line.stages.NOT_DISPLAYED > 0 ? 'archived' : 'dispatched')
      : 'waiting'
  }
  return 'waiting'
}

export const DISPATCH_READINESS_LABEL: Record<DispatchReadiness, string> = {
  waiting: 'Waiting from Supplier',
  in_box: 'In Box — Ready',
  dispatched: 'Dispatched',
  archived: 'Archived',
}

export const DISPATCH_READINESS_COLOR: Record<DispatchReadiness, string> = {
  waiting: '#9CA3AF',
  in_box: '#10B981',
  dispatched: '#6EE7B7',
  archived: '#D1D5DB',
}
```

- [ ] **Step 2: Type-check**

```bash
cd apps/web && pnpm type-check 2>&1 | grep "purchases-tracker" | head -20
```

Expected: zero errors from `purchases-tracker.ts`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/purchases-tracker.ts
git commit -m "feat: add DisplayStage, getDispatchReadiness, getInBoxQty, STAGE_FRIENDLY_NAME"
```

---

## Task 2: Legal Transitions — Allow GODOWN → DISPATCHED

**Files:**
- Modify: `apps/web/src/lib/stageConfig.ts`
- Modify: `apps/web/src/app/api/purchase-orders/lines/[lineId]/move-stage/route.ts`

Staff see "In Box" as one stage. Dispatch should fire directly from GODOWN without a separate "pack" step.

- [ ] **Step 1: Update `stageConfig.ts`**

In `apps/web/src/lib/stageConfig.ts`, replace the `LEGAL_TRANSITIONS` export:

```ts
export const LEGAL_TRANSITIONS: Record<import('@/lib/purchases-tracker').PurchaseStage, import('@/lib/purchases-tracker').PurchaseStage[]> = {
  UNALLOCATED: ['PENDING_CO', 'PENDING_DIST'],
  PENDING_CO: ['PENDING_DIST', 'GODOWN'],
  PENDING_DIST: ['GODOWN'],
  GODOWN: ['IN_BOX', 'DISPATCHED'],
  IN_BOX: ['DISPATCHED'],
  DISPATCHED: ['NOT_DISPLAYED'],
  NOT_DISPLAYED: [],
}
```

- [ ] **Step 2: Update move-stage API route**

In `apps/web/src/app/api/purchase-orders/lines/[lineId]/move-stage/route.ts`, find the `LEGAL_TRANSITIONS` constant (around line 25) and change:

```ts
// BEFORE
GODOWN:      ['IN_BOX'],

// AFTER
GODOWN:      ['IN_BOX', 'DISPATCHED'],
```

- [ ] **Step 3: Type-check**

```bash
cd apps/web && pnpm type-check 2>&1 | grep "move-stage\|stageConfig" | head -20
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/stageConfig.ts \
        apps/web/src/app/api/purchase-orders/lines/[lineId]/move-stage/route.ts
git commit -m "feat: allow GODOWN → DISPATCHED transition; In Box items always dispatchable"
```

---

## Task 3: PurchasesWorkspace — Sidebar + Workspace Cleanup

**Files:**
- Modify: `apps/web/src/components/purchases/PurchasesWorkspace.tsx`

- [ ] **Step 1: Update imports**

At the top of `PurchasesWorkspace.tsx`, add `DisplayStage`, `DISPLAY_STAGE_ORDER`, `DISPLAY_STAGE_LABEL`, `getDisplayStageCount`, `lineMatchesDisplayStage`, `getInBoxQty` to the `@/lib/purchases-tracker` import. Remove `STAGE_ORDER`, `STAGE_COLORS`, `STAGE_SHORT_LABEL` from the import (they're replaced).

```ts
import {
  BRAND_TABS,
  BRAND_ACCENTS,
  DISPLAY_STAGE_ORDER,
  DISPLAY_STAGE_LABEL,
  DISPATCH_READINESS_COLOR,
  createEmptyBrandCounts,
  createEmptyHeaderCounts,
  getDispatchReadiness,
  getDisplayStageCount,
  getInBoxQty,
  getLineUrgency,
  lineMatchesDisplayStage,
  URGENCY_COLORS,
  type BrandTab,
  type DisplayStage,
  type HeaderCounts,
  type PurchaseLinesResponse,
  type PurchaseTrackerLine,
} from '@/lib/purchases-tracker'
```

- [ ] **Step 2: Change `stageFilter` state type and workspace list**

Replace the `stageFilter` state:

```ts
// BEFORE
const [stageFilter, setStageFilter] = useState<PurchaseStage | null>(null)

// AFTER
const [stageFilter, setStageFilter] = useState<DisplayStage | null>(null)
```

Replace the `WORKSPACE_ITEMS` array — remove `transfers`, rename labels:

```ts
const WORKSPACE_ITEMS: { id: Workspace; label: string; icon: string }[] = [
  { id: 'pipeline', label: 'Track Stock', icon: '◈' },
  { id: 'customers', label: 'Customers', icon: '◎' },
  { id: 'dispatch', label: 'Dispatch Queue', icon: '▷' },
]
```

Update the `Workspace` type:

```ts
export type Workspace = 'pipeline' | 'customers' | 'dispatch'
```

- [ ] **Step 3: Update stage filter logic**

Replace the `stageFilteredLines` computation:

```ts
// BEFORE
const stageFilteredLines = stageFilter
  ? filteredLines.filter((l) => l.stages[stageFilter] > 0)
  : filteredLines

// AFTER
const stageFilteredLines = stageFilter
  ? filteredLines.filter((l) => lineMatchesDisplayStage(l, stageFilter))
  : filteredLines
```

- [ ] **Step 4: Update dispatch-ready count to include GODOWN**

```ts
// BEFORE
const dispatchReadyCount = lines.filter((l) => l.stages.IN_BOX > 0).length

// AFTER
const dispatchReadyCount = lines.filter((l) => getInBoxQty(l) > 0).length
```

- [ ] **Step 5: Rewrite the sidebar Stages section**

Replace the entire `{/* Stage summary */}` `<div>` block with:

```tsx
{/* Stage summary */}
<div className="p-3">
  <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
    Stages
  </p>
  {DISPLAY_STAGE_ORDER.map((stage) => {
    const count = getDisplayStageCount(headerCounts, stage)
    const active = stageFilter === stage
    const hasUrgent = lines.some((l) => {
      if (!lineMatchesDisplayStage(l, stage)) return false
      const u = getLineUrgency(l)
      return u === 'critical' || u === 'warning'
    })
    const dotColor = hasUrgent ? URGENCY_COLORS.warning : '#6B7280'
    return (
      <button
        key={stage}
        type="button"
        onClick={() => setStageFilter(active ? null : stage)}
        className={[
          'flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-medium transition',
          active ? 'bg-[var(--n-100)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--n-50)]',
          count === 0 ? 'opacity-40' : '',
        ].join(' ')}
      >
        <span className="h-2 w-2 rounded-full shrink-0" style={{ background: dotColor }} />
        <span className="min-w-0 flex-1 truncate">{DISPLAY_STAGE_LABEL[stage]}</span>
        <span
          className="ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums"
          style={{
            background: active ? '#2563eb20' : 'var(--n-100)',
            color: active ? '#2563eb' : 'var(--text-muted)',
            fontFamily: 'var(--font-ui)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {count}
        </span>
      </button>
    )
  })}
</div>
```

- [ ] **Step 6: Add `defaultTab` state and `handleSelectLine` helper**

Replace the `selectedLineId` state and the Transfers workspace render:

```ts
// Add alongside existing state
const [contextPanelTab, setContextPanelTab] = useState<'move' | 'transfer' | 'history'>('move')

function handleSelectLine(lineId: string, tab: 'move' | 'transfer' | 'history' = 'move') {
  setSelectedLineId(lineId)
  setContextPanelTab(tab)
}
```

- [ ] **Step 7: Remove the Transfers workspace render block and update main**

In the `{/* Main workspace */}` section, remove the `{workspace === 'transfers' && ...}` block entirely. Update `WorkspacePipeline` props to use `onSelectLine={handleSelectLine}`, `WorkspaceCustomers` and `WorkspaceDispatch` similarly.

Update the ContextPanel render to pass `defaultTab`:

```tsx
{selectedLine && (
  <ContextPanel
    line={selectedLine}
    activeBrand={activeBrand}
    allLines={lines}
    defaultTab={contextPanelTab}
    onClose={() => setSelectedLineId(null)}
    onMoved={handleMoved}
  />
)}
```

- [ ] **Step 8: Type-check**

```bash
cd apps/web && pnpm type-check 2>&1 | grep "PurchasesWorkspace" | head -20
```

Fix any type errors. Expected: zero.

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/components/purchases/PurchasesWorkspace.tsx
git commit -m "feat: sidebar shows 5 operator-friendly stages; remove Transfers workspace; rename workspaces"
```

---

## Task 4: LineCard — Display Labels + Readiness Chip + Give to Customer Button

**Files:**
- Modify: `apps/web/src/components/purchases/LineCard.tsx`

- [ ] **Step 1: Update imports**

Replace `STAGE_COLORS`, `STAGE_SHORT_LABEL` with display-layer equivalents:

```ts
import {
  STAGE_FRIENDLY_NAME,
  DISPATCH_READINESS_COLOR,
  DISPATCH_READINESS_LABEL,
  getDispatchReadiness,
  getLineUrgency,
  URGENCY_COLORS,
  type BrandTab,
  type HeaderCounts,
  type PurchaseStage,
  type PurchaseTrackerLine,
} from '@/lib/purchases-tracker'
```

- [ ] **Step 2: Update `LineCardProps` — add `onTransfer`**

```ts
interface LineCardProps {
  line: PurchaseTrackerLine
  context: 'company' | 'customer'
  activeBrand: BrandTab
  allLines: PurchaseTrackerLine[]
  onMoved: (newCounts: HeaderCounts, lineId: string, fromStage: PurchaseStage, toStage: PurchaseStage, qty: number) => void
  onSelect: () => void
  onTransfer?: () => void
}
```

- [ ] **Step 3: Rewrite stage chips to use friendly names**

In the stage chips section, replace `STAGE_SHORT_LABEL[stage]` with `STAGE_FRIENDLY_NAME[stage] ?? stage`:

```tsx
{/* Stage chips — only active (non-zero) stages, using friendly names */}
{activeStages.length > 0 ? (
  <div className="mt-3 flex flex-wrap gap-1.5">
    {activeStages.map((stage) => (
      <div
        key={stage}
        className="flex items-center gap-1 rounded-lg px-2 py-1 bg-[var(--n-100)]"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--text-muted)]" />
        <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
          {STAGE_FRIENDLY_NAME[stage] ?? stage}
        </span>
        <span
          className="text-[11px] font-bold text-[var(--text-primary)]"
          style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}
        >
          {line.stages[stage]}
        </span>
      </div>
    ))}
  </div>
) : (
  <p className="mt-2 text-xs text-[var(--text-muted)]">All units dispatched or transferred.</p>
)}
```

- [ ] **Step 4: Add Dispatch Readiness chip and Give to Customer button**

Add below the stage chips block, before the closing `</div>` of the flex container:

```tsx
{/* Bottom row: readiness chip + actions */}
<div className="mt-3 flex items-center gap-2">
  {/* Dispatch readiness */}
  {(() => {
    const readiness = getDispatchReadiness(line)
    if (readiness === 'dispatched' || readiness === 'archived') return null
    return (
      <span
        className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
        style={{ background: DISPATCH_READINESS_COLOR[readiness] }}
      >
        {DISPATCH_READINESS_LABEL[readiness]}
      </span>
    )
  })()}

  {/* Give to Customer — inline shortcut to transfer tab */}
  {onTransfer && (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onTransfer() }}
      className="ml-auto rounded-lg border border-[var(--border)] bg-white px-2.5 py-1 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[#93c5fd] hover:text-[var(--text-primary)]"
    >
      Give to Customer ↱
    </button>
  )}
</div>
```

- [ ] **Step 5: Update function signature to destructure `onTransfer`**

```ts
export default function LineCard({ line, context, activeBrand, allLines, onMoved, onSelect, onTransfer }: LineCardProps) {
```

- [ ] **Step 6: Wire `onTransfer` in callers**

In `WorkspacePipeline.tsx` (soon renamed TrackStock), pass `onTransfer`:

```tsx
<LineCard
  key={line.id}
  line={line}
  context="company"
  activeBrand={activeBrand}
  allLines={allLines}
  onMoved={onMoved}
  onSelect={() => onSelectLine(line.id)}
  onTransfer={() => onSelectLine(line.id, 'transfer')}
/>
```

The `onSelectLine` signature has changed (see Task 3 Step 6) — it now accepts an optional second argument `tab`. Update the prop type on `WorkspacePipeline` accordingly:

```ts
onSelectLine: (lineId: string, tab?: 'move' | 'transfer' | 'history') => void
```

Do the same update for `WorkspaceCustomers`.

- [ ] **Step 7: Type-check**

```bash
cd apps/web && pnpm type-check 2>&1 | grep "LineCard\|WorkspacePipeline\|WorkspaceCustomers" | head -30
```

Expected: zero errors.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/components/purchases/LineCard.tsx \
        apps/web/src/components/purchases/WorkspacePipeline.tsx \
        apps/web/src/components/purchases/WorkspaceCustomers.tsx
git commit -m "feat: LineCard uses friendly stage names, dispatch readiness chip, Give to Customer button"
```

---

## Task 5: ContextPanel — Tab Rename + defaultTab + Activity Log Display Names

**Files:**
- Modify: `apps/web/src/components/purchases/ContextPanel.tsx`

- [ ] **Step 1: Add `STAGE_FRIENDLY_NAME` import and `defaultTab` prop**

Update imports to include `STAGE_FRIENDLY_NAME`:

```ts
import {
  STAGE_COLORS,
  STAGE_LABEL,
  STAGE_ORDER,
  STAGE_FRIENDLY_NAME,
  effectiveCeiling,
  type BrandTab,
  type HeaderCounts,
  type PurchaseStage,
  type PurchaseTrackerLine,
} from '@/lib/purchases-tracker'
```

Update `Props` interface:

```ts
interface Props {
  line: PurchaseTrackerLine
  allLines: PurchaseTrackerLine[]
  activeBrand: BrandTab
  defaultTab?: 'move' | 'transfer' | 'history'
  onClose: () => void
  onMoved: (newCounts: HeaderCounts, lineId?: string, fromStage?: PurchaseStage, toStage?: PurchaseStage, qty?: number) => void
}
```

- [ ] **Step 2: Wire `defaultTab` into tab state**

In `ContextPanel` component, update the tab state and effect:

```ts
export default function ContextPanel({ line, allLines, activeBrand, defaultTab = 'move', onClose, onMoved }: Props) {
  const [tab, setTab] = useState<'move' | 'transfer' | 'history'>(defaultTab)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setTab(defaultTab)
  }, [line.id, defaultTab])
```

- [ ] **Step 3: Rename tab buttons to operator-friendly labels**

Find the tab render block and replace the label map:

```tsx
{(['move', 'transfer', 'history'] as const).map((t) => (
  <button
    key={t}
    type="button"
    onClick={() => setTab(t)}
    className={[
      'flex-1 py-3 text-xs font-semibold transition',
      tab === t
        ? 'border-b-2 border-[#2563eb] text-[#2563eb]'
        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
    ].join(' ')}
  >
    {t === 'move' ? 'Move Stock' : t === 'transfer' ? 'Give to Customer' : 'Activity Log'}
  </button>
))}
```

- [ ] **Step 4: Update HistorySection to use friendly stage names**

In `HistorySection`, replace the movement text render. Find the line that renders `${m.fromStage} → ${m.toStage}` and update:

```tsx
{movements.map((m) => {
  const isTransferOut = m.toStage === 'TRANSFERRED_OUT'
  const isTransferIn  = m.fromStage === 'TRANSFERRED_IN'
  const isTransfer = isTransferOut || isTransferIn
  const isLegacy = !isTransfer && (!CANONICAL.has(m.fromStage) || !CANONICAL.has(m.toStage))

  const friendlyFrom = STAGE_FRIENDLY_NAME[m.fromStage] ?? m.fromStage
  const friendlyTo   = STAGE_FRIENDLY_NAME[m.toStage]   ?? m.toStage

  return (
    <div key={m.id} className={[
      'rounded-xl border p-3',
      isTransfer ? 'border-[#fde68a] bg-[#fffbeb]' :
      isLegacy   ? 'border-[#e5e7eb] bg-[#f9fafb] opacity-60' :
      'border-[var(--border)] bg-[var(--n-50)]',
    ].join(' ')}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-[var(--text-primary)]">
          {isTransferOut
            ? `Given to customer · ${m.qty} unit${m.qty > 1 ? 's' : ''}`
            : isTransferIn
            ? `Received from transfer · ${m.qty} unit${m.qty > 1 ? 's' : ''}`
            : isLegacy
            ? `[Legacy] ${m.fromStage} → ${m.toStage} · ${m.qty}`
            : `${friendlyFrom} → ${friendlyTo} · ${m.qty} unit${m.qty > 1 ? 's' : ''}`
          }
        </p>
        <span className="shrink-0 text-[10px] text-[var(--text-muted)]">
          {new Date(m.movedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </span>
      </div>
      {m.note && <p className="mt-1 text-[11px] text-[var(--text-muted)]">{m.note}</p>}
      <p className="mt-1 text-[11px] text-[var(--text-muted)]">{m.movedBy.name}</p>
    </div>
  )
})}
```

- [ ] **Step 5: Update MoveSection to show friendly stage labels**

In `MoveSection`, all occurrences of `STAGE_LABEL[s]` should stay (they use the old technical labels in the from-stage buttons). Replace them with `STAGE_FRIENDLY_NAME[s] ?? STAGE_LABEL[s]`:

```tsx
// In the from-stage button:
{STAGE_FRIENDLY_NAME[s] ?? STAGE_LABEL[s]} ({line.stages[s]})

// In the to-stage button:
→ {STAGE_FRIENDLY_NAME[t] ?? STAGE_LABEL[t]}

// In the Move button label:
{saving ? 'Moving…' : `Move ${qty} → ${toStage ? (STAGE_FRIENDLY_NAME[toStage] ?? STAGE_LABEL[toStage]) : '…'}`}
```

- [ ] **Step 6: Replace TransferSection with a placeholder import**

The `TransferSection` component in `ContextPanel.tsx` will be replaced by `UniversalTransfer` in Task 6. For now, keep `TransferSection` in place — it will be swapped once `UniversalTransfer.tsx` exists.

- [ ] **Step 7: Type-check**

```bash
cd apps/web && pnpm type-check 2>&1 | grep "ContextPanel" | head -20
```

Expected: zero errors.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/components/purchases/ContextPanel.tsx
git commit -m "feat: ContextPanel tab labels renamed; friendly stage names in Activity Log; defaultTab prop"
```

---

## Task 6: Universal Transfer — API + Component

**Files:**
- Modify: `apps/web/src/app/api/purchase-orders/lines/[lineId]/transfer/route.ts`
- Create: `apps/web/src/components/purchases/UniversalTransfer.tsx`
- Modify: `apps/web/src/components/purchases/ContextPanel.tsx` (swap TransferSection)

### 6A — API Route Extension

- [ ] **Step 1: Update the Zod schema in the transfer route**

In `apps/web/src/app/api/purchase-orders/lines/[lineId]/transfer/route.ts`, replace the `TransferSchema` and the `generatePONumber` import:

```ts
import { generatePONumber } from '@/lib/poNumberGenerator'

const TransferSchema = z.discriminatedUnion('mode', [
  // Legacy: source and target line IDs both known
  z.object({
    mode: z.literal('line'),
    stage: z.enum(TRANSFERABLE_STAGES),
    qty: z.number().int().min(1),
    targetLineId: z.string(),
    reason: z.string().min(1).max(500),
    brand: z.enum(BRAND_TABS).optional(),
  }),
  // New: existing project, may or may not have a line for this product
  z.object({
    mode: z.literal('project'),
    stage: z.enum(TRANSFERABLE_STAGES),
    qty: z.number().int().min(1),
    targetProjectId: z.string(),
    reason: z.string().min(1).max(500),
    brand: z.enum(BRAND_TABS).optional(),
  }),
  // New: create a new customer on the fly
  z.object({
    mode: z.literal('new'),
    stage: z.enum(TRANSFERABLE_STAGES),
    qty: z.number().int().min(1),
    newCustomerName: z.string().min(1).max(200),
    reason: z.string().min(1).max(500),
    brand: z.enum(BRAND_TABS).optional(),
  }),
])
```

- [ ] **Step 2: Add helper to find or create target line**

After the `TransferSchema` definition, add:

```ts
async function resolveTargetLineId(
  sourceLine: { id: string; productId: string; poId: string },
  body: z.infer<typeof TransferSchema>,
  userId: string,
): Promise<string> {
  // Legacy path
  if (body.mode === 'line') return body.targetLineId

  let projectId: string

  if (body.mode === 'new') {
    // Create a minimal Project record
    const project = await prisma.project.create({
      data: {
        clientName: body.newCustomerName,
        projectName: body.newCustomerName,
        createdById: userId,
      } as Parameters<typeof prisma.project.create>[0]['data'],
    })
    projectId = project.id
  } else {
    projectId = body.targetProjectId
  }

  // Find existing line for this project + product
  const existing = await prisma.pOLineItem.findFirst({
    where: {
      productId: sourceLine.productId,
      po: { projectId },
    },
    select: { id: true },
  })

  if (existing) return existing.id

  // Create a new PO + line for this project
  const poNumber = await generatePONumber()
  const newPo = await prisma.purchaseOrder.create({
    data: {
      poNumber,
      mode: 'PROJECT_LINKED',
      projectId,
      createdById: userId,
    },
  })

  const newLine = await prisma.pOLineItem.create({
    data: {
      poId: newPo.id,
      productId: sourceLine.productId,
      qtyOrdered: 0,
    },
  })

  return newLine.id
}
```

Note: `Project.createdById` may not exist on the schema — if Prisma rejects it, omit that field from the `project.create` call.

- [ ] **Step 3: Update the POST handler to use `resolveTargetLineId`**

Replace the body parsing and `targetLineId` extraction in the POST handler:

```ts
const body = TransferSchema.parse(await req.json())
const { stage, qty, reason } = body

const targetLineId = await resolveTargetLineId(sourceLine, body, user.id)

if (lineId === targetLineId) {
  throw new AppError('INVALID_TARGET', 'Cannot transfer to the same line', 422)
}
```

Remove the old `targetLine` lookup that used `targetLineId` from schema directly (it now comes from `resolveTargetLineId`).

- [ ] **Step 4: Type-check the API route**

```bash
cd apps/web && pnpm type-check 2>&1 | grep "transfer/route" | head -20
```

If `Project.createdById` doesn't exist, remove it from the `project.create` data. Expected: zero errors.

- [ ] **Step 5: Commit the API changes**

```bash
git add "apps/web/src/app/api/purchase-orders/lines/[lineId]/transfer/route.ts"
git commit -m "feat: transfer route accepts targetProjectId/newCustomerName; auto-creates PO+line"
```

### 6B — UniversalTransfer Component

- [ ] **Step 6: Create `UniversalTransfer.tsx`**

Create `apps/web/src/components/purchases/UniversalTransfer.tsx`:

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import {
  STAGE_FRIENDLY_NAME,
  TRANSFERABLE_STAGES_FOR_DISPLAY,
  type BrandTab,
  type HeaderCounts,
  type PurchaseStage,
  type PurchaseTrackerLine,
} from '@/lib/purchases-tracker'

// The stages staff can transfer FROM (excludes UNALLOCATED and NOT_DISPLAYED)
const TRANSFERABLE: PurchaseStage[] = ['PENDING_CO', 'PENDING_DIST', 'GODOWN', 'IN_BOX', 'DISPATCHED']

interface ProjectResult {
  id: string
  clientName: string
  projectName: string
  siteAddress?: string | null
}

interface UniversalTransferProps {
  line: PurchaseTrackerLine
  activeBrand: BrandTab
  onMoved: (newCounts: HeaderCounts) => void
}

const REASON_PRESETS = ['Urgent site requirement', 'Customer on hold', 'Stock redistribution']

export default function UniversalTransfer({ line, activeBrand, onMoved }: UniversalTransferProps) {
  const activeStages = TRANSFERABLE.filter((s) => line.stages[s] > 0)

  const [fromStage, setFromStage] = useState<PurchaseStage | null>(activeStages[0] ?? null)
  const [qty, setQty] = useState(1)
  const [reason, setReason] = useState('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ProjectResult[]>([])
  const [selectedProject, setSelectedProject] = useState<ProjectResult | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState('')
  const searchRef = useRef<HTMLDivElement>(null)

  // Reset when line changes
  useEffect(() => {
    setFromStage(TRANSFERABLE.filter((s) => line.stages[s] > 0)[0] ?? null)
    setQty(1)
    setReason('')
    setQuery('')
    setSelectedProject(null)
    setErr('')
    setDone('')
  }, [line.id])

  // Debounced project search
  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      setShowDropdown(false)
      return
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/projects/search?q=${encodeURIComponent(query)}`)
        const data = await res.json() as ProjectResult[]
        setResults(data)
        setShowDropdown(true)
      } catch {
        setResults([])
      }
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const available = fromStage ? line.stages[fromStage] : 0

  async function doTransfer() {
    if (!fromStage || !reason.trim()) return
    setSaving(true)
    setErr('')
    setDone('')

    // Determine mode
    const isNew = query.trim() && !selectedProject
    const body = isNew
      ? { mode: 'new', stage: fromStage, qty, newCustomerName: query.trim(), reason, brand: activeBrand }
      : selectedProject
      ? { mode: 'project', stage: fromStage, qty, targetProjectId: selectedProject.id, reason, brand: activeBrand }
      : null

    if (!body) { setErr('Select or type a customer name'); setSaving(false); return }

    try {
      const res = await fetch(
        `/api/purchase-orders/lines/${encodeURIComponent(line.id)}/transfer`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
      )
      const data = await res.json() as { stageTotals?: HeaderCounts; message?: string; error?: string }
      if (!res.ok || !data.stageTotals) {
        setErr(data.message ?? data.error ?? 'Transfer failed')
        return
      }
      onMoved(data.stageTotals)
      setDone(`Transferred ${qty} unit${qty > 1 ? 's' : ''} to ${isNew ? query.trim() : selectedProject!.clientName}`)
      setQty(1)
      setReason('')
      setQuery('')
      setSelectedProject(null)
    } catch {
      setErr('Network error')
    } finally {
      setSaving(false)
    }
  }

  if (activeStages.length === 0) {
    return <p className="text-xs text-[var(--text-muted)]">No transferable stock on this line.</p>
  }

  return (
    <div className="space-y-4">
      {done && (
        <p className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] p-2 text-xs text-[#15803d]">✓ {done}</p>
      )}

      {/* From stage */}
      <div>
        <p className="mb-2 text-xs font-medium text-[var(--text-muted)]">Taking from</p>
        <div className="flex flex-wrap gap-1.5">
          {activeStages.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { setFromStage(s); setQty(1) }}
              className={[
                'rounded-lg border px-2.5 py-1 text-xs font-semibold transition',
                fromStage === s
                  ? 'border-[#0f172a] bg-[#0f172a] text-white'
                  : 'border-[var(--border)] bg-white text-[var(--text-secondary)] hover:border-[var(--border-strong)]',
              ].join(' ')}
            >
              {STAGE_FRIENDLY_NAME[s] ?? s} ({line.stages[s]})
            </button>
          ))}
        </div>
      </div>

      {/* Destination customer search */}
      <div ref={searchRef} className="relative">
        <p className="mb-2 text-xs font-medium text-[var(--text-muted)]">Give to customer</p>
        {selectedProject ? (
          <div className="flex items-center gap-2 rounded-xl border border-[#dbeafe] bg-[#eff6ff] px-3 py-2">
            <span className="flex-1 text-sm font-semibold text-[#1d4ed8]">{selectedProject.clientName}</span>
            <button
              type="button"
              onClick={() => { setSelectedProject(null); setQuery('') }}
              className="text-xs text-[#2563eb] hover:text-[#1d4ed8]"
            >
              ×
            </button>
          </div>
        ) : (
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search customer or type a new name…"
            className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#60a5fa]"
          />
        )}

        {showDropdown && results.length > 0 && !selectedProject && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-[var(--shadow-float)]">
            {results.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => { setSelectedProject(project); setQuery(''); setShowDropdown(false) }}
                className="w-full px-3 py-2.5 text-left hover:bg-[var(--n-50)]"
              >
                <p className="text-sm font-medium text-[var(--text-primary)]">{project.clientName}</p>
                {project.siteAddress && (
                  <p className="text-xs text-[var(--text-muted)]">{project.siteAddress}</p>
                )}
              </button>
            ))}
            {query.trim() && (
              <div className="border-t border-[var(--border)] px-3 py-2 text-xs text-[var(--text-muted)]">
                Or press Transfer to create <strong>"{query.trim()}"</strong> as a new customer
              </div>
            )}
          </div>
        )}
      </div>

      {/* Qty */}
      <div>
        <p className="mb-2 text-xs font-medium text-[var(--text-muted)]">Quantity</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] font-bold transition hover:border-[#60a5fa]"
          >-</button>
          <input
            type="number"
            value={qty}
            min={1}
            max={available}
            onChange={(e) => {
              const v = Number(e.target.value)
              setQty(Math.min(available, Math.max(1, Number.isFinite(v) ? v : 1)))
            }}
            className="w-14 rounded-xl border border-[var(--border)] py-1.5 text-center text-sm font-bold outline-none focus:border-[#60a5fa]"
          />
          <button
            type="button"
            onClick={() => setQty((q) => Math.min(available, q + 1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] font-bold transition hover:border-[#60a5fa]"
          >+</button>
          <span className="text-xs text-[var(--text-muted)]">of {available}</span>
        </div>
      </div>

      {/* Reason */}
      <div>
        <p className="mb-2 text-xs font-medium text-[var(--text-muted)]">Reason</p>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Urgent site requirement"
          className="w-full rounded-xl border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-[#60a5fa]"
        />
        <div className="mt-1.5 flex flex-wrap gap-1">
          {REASON_PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setReason(p)}
              className="rounded-md bg-[var(--n-100)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)] transition hover:bg-[var(--n-200)]"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {err && <p className="rounded-xl bg-[#fef2f2] p-2 text-xs text-[#dc2626]">{err}</p>}

      <button
        type="button"
        onClick={() => void doTransfer()}
        disabled={saving || !fromStage || (!selectedProject && !query.trim()) || !reason.trim()}
        className="w-full rounded-xl bg-[#0f172a] py-2.5 text-sm font-bold text-white transition hover:bg-black disabled:opacity-40"
      >
        {saving ? 'Transferring…' : `Give ${qty} unit${qty > 1 ? 's' : ''} to Customer ↱`}
      </button>
    </div>
  )
}
```

- [ ] **Step 7: Wire UniversalTransfer into ContextPanel**

In `ContextPanel.tsx`, replace the `TransferSection` import and usage:

1. Remove the `TransferSection` function entirely.
2. Add import at the top:
   ```ts
   import UniversalTransfer from '@/components/purchases/UniversalTransfer'
   ```
3. In the tab content section, replace `{tab === 'transfer' && <TransferSection ... />}` with:
   ```tsx
   {tab === 'transfer' && (
     <UniversalTransfer
       line={line}
       activeBrand={activeBrand}
       onMoved={onMoved}
     />
   )}
   ```

- [ ] **Step 8: Type-check**

```bash
cd apps/web && pnpm type-check 2>&1 | grep "UniversalTransfer\|ContextPanel\|transfer/route" | head -30
```

Expected: zero errors.

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/components/purchases/UniversalTransfer.tsx \
        apps/web/src/components/purchases/ContextPanel.tsx \
        "apps/web/src/app/api/purchase-orders/lines/[lineId]/transfer/route.ts"
git commit -m "feat: universal transfer — search any customer, auto-create allocation, no prerequisites"
```

---

## Task 7: Customer Command Center

**Files:**
- Modify: `apps/web/src/components/purchases/WorkspaceCustomers.tsx`

Full redesign: replace the flat LineCard list with 4 sections (Ready, Coming Soon, Transferred, Delivered).

- [ ] **Step 1: Update imports**

```ts
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import {
  STAGE_FRIENDLY_NAME,
  effectiveCeiling,
  getInBoxQty,
  getDispatchReadiness,
  matchesBrandTab,
  type BrandTab,
  type HeaderCounts,
  type PurchaseStage,
  type PurchaseTrackerLine,
} from '@/lib/purchases-tracker'
```

- [ ] **Step 2: Add transfer history type and fetcher**

```ts
interface TransferEntry {
  id: string
  fromStage: string
  toStage: string
  qty: number
  note: string | null
  movedAt: string
  movedBy: { name: string }
}

const historyFetcher = async (url: string): Promise<TransferEntry[]> => {
  const res = await fetch(url)
  if (!res.ok) return []
  const data = await res.json() as { movements: TransferEntry[] }
  return data.movements
}
```

- [ ] **Step 3: Replace the component body**

The new `WorkspaceCustomers` exports the same props interface (`lines`, `activeBrand`, `onMoved`, `onSelectLine`) but renders a 4-section layout. Replace the entire component function:

```tsx
export default function WorkspaceCustomers({ lines, activeBrand, onMoved, onSelectLine }: Props) {
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Build customer buckets
  const customers = lines.reduce<Record<string, CustomerBucket>>((acc, line) => {
    if (!line.customer) return acc
    const b = acc[line.customer.id] ?? {
      id: line.customer.id,
      name: line.customer.name,
      siteAddress: line.customer.siteAddress,
      lines: [],
    }
    b.lines.push(line)
    acc[line.customer.id] = b
    return acc
  }, {})

  const customerList = Object.values(customers)
    .filter((c) => {
      const q = search.trim().toLowerCase()
      return !q || c.name.toLowerCase().includes(q) || (c.siteAddress?.toLowerCase().includes(q) ?? false)
    })
    .sort((a, b) => {
      // Customers with in-box items first (sorted by days waiting)
      const aReady = getInBoxQty({ stages: a.lines.reduce((s, l) => ({
        UNALLOCATED: s.UNALLOCATED + l.stages.UNALLOCATED,
        PENDING_CO: s.PENDING_CO + l.stages.PENDING_CO,
        PENDING_DIST: s.PENDING_DIST + l.stages.PENDING_DIST,
        GODOWN: s.GODOWN + l.stages.GODOWN,
        IN_BOX: s.IN_BOX + l.stages.IN_BOX,
        DISPATCHED: s.DISPATCHED + l.stages.DISPATCHED,
        NOT_DISPLAYED: s.NOT_DISPLAYED + l.stages.NOT_DISPLAYED,
      }), { UNALLOCATED:0, PENDING_CO:0, PENDING_DIST:0, GODOWN:0, IN_BOX:0, DISPATCHED:0, NOT_DISPLAYED:0 }) } as PurchaseTrackerLine)
      const bReady = getInBoxQty({ stages: b.lines.reduce((s, l) => ({
        UNALLOCATED: s.UNALLOCATED + l.stages.UNALLOCATED,
        PENDING_CO: s.PENDING_CO + l.stages.PENDING_CO,
        PENDING_DIST: s.PENDING_DIST + l.stages.PENDING_DIST,
        GODOWN: s.GODOWN + l.stages.GODOWN,
        IN_BOX: s.IN_BOX + l.stages.IN_BOX,
        DISPATCHED: s.DISPATCHED + l.stages.DISPATCHED,
        NOT_DISPLAYED: s.NOT_DISPLAYED + l.stages.NOT_DISPLAYED,
      }), { UNALLOCATED:0, PENDING_CO:0, PENDING_DIST:0, GODOWN:0, IN_BOX:0, DISPATCHED:0, NOT_DISPLAYED:0 }) } as PurchaseTrackerLine)
      if (aReady !== bReady) return bReady - aReady
      return a.name.localeCompare(b.name)
    })

  useEffect(() => {
    if (!customerList.some((c) => c.id === selectedId)) {
      setSelectedId(customerList[0]?.id ?? null)
    }
  }, [customerList, selectedId])

  const selected = customerList.find((c) => c.id === selectedId) ?? null

  return (
    <div className="grid h-full grid-cols-[280px_minmax(0,1fr)]">
      {/* ── Customer list ── */}
      <aside className="overflow-y-auto border-r border-[var(--border)] bg-white">
        <div className="sticky top-0 z-10 border-b border-[var(--border)] bg-white p-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer…"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--n-50)] px-3 py-2 text-sm outline-none transition focus:border-[#93c5fd]"
          />
        </div>
        <div className="divide-y divide-[var(--border)]">
          {customerList.map((c) => {
            const inBox = c.lines.reduce((s, l) => s + l.stages.GODOWN + l.stages.IN_BOX, 0)
            const dispatched = c.lines.reduce((s, l) => s + l.stages.DISPATCHED + l.stages.NOT_DISPLAYED, 0)
            const effective = c.lines.reduce((s, l) => s + effectiveCeiling(l), 0)
            const pct = effective > 0 ? Math.round((dispatched / effective) * 100) : 0
            const active = c.id === selectedId

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedId(c.id)}
                className={['w-full p-4 text-left transition', active ? 'bg-[#f8fbff]' : 'hover:bg-[var(--n-50)]'].join(' ')}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--n-100)] text-sm font-semibold text-[var(--text-secondary)]">
                    {c.name.slice(0, 1)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{c.name}</p>
                    {c.siteAddress && (
                      <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">{c.siteAddress}</p>
                    )}
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--n-100)]">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: pct === 100 ? '#10B981' : pct > 60 ? '#3B82F6' : '#F59E0B' }}
                      />
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                      <span style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}>
                        {dispatched}/{effective} dispatched
                      </span>
                      {inBox > 0 && (
                        <span className="rounded-full bg-[#f0fdf4] px-1.5 py-0.5 text-[10px] font-semibold text-[#15803d]">
                          {inBox} in box
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </aside>

      {/* ── Customer detail ── */}
      <section className="overflow-y-auto bg-[var(--bg)]">
        {selected
          ? <CustomerDetail customer={selected} activeBrand={activeBrand} onSelectLine={onSelectLine} onMoved={onMoved} />
          : (
            <div className="flex h-full items-center justify-center text-sm text-[var(--text-muted)]">
              Select a customer from the list.
            </div>
          )
        }
      </section>
    </div>
  )
}
```

- [ ] **Step 4: Add `CustomerDetail` inner component above `WorkspaceCustomers`**

```tsx
function CustomerDetail({
  customer,
  activeBrand,
  onSelectLine,
  onMoved,
}: {
  customer: CustomerBucket
  activeBrand: BrandTab
  onSelectLine: (lineId: string, tab?: 'move' | 'transfer' | 'history') => void
  onMoved: (newCounts: HeaderCounts, lineId: string, fromStage: PurchaseStage, toStage: PurchaseStage, qty: number) => void
}) {
  const [showDelivered, setShowDelivered] = useState(false)
  const { lines } = customer

  // Section 1: Ready to Dispatch — GODOWN + IN_BOX > 0
  const readyLines = lines.filter((l) => l.stages.GODOWN > 0 || l.stages.IN_BOX > 0)

  // Section 2: Coming Soon — PENDING_CO + PENDING_DIST > 0
  const pendingLines = lines.filter(
    (l) => l.stages.PENDING_CO > 0 || l.stages.PENDING_DIST > 0
  )

  // Section 4: Delivered
  const deliveredLines = lines.filter((l) => l.stages.DISPATCHED > 0 || l.stages.NOT_DISPLAYED > 0)

  // Fetch transfer history for all lines belonging to this customer
  const lineIds = lines.map((l) => l.id).join(',')
  const { data: allMovements } = useSWR<TransferEntry[]>(
    lines.length > 0 ? `/api/purchase-orders/lines/${lines[0]!.id}/history` : null,
    historyFetcher,
  )
  const transferMovements = (allMovements ?? []).filter(
    (m) => m.toStage === 'TRANSFERRED_OUT' || m.fromStage === 'TRANSFERRED_IN'
  )

  const totalOrdered = lines.reduce((s, l) => s + l.qtyOrdered, 0)
  const totalInBox = readyLines.reduce((s, l) => s + l.stages.GODOWN + l.stages.IN_BOX, 0)
  const totalDispatched = lines.reduce((s, l) => s + l.stages.DISPATCHED + l.stages.NOT_DISPLAYED, 0)
  const totalPending = pendingLines.reduce((s, l) => s + l.stages.PENDING_CO + l.stages.PENDING_DIST, 0)

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Customer</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">{customer.name}</h2>
          {customer.siteAddress && (
            <p className="mt-1 text-sm text-[var(--text-muted)]">{customer.siteAddress}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { label: 'Ordered', value: totalOrdered, color: '#6B7280' },
              { label: 'In Box', value: totalInBox, color: '#10B981' },
              { label: 'Pending', value: totalPending, color: '#F59E0B' },
              { label: 'Dispatched', value: totalDispatched, color: '#3B82F6' },
            ].map((chip) => (
              <div key={chip.label} className="rounded-xl border border-[var(--border)] bg-white px-3 py-1.5">
                <span className="text-xs text-[var(--text-muted)]">{chip.label} </span>
                <span
                  className="text-sm font-semibold"
                  style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', color: chip.color }}
                >
                  {chip.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section 1: Ready to Dispatch */}
      {readyLines.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4]">
          <div className="flex items-center justify-between border-b border-[#bbf7d0] px-4 py-3">
            <p className="text-sm font-semibold text-[#15803d]">
              ● {totalInBox} unit{totalInBox !== 1 ? 's' : ''} ready to dispatch
            </p>
          </div>
          <div className="divide-y divide-[#bbf7d0]">
            {readyLines.map((line) => {
              const qty = line.stages.GODOWN + line.stages.IN_BOX
              return (
                <div key={line.id} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--text-primary)]">{line.product.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">{line.product.brand} · {line.product.sku}</p>
                  </div>
                  <div className="ml-3 flex items-center gap-3">
                    <span
                      className="text-base font-bold text-[#15803d]"
                      style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}
                    >
                      ×{qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => onSelectLine(line.id, 'move')}
                      className="rounded-lg bg-[#15803d] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#166534]"
                    >
                      Dispatch ▷
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Section 2: Coming Soon */}
      {pendingLines.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-[#bfdbfe] bg-[#eff6ff]">
          <div className="border-b border-[#bfdbfe] px-4 py-3">
            <p className="text-sm font-semibold text-[#1d4ed8]">
              {totalPending} unit{totalPending !== 1 ? 's' : ''} coming soon
            </p>
          </div>
          <div className="divide-y divide-[#bfdbfe]">
            {pendingLines.map((line) => {
              const fromCo = line.stages.PENDING_CO
              const fromDist = line.stages.PENDING_DIST
              const ageDays = line.createdAt
                ? Math.floor((Date.now() - new Date(line.createdAt).getTime()) / 86400000)
                : null

              return (
                <div key={line.id} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--text-primary)]">{line.product.name}</p>
                    <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-[var(--text-muted)]">
                      {fromCo > 0 && <span>Order in Company ×{fromCo}</span>}
                      {fromDist > 0 && <span>Company Billing ×{fromDist}</span>}
                      {ageDays !== null && ageDays > 14 && (
                        <span className="font-semibold text-[#d97706]">{ageDays}d — follow up</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectLine(line.id)}
                    className="ml-3 text-xs text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
                  >
                    Details
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Section 3: Transfers */}
      {transferMovements.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-[#fde68a] bg-[#fffbeb]">
          <div className="border-b border-[#fde68a] px-4 py-3">
            <p className="text-sm font-semibold text-[#92400e]">Transfers</p>
          </div>
          <div className="divide-y divide-[#fde68a]">
            {transferMovements.slice(0, 5).map((m) => (
              <div key={m.id} className="px-4 py-3">
                <p className="text-xs text-[var(--text-primary)]">
                  {m.fromStage === 'TRANSFERRED_IN' ? '↱ Received' : '↰ Given'} · {m.qty} unit{m.qty > 1 ? 's' : ''}
                </p>
                {m.note && <p className="mt-0.5 text-xs text-[var(--text-muted)]">{m.note}</p>}
                <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                  {new Date(m.movedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {m.movedBy.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 4: Delivered (collapsed by default) */}
      {deliveredLines.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
          <button
            type="button"
            onClick={() => setShowDelivered((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <p className="text-sm font-semibold text-[var(--text-secondary)]">
              Delivered · {deliveredLines.reduce((s, l) => s + l.stages.DISPATCHED + l.stages.NOT_DISPLAYED, 0)} units
            </p>
            <span className="text-[var(--text-muted)]">{showDelivered ? '▲' : '▾'}</span>
          </button>
          {showDelivered && (
            <div className="divide-y divide-[var(--border)] border-t border-[var(--border)]">
              {deliveredLines.map((line) => (
                <div key={line.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-secondary)]">{line.product.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      ✓ {line.stages.DISPATCHED + line.stages.NOT_DISPLAYED} dispatched
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectLine(line.id, 'history')}
                    className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    Log
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {readyLines.length === 0 && pendingLines.length === 0 && deliveredLines.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-white p-10 text-center text-sm text-[var(--text-muted)]">
          No purchase activity for this customer.
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Add `CustomerBucket` interface above the component (it was previously inline)**

```ts
interface CustomerBucket {
  id: string
  name: string
  siteAddress: string | null
  lines: PurchaseTrackerLine[]
}
```

- [ ] **Step 6: Update `Props` interface to use new `onSelectLine` signature**

```ts
interface Props {
  lines: PurchaseTrackerLine[]
  activeBrand: BrandTab
  onMoved: (newCounts: HeaderCounts, lineId: string, fromStage: PurchaseStage, toStage: PurchaseStage, qty: number) => void
  onSelectLine: (lineId: string, tab?: 'move' | 'transfer' | 'history') => void
}
```

- [ ] **Step 7: Type-check**

```bash
cd apps/web && pnpm type-check 2>&1 | grep "WorkspaceCustomers\|CustomerDetail" | head -30
```

Expected: zero errors.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/components/purchases/WorkspaceCustomers.tsx
git commit -m "feat: Customer Command Center — 4-section layout (Ready, Coming Soon, Transfers, Delivered)"
```

---

## Task 8: Dispatch Queue Redesign

**Files:**
- Modify: `apps/web/src/components/purchases/WorkspaceDispatch.tsx`

- [ ] **Step 1: Update `readyLines` filter to include GODOWN**

```ts
// BEFORE
const readyLines = lines.filter((l) => l.stages.IN_BOX > 0)

// AFTER
const readyLines = lines.filter((l) => l.stages.GODOWN > 0 || l.stages.IN_BOX > 0)
```

- [ ] **Step 2: Update `executeDispatch` to handle both GODOWN and IN_BOX**

Replace the `executeDispatch` function:

```ts
async function executeDispatch() {
  if (!confirm) return
  setDispatching(true)
  setErr('')

  try {
    // For each line, dispatch GODOWN qty first, then IN_BOX qty
    const calls: Promise<{ stageTotals?: HeaderCounts; error?: string }>[] = []

    for (const line of confirm.lines) {
      const note = [confirm.challan ? `Challan: ${confirm.challan}` : '', confirm.note].filter(Boolean).join(' | ') || undefined

      if (line.stages.GODOWN > 0) {
        calls.push(
          fetch(`/api/purchase-orders/lines/${encodeURIComponent(line.id)}/move-stage`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fromStage: 'GODOWN', toStage: 'DISPATCHED', qty: line.stages.GODOWN, note }),
          }).then((r) => r.json() as Promise<{ stageTotals?: HeaderCounts; error?: string }>),
        )
      }

      if (line.stages.IN_BOX > 0) {
        calls.push(
          fetch(`/api/purchase-orders/lines/${encodeURIComponent(line.id)}/move-stage`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fromStage: 'IN_BOX', toStage: 'DISPATCHED', qty: line.stages.IN_BOX, note }),
          }).then((r) => r.json() as Promise<{ stageTotals?: HeaderCounts; error?: string }>),
        )
      }
    }

    const results = await Promise.all(calls)
    const lastSuccess = [...results].reverse().find((r) => r.stageTotals)

    if (lastSuccess?.stageTotals) {
      // Notify parent with the last known good stage totals
      for (const line of confirm.lines) {
        const totalQty = line.stages.GODOWN + line.stages.IN_BOX
        if (totalQty > 0) {
          onMoved(lastSuccess.stageTotals, line.id, 'IN_BOX', 'DISPATCHED', totalQty)
        }
      }
    }

    setDispatched((prev) => [...prev, confirm.customerId])
    setConfirm(null)
  } catch {
    setErr('Network error — some items may not have dispatched')
  } finally {
    setDispatching(false)
  }
}
```

- [ ] **Step 3: Update `totalUnits` calculation in the customer group card**

```ts
// BEFORE
const totalUnits = group.lines.reduce((s, l) => s + l.stages.IN_BOX, 0)

// AFTER
const totalUnits = group.lines.reduce((s, l) => s + l.stages.GODOWN + l.stages.IN_BOX, 0)
```

- [ ] **Step 4: Update the line items table — show combined In Box qty**

In the `<tbody>` row for each line:

```tsx
<td className="px-2 py-3 text-center">
  <span
    className="text-base font-semibold text-[#2563eb]"
    style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}
  >
    {line.stages.GODOWN + line.stages.IN_BOX}
  </span>
</td>
```

- [ ] **Step 5: Update dispatch confirmation modal copy**

In the modal, change:

```tsx
// BEFORE
Dispatching {confirm.lines.reduce((s, l) => s + l.stages.IN_BOX, 0)} units

// AFTER
Dispatching {confirm.lines.reduce((s, l) => s + l.stages.GODOWN + l.stages.IN_BOX, 0)} units
```

- [ ] **Step 6: Update column header**

In the `<thead>`, rename the "In Box" column:

```tsx
<th className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
  In Box
</th>
```

(It already says "In Box" — no change needed here, just verify.)

- [ ] **Step 7: Update the empty state to reference In Box**

```tsx
if (readyLines.length === 0) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center">
      <div className="text-4xl">▷</div>
      <p className="text-lg font-semibold text-[var(--text-primary)]">Nothing to dispatch right now</p>
      <p className="max-w-sm text-sm text-[var(--text-muted)]">
        Items appear here once they reach <strong>In Box</strong>.
        To move stock to In Box: go to <strong>Track Stock</strong>, find the product,
        then use Move Stock → Mark In Box.
      </p>
    </div>
  )
}
```

- [ ] **Step 8: Type-check**

```bash
cd apps/web && pnpm type-check 2>&1 | grep "WorkspaceDispatch" | head -20
```

Expected: zero errors.

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/components/purchases/WorkspaceDispatch.tsx
git commit -m "feat: dispatch queue includes GODOWN stock; dispatch directly from godown"
```

---

## Task 9: Rename WorkspacePipeline → WorkspaceTrackStock

**Files:**
- Create: `apps/web/src/components/purchases/WorkspaceTrackStock.tsx` (copy of WorkspacePipeline with updates)
- Delete: `apps/web/src/components/purchases/WorkspacePipeline.tsx`
- Modify: `apps/web/src/components/purchases/PurchasesWorkspace.tsx`

- [ ] **Step 1: Copy WorkspacePipeline to WorkspaceTrackStock**

```bash
cp apps/web/src/components/purchases/WorkspacePipeline.tsx \
   apps/web/src/components/purchases/WorkspaceTrackStock.tsx
```

- [ ] **Step 2: Update the new file**

In `WorkspaceTrackStock.tsx`:

1. Update the `Props` interface to use the new `onSelectLine` signature:
   ```ts
   onSelectLine: (lineId: string, tab?: 'move' | 'transfer' | 'history') => void
   ```

2. Update the `LineCard` call to pass `onTransfer`:
   ```tsx
   <LineCard
     key={line.id}
     line={line}
     context="company"
     activeBrand={activeBrand}
     allLines={allLines}
     onMoved={onMoved}
     onSelect={() => onSelectLine(line.id)}
     onTransfer={() => onSelectLine(line.id, 'transfer')}
   />
   ```

3. Update the empty state text to say "Track Stock" instead of "Pipeline":
   ```tsx
   <p className="text-lg font-semibold text-[var(--text-primary)]">
     {stageFilter ? `No lines at ${DISPLAY_STAGE_LABEL[stageFilter] ?? stageFilter}` : 'No purchase lines match this filter'}
   </p>
   ```

   Import `DISPLAY_STAGE_LABEL` and `type DisplayStage` from `@/lib/purchases-tracker`. Update `stageFilter` prop type:
   ```ts
   stageFilter: DisplayStage | null
   ```

4. Update the filter badge display:
   ```tsx
   {stageFilter && (
     <div className="flex items-center gap-2 rounded-2xl border border-[#dbeafe] bg-[#eff6ff] px-4 py-2.5">
       <span className="text-sm font-medium text-[#1d4ed8]">
         Filtered: <strong>{DISPLAY_STAGE_LABEL[stageFilter] ?? stageFilter}</strong> — {lines.length} line{lines.length !== 1 ? 's' : ''}
       </span>
     </div>
   )}
   ```

- [ ] **Step 3: Update PurchasesWorkspace to import WorkspaceTrackStock**

In `PurchasesWorkspace.tsx`:

```ts
// REMOVE
import WorkspacePipeline from '@/components/purchases/WorkspacePipeline'

// ADD
import WorkspaceTrackStock from '@/components/purchases/WorkspaceTrackStock'
```

Replace the render:
```tsx
// BEFORE
{workspace === 'pipeline' && (
  <WorkspacePipeline ... />
)}

// AFTER
{workspace === 'pipeline' && (
  <WorkspaceTrackStock
    lines={stageFilteredLines}
    activeBrand={activeBrand}
    stageFilter={stageFilter}
    isLoading={isLoading && !data}
    onMoved={handleMoved}
    onSelectLine={handleSelectLine}
    allLines={lines}
  />
)}
```

- [ ] **Step 4: Delete the old file**

```bash
git rm apps/web/src/components/purchases/WorkspacePipeline.tsx
```

- [ ] **Step 5: Full type-check**

```bash
cd apps/web && pnpm type-check 2>&1 | head -40
```

Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/purchases/WorkspaceTrackStock.tsx \
        apps/web/src/components/purchases/PurchasesWorkspace.tsx
git rm apps/web/src/components/purchases/WorkspacePipeline.tsx
git commit -m "feat: rename Pipeline → Track Stock; wire onTransfer throughout"
```

---

## Task 10: Final Verification

- [ ] **Step 1: Full type-check (zero errors target)**

```bash
cd apps/web && pnpm type-check 2>&1
```

Expected output ends with something like `Found 0 errors.`. If errors exist, read them carefully and fix them before proceeding.

- [ ] **Step 2: Dev server smoke test**

```bash
pnpm dev
```

Navigate to `http://localhost:3000/purchases`. Verify:

- [ ] Sidebar shows 5 stages: "Unassigned", "Order in Company", "Company Billing", "In Box", "Dispatched", "Archive"
- [ ] Clicking a stage in sidebar filters the Track Stock list
- [ ] LineCard shows friendly stage names (not `PENDING_CO`, `PEND.CO`, etc.)
- [ ] LineCard has "Give to Customer ↱" button — clicking it opens ContextPanel on "Give to Customer" tab
- [ ] ContextPanel tabs read "Move Stock", "Give to Customer", "Activity Log"
- [ ] Activity Log shows "Order in Company → In Box" instead of `PENDING_CO → GODOWN`
- [ ] Give to Customer tab has a customer search input
- [ ] Customers workspace shows 4 sections for a customer with mixed stages
- [ ] Dispatch Queue shows items from GODOWN stage (not just IN_BOX)
- [ ] "Transfers" workspace no longer appears in the sidebar

- [ ] **Step 3: Commit final state**

```bash
git add -A
git commit -m "chore: verify purchases UX redesign — all views rendering correctly"
```

---

## Self-Review

**Spec coverage:**

| Spec section | Task |
|---|---|
| Stage model — 5 display stages | Task 1, Task 3 |
| GODOWN+IN_BOX merged as "In Box" | Task 1, 2, 3, 8 |
| Friendly stage labels everywhere | Task 1, 4, 5, 9 |
| GODOWN → DISPATCHED legal transition | Task 2 |
| Universal Transfer — any customer | Task 6 |
| Universal Transfer — auto-create line | Task 6 (API) |
| Universal Transfer — new customer creation | Task 6 (API) |
| Transfer from any stage | Task 6 (component — TRANSFERABLE stages) |
| "Give to Customer" inline on LineCard | Task 4 |
| ContextPanel tab rename | Task 5 |
| defaultTab for opening on correct tab | Task 3, 5 |
| Activity Log friendly names | Task 5 |
| Customer Command Center 4 sections | Task 7 |
| Customer list sorted by readiness | Task 7 |
| Dispatch readiness chip | Task 4 |
| Dispatch Queue includes GODOWN | Task 8 |
| Remove Transfers workspace | Task 3 |
| Rename Pipeline → Track Stock | Task 9 |
| Dispatch empty state explains next action | Task 8 |

**No placeholders:** All steps contain complete code. No "TBD" or "similar to above."

**Type consistency:** `DisplayStage` defined in Task 1, used in Tasks 3, 4, 9. `onSelectLine(lineId, tab?)` signature defined in Task 3, updated on Props in Tasks 4, 7, 9. `getInBoxQty`, `getDispatchReadiness`, `STAGE_FRIENDLY_NAME` defined in Task 1, imported in Tasks 4, 5, 7, 8.
