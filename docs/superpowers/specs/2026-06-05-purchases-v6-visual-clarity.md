# Purchases V6 — Visual Clarity Sprint

**Date:** 2026-06-05
**Goal:** A warehouse worker must understand inventory in under 5 seconds.
**Status:** Approved (rev 2 — 5 user adjustments incorporated)

---

## Core Principle

Every inventory-facing view must show:
- Product image · name · finish
- Customer · project
- Where stock currently is (derived from movement history)
- How long since last touch
- One unambiguous next action

---

## Adjustment 1: Location via StageMovement (not Line Item)

**Rejected approach:** `POLineItem.boxLocation: string`

**Reason:** A line moves — Shelf A3 → Box 14 → Truck 2. Storing location on the line
corrupts old data on each move.

**Correct approach:** Location is a property of a `StageMovement`, not a line.

```
StageMovement
├── location: string | null   ← new field
├── fromStage
├── toStage
├── qty
├── note
└── createdAt
```

`currentLocation` is **derived**: the `location` field from the most recent movement
where `location IS NOT NULL`.

**Implementation:**
- Add `location: string | null` to the `Movement` type in `ContextPanel.tsx` and the
  API history response
- Update `/api/purchase-orders/lines/[id]/move-stage` to accept and persist
  `location?: string` in the request body (separate from `note`)
- The "Mark Packed" UI sends `location` explicitly (not embedded in `note` text)
- Update `PurchaseTrackerLine` to carry `currentLocation: string | null` (derived on
  the server from latest movement with non-null location)
- Mock: `MockPOLineItem` gets `currentLocation: string | null` and mock movements
  gain a `location` field. Pre-populate for GODOWN/IN_BOX items.

---

## Adjustment 2: Export Matches Visible Filters

Export emits **exactly what the user currently sees** — current filters + search applied.

```ts
// WorkspaceTrackStock passes the already-filtered array:
exportToCSV(visibleLines, { brand: activeBrand, status: statusFilter })
```

**CSV columns:**
`Product Name, SKU, Finish, Brand, Customer, Project, Stage, Qty Ordered,
Qty at Stage, Current Location, Last Activity, Age (days)`

No new npm dependency — use client-side Blob + `<a download>`.

---

## Adjustment 3: Product Images Everywhere

All inventory-facing views get product thumbnails:

| View | Size | Where |
|------|------|-------|
| WorkspaceTrackStock rows | 64×64 | Left of each row |
| WorkspaceDispatch ready rows | 48×48 | Left of each line |
| WorkspaceDispatch blocked rows | 48×48 | Left of each line |
| WorkspaceCustomers — CustomerDetail line rows | 48×48 | Left of each line in all 4 sections (ready/packing/pending/delivered) |

CustomerCard sidebar list — no image (too small, text scan is faster there).

---

## Adjustment 4: Stage Tracker Shows Counts + Color

`StageTracker` is functional, not decorative. It answers:
> "Where is this stock right now?"

**Design:**
- 5 segments: `Order Placed → Distributor → Godown → Packed → Dispatched`
- Each segment = dot + label + count badge
- Colors:

| State | Color |
|-------|-------|
| 0 units | Grey |
| Has units, not overdue | Blue (active) |
| Completed (all dispatched) | Green |
| Blocked (>7d at dist / >14d at CO) | Amber |
| Overdue (>21d at godown/packed) | Red |

- Count badge shows quantity at that stage (`line.stages[stage]`)
- Zero-count stages are dimmed but still rendered (shows the full pipeline)

```tsx
<StageTracker line={line} />
// e.g. renders: ○ 0 → ◉ 4 → ● 6 → ○ 0 → ○ 0
//               Ordered  Dist  Godown  Packed  Done
```

---

## Adjustment 5: Last Activity on Every Row

Answers: "When was this stock last touched?"

- `PurchaseTrackerLine` gains `lastActivityAt: string | null`
- Source: `MAX(movedAt)` across all movements for that line
- Display: relative humanized time — "2h ago", "3d ago", "12d ago"
- Shown as a small muted chip on each row, after the stage tracker column
- Highlight rule: grey if <7d, amber if 7–14d, red if >14d with no dispatch

**Mock implementation:** Add `lastActivityAt` to `MockPOLineItem`; pre-populate with
plausible ISO strings (mix of recent and stale).

---

## Visual Smart Row Layout (revised)

Grid columns for WorkspaceTrackStock:

```
[64px thumb] [Product+Finish] [Customer+Project] [StageTracker+counts] [Qty] [Location] [Last Activity] [Next Action]
```

Section grouping replaces flat filter-then-list:

1. **● Ready to Dispatch** (green) — `IN_BOX > 0`
2. **■ Awaiting Packing** (blue) — `GODOWN > 0`, `IN_BOX === 0`
3. **⏳ Waiting — External** (amber) — `PENDING_DIST > 0` or `PENDING_CO > 0` only

Filter chips + Excel Export button in sticky header above sections.

---

## Implementation Order

| Phase | What |
|-------|------|
| 1 | `StageTracker.tsx` — counts + color rules |
| 2 | Visual stock rows in `WorkspaceTrackStock.tsx` |
| 3 | Location tracking via StageMovement — type + API + mock |
| 4 | `lastActivityAt` — type + API + mock + row display |
| 5 | Filtered CSV export |
| 6 | Dispatch thumbnails (`WorkspaceDispatch.tsx`) |
| 7 | Customer workspace thumbnails (`WorkspaceCustomers.tsx`) |

---

## Files Affected

| File | Change |
|------|--------|
| `lib/purchases-tracker.ts` | Add `currentLocation: string \| null`, `lastActivityAt: string \| null` to `PurchaseTrackerLine`; add `location` to `Movement` type |
| `lib/mock/procurement-data.ts` | Add `currentLocation`, `lastActivityAt` to mock line items |
| `lib/purchases-fallback.ts` | Surface new fields; update move-stage to accept + store `location` |
| `app/api/purchase-orders/lines/route.ts` | Include `currentLocation`, `lastActivityAt` per line |
| `app/api/purchase-orders/lines/[id]/move-stage/route.ts` | Accept `location?: string` in body; persist to movement; re-derive `currentLocation` |
| `app/api/purchase-orders/lines/[id]/history/route.ts` | Return `location` field on each movement |
| `components/purchases/StageTracker.tsx` | **New** — 5-segment tracker with counts + color rules |
| `components/purchases/WorkspaceTrackStock.tsx` | Full redesign — visual rows + section grouping + export button |
| `components/purchases/WorkspaceDispatch.tsx` | Add 48px thumbnail to ready + blocked rows |
| `components/purchases/WorkspaceCustomers.tsx` | Add 48px thumbnail to all line rows in CustomerDetail |

---

## Out of Scope

- Real database — still mock-backed
- PDF export
- POS changes
- Manufacturing module
