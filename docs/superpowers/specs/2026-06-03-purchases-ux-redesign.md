# Purchases UX Redesign — Staff-First Design Spec

**Date:** 2026-06-03
**Status:** Awaiting approval
**Goal:** A warehouse worker with almost no ERP experience can use Forge Purchases after 30 minutes of training.

---

## Design Principles

1. **No technical labels ever appear on screen.** Staff should never see `PENDING_CO`, `UNALLOCATED`, `NOT_DISPLAYED`.
2. **Every item tells you exactly what to do next.** No deduction required.
3. **Transfer goes to any customer, always.** No preconditions.
4. **One click to the most common action.** Dispatch staff should not navigate more than two clicks to dispatch.

---

## 1. Simplified Stage Model

### Problem

The current stage labels are internal engineering terminology. Staff confronting `PENDING_DIST`, `UNALLOCATED`, or `NOT_DISPLAYED` for the first time have no idea what to do.

### The 5 Operational Stages (+ 1 implicit)

DB stages are never removed — only the display layer changes. GODOWN and IN_BOX are both surfaced to staff as a single **"In Box"** stage. Staff never distinguishes between "arrived at godown" vs "packed in box" — both mean "we have it, it can be dispatched."

| Staff Sees | DB Stage(s) | Plain English Meaning |
|---|---|---|
| **Unassigned** | UNALLOCATED | Ordered but not yet tracked to any step |
| **Order in Company** | PENDING_CO | Order placed with the manufacturer |
| **Company Billing** | PENDING_DIST | Bill being processed with distributor |
| **In Box** | GODOWN + IN_BOX | Stock is with us — at godown or packed |
| **Dispatched** | DISPATCHED | Sent out to customer site |
| **Archive** | NOT_DISPLAYED | All dispatched items stored here — permanent record |

**Display rule:** Any item where `stages.GODOWN > 0` or `stages.IN_BOX > 0` shows under "In Box". The count shown = `GODOWN + IN_BOX`. Dispatch is allowed from either. The GODOWN → IN_BOX distinction remains in the DB for audit purposes but is invisible to staff.

### Stage Transition Labels

When staff moves stock, action buttons use plain language:

| Action | DB change | Button label |
|---|---|---|
| UNALLOCATED → PENDING_CO | Allocate to company order | "Mark as Ordered from Company" |
| PENDING_CO → PENDING_DIST | Move to billing stage | "Move to Company Billing" |
| PENDING_DIST → GODOWN | Mark received at godown | "Mark In Box" |
| GODOWN → IN_BOX | Internal pack step | (silent — no action needed from staff) |
| GODOWN or IN_BOX → DISPATCHED | Send to customer | "Dispatch" |
| DISPATCHED → NOT_DISPLAYED | Archive | "Move to Archive" |

The GODOWN → IN_BOX movement is an optional internal tracking step. It never appears as a required action for staff. The dispatch action fires from whichever of GODOWN/IN_BOX has stock.

### Sidebar Stage Filter (5 filters shown)

The left sidebar stage filter shows exactly 5 entries — no GODOWN row, no IN_BOX row:

```
STAGES
  ○  Unassigned         4
  ○  Order in Company   8
  ○  Company Billing    3
  ●  In Box            11   ← amber if any item > 14 days
  ○  Dispatched        47
  ○  Archive           23
```

### Urgency Display

- **Red dot** — In Box items older than 21 days ("Overdue — dispatch or follow up")
- **Amber dot** — In Box items 14–21 days old ("Getting late")
- **Blue dot** — Order in Company / Company Billing items older than 14 days ("Follow up with supplier")
- **Grey dot** — normal

---

## 2. Universal Transfer Workflow

### Problem

Current behaviour: "No eligible customers with allocations found" — the transfer UI only lets you redirect stock to a customer who *already has an allocation for the exact same product*. This blocks the most common real-world scenario: urgent site, staff needs to give stock to a customer who's never ordered that product.

### New Transfer Flow

**Trigger:** Any item at any stage (except Unassigned and Delivered) shows a "Give to Customer" button in its detail panel.

**Panel title:** "Give this stock to someone else"

```
Step 1: Who is getting this stock?

  [ Search customer or type a new name... ]
  
  ↓ Matching customers appear as you type:
  
  ● Mehta Architects         (existing — has 2 lines with you)
  ● Lodha Developers         (existing — no history for this product)
  + Create "Singh Interiors"  (new customer — will be created automatically)

Step 2: How many units?

  [ − ] [ 2 ] [ + ]   of 4 available at Godown

Step 3: Why?

  [ Site is urgent and needs stock now              ]
  Quick picks: "Urgent site" · "Customer on hold" · "Sample request"

[ Give Stock → ]
```

### What Happens Behind the Scenes

| Destination | System action |
|---|---|
| Existing customer, existing PO line for same product | Transfer between existing lines (current behaviour) |
| Existing customer, NO line for this product | Auto-creates a new POLineItem for that customer, then transfers |
| New customer (typed name) | Creates CRM contact + POLineItem, then transfers |

Staff never sees this complexity. They just pick a customer and confirm.

### API Changes Needed

The `/transfer` route currently requires `targetLineId`. New:

```
POST /api/purchase-orders/lines/[lineId]/transfer
Body:
  - targetLineId?     string   // existing line (legacy path)
  - targetCustomerId? string   // new path: auto-create line if needed
  - newCustomerName?  string   // new path: create customer + line
  - stage             string   // which stage stock comes from
  - qty               number
  - reason            string
```

**Auto-create logic:**
1. If `targetCustomerId` given but no POLineItem for that customer + product exists → create POLineItem with `qtyOrdered = 0, qtyTransferredIn = 0` then apply transfer (the effective ceiling after transfer = qty being sent)
2. If `newCustomerName` given → create CRM contact (minimal: name only) → then step 1

### Source Stage Constraint Removed

Currently transfers only work from allocated stages. New rule: **transfer works from any stage where qty > 0**, including UNALLOCATED. Unassigned stock can be redirected directly.

---

## 3. Purchases UX Redesign — Full Layout

### Workspace Renaming

| Old label | New label | Reason |
|---|---|---|
| Pipeline | **Track Stock** | "Pipeline" is developer terminology |
| Customers | **Customers** | Keep — operators understand this |
| Transfers | **REMOVED** | Fold into item detail panel; not a primary view |
| Dispatch | **Dispatch Queue** | Make the action explicit |

New sidebar workspace list:
```
WORKSPACES
  ◈  Track Stock         [badge: urgency count]
  ◎  Customers           
  ▷  Dispatch Queue      [badge: ready-to-dispatch count]
```

### Track Stock Workspace (was Pipeline)

Top-level view showing all stock grouped by brand. Each LineCard redesigned:

```
┌────────────────────────────────────────────────────────────┐
│ [Product Image]  GROHE Essence Basin Mixer Chrome          │
│                  SKU: 32628001   PO: BCH-PO-2026-041       │
│                  Customer: Mehta Architects                 │
│                                                            │
│  ● With Company  2   ● At Godown  1   ● Packed  0         │
│                                                            │
│  [Give to Customer ↱]  [Move Stage →]  [More ...]         │
└────────────────────────────────────────────────────────────┘
```

Changes from current LineCard:
- Stage chips show new friendly names
- Inline "Give to Customer" button (replaces the popover Transfer button)
- "Move Stage" button opens a simplified movement panel
- No technical stage codes ever rendered

### Item Detail Panel (Context Panel) Redesign

When staff clicks an item (right slide-in panel), tabs change:

| Old tab | New tab | Reason |
|---|---|---|
| Move | **Move Stock** | More descriptive |
| Transfer ↱ | **Give to Customer** | Plain language |
| History | **Activity Log** | Less technical |

**Move Stock tab (simplified):**

```
Where is this stock now?

● 2 units  [With Company]
● 1 unit   [At Godown]

Move:   [ 2 ]  units from [ With Company ▾ ]

→ Next step: Move to Billing
→ Or skip to: Arrived at Godown (if stock bypasses billing)

[Move Stock →]
```

Remove the technical "from stage / to stage" selector. Instead:
- Pre-select the earliest active stage as source
- Show the ONE natural next step prominently
- Allow skipping a stage (for irregular workflows) via "Or skip to:" 

**Give to Customer tab (replaces Transfer):**

Uses the Universal Transfer flow described in section 2.

**Activity Log tab:**

Replace stage codes with friendly names in history:
- ~~`PENDING_CO → GODOWN`~~ → "With Company → At Godown"
- ~~`TRANSFERRED_OUT`~~ → "Given to Lodha Developers (3 units)"
- ~~`TRANSFERRED_IN`~~ → "Received from Mehta Architects (1 unit)"

---

## 4. Customer Command Center

### Problem

Current customer detail is a flat list of LineCards. It doesn't answer the three questions a purchase manager asks daily:
- "What's ready to dispatch to this customer right now?"
- "What's still coming?"
- "What have we already sent them?"

### New Customer Detail Layout

```
┌─ CUSTOMER HEADER ──────────────────────────────────────────┐
│  Mehta Architects                                           │
│  Andheri East Site, Mumbai                                  │
│                                                             │
│  [12 ordered] [5 dispatched] [4 pending] [3 ready ●]       │
│                                                             │
│  Progress: ████████░░ 42%                     [Export ↓]   │
└────────────────────────────────────────────────────────────┘

┌─ SECTION 1: READY TO DISPATCH (green header) ──────────────┐
│  3 items packed and waiting — dispatch these now            │
│                                                             │
│  GROHE Essence Basin Mixer  ×2  [Dispatch ▷]               │
│  Vitra S20 WC Pan            ×1  [Dispatch ▷]               │
│                                                             │
│  [Dispatch All for Mehta Architects →]                     │
└────────────────────────────────────────────────────────────┘

┌─ SECTION 2: COMING SOON (blue header) ─────────────────────┐
│  4 items in progress                                        │
│                                                             │
│  GROHE Rapido Smart         ×2  ● Order in Company (14d)   │
│  Axor Citterio Thermostatic ×2  ● Company Billing  (3d)    │
└────────────────────────────────────────────────────────────┘

┌─ SECTION 3: TRANSFERRED (amber header) ────────────────────┐
│  Stock moved to/from this customer                          │
│                                                             │
│  ↱ Received from Lodha Developers — GROHE Sink ×1 (2 Jun)  │
│  ↰ Given to Singh Interiors — Vitra Mirror ×1 (28 May)     │
└────────────────────────────────────────────────────────────┘

┌─ SECTION 4: DELIVERED  [▾ collapse] ──────────────────────┐
│  5 items sent to customer                                   │
│                                                             │
│  GROHE Grohtherm 800XL   ×2   ✓ Dispatched  (15 May)      │
│  Hansgrohe Raindance S   ×3   ✓ Dispatched  (20 May)      │
└────────────────────────────────────────────────────────────┘
```

### Section Rules

**Section 1 — Ready to Dispatch:**
- Shows any line where `stages.GODOWN > 0 OR stages.IN_BOX > 0`
- Each line shows inline "Dispatch ▷" button → triggers single-line dispatch
- "Dispatch All" button at top → opens dispatch confirmation for ALL in-box items for this customer
- Section header turns **red** if any item has been in box for > 7 days

**Section 2 — Coming Soon:**
- Shows lines where `PENDING_CO + PENDING_DIST > 0`
- Sub-status shown inline: "Order in Company", "Company Billing"
- Age shown in parentheses — items > 14 days shown in amber

**Section 3 — Transferred:**
- Shows ALL transfer movements (in and out) for this customer
- Sourced from StageMovement audit log filtered by TRANSFERRED_IN / TRANSFERRED_OUT
- Simple timeline, no technical codes

**Section 4 — Delivered:**
- Shows DISPATCHED + NOT_DISPLAYED items
- Collapsed by default (keeps focus on active items)
- Expandable with one click

### Customer List (Left Sidebar) Sorting

Sort order (priority):
1. Customers with "Ready to Dispatch" items first (most urgent)
2. Within that: most days waiting (oldest first)
3. Customers with no active items: alphabetical at bottom

Visual badges on each customer list item:
- Green pill: "3 ready" (IN_BOX count)
- Amber pill: "2 at godown" (GODOWN count, needs packing)
- No badge: no action needed

---

## 5. Dispatch Workflow Redesign

### Problem

Current Dispatch workspace: shows only IN_BOX items. Operators don't know what to do when the queue is empty — they don't understand what step is blocking dispatch.

### Dispatch Readiness Indicator

Every purchase line (in every workspace) shows a **Dispatch Readiness** chip — one of four states:

| Label | Colour | Condition | What to do |
|---|---|---|---|
| Waiting from Supplier | Grey | PENDING_CO or PENDING_DIST | Chase the company |
| In Box — Ready | Green | GODOWN > 0 or IN_BOX > 0 | Create challan, dispatch |
| Dispatched | Faded green | DISPATCHED only | Nothing |
| Archived | Faded grey | NOT_DISPLAYED only | Archived |

No "Pack It" step. Anything in box is immediately dispatchable.

### Dispatch Queue Workspace

Single queue — no tabs needed. Every "In Box" item is ready to dispatch.

```
DISPATCH QUEUE — 3 customers, 11 units ready

┌─ MEHTA ARCHITECTS ──────────── ● 3 days in box ───────────┐
│  Site: Andheri East                         7 units total  │
│                                                            │
│  GROHE Essence Basin Mixer      ×3                        │
│  Vitra S20 WC Pan               ×2                        │
│  Axor Citterio Shower           ×2                        │
│                                                            │
│  Challan no.  [BCH-DC-2026-___]                           │
│  Note         [optional delivery note      ]               │
│                                                            │
│  [Dispatch All to Mehta Architects →]                     │
└────────────────────────────────────────────────────────────┘

┌─ LODHA DEVELOPERS ──────────── ● 1 day in box ────────────┐
│  ...same pattern...                                        │
└────────────────────────────────────────────────────────────┘
```

**Empty state (queue is empty):**
```
Nothing to dispatch right now.
Items appear here once they reach In Box.

To move stock to In Box:
  1. Go to Track Stock
  2. Find the product
  3. Click the item → Move Stock → "Mark In Box"
```

Changes from current:
- Challan field inline per customer (not in a modal)
- No confirmation modal for small batches — just one button
- Modal only for qty > 10 (safety)
- Sorted by days-in-box (oldest first)
- "In Box" days = age since item entered GODOWN or IN_BOX stage

### Dispatch Confirmation (for large orders)

Only triggered when total units > 10. Single modal, not per-line:

```
Dispatching 14 units to Mehta Architects

Items:
  GROHE Essence Basin Mixer  ×3
  Vitra S20 WC Pan           ×2
  ...

Challan no. [already filled]
Note        [optional]

[Confirm Dispatch of 14 units →]   [Cancel]
```

---

## 6. Navigation Cleanup Plan

### Audit: What Is Actually Working

| Nav Item | Status | Finding |
|---|---|---|
| Dashboard | ✅ Working | KPIs, charts, activity |
| Quotations | ✅ Working | Full quotation builder |
| Purchases | ✅ Working | Pipeline, Customers, Transfers, Dispatch workspaces |
| Payments | ✅ Working | Payment recording |
| Follow-ups | ✅ Working | Overdue badge, follow-up queue |
| Price Lists | ✅ Working | Full price list management |
| Users | ✅ Working | User management |
| Audit Center | ✅ Working | Audit log |
| Settings | 🚧 Placeholder | "Module is being built" state |

### Dead / Confusing Actions

**Inside Purchases:**
- `/purchases/new` link (New PO button in topbar) — route exists but unclear if it works; appears in topbar but not in sidebar
- "Transfers" workspace — confusing as a standalone view; operators don't think "I'm going to the Transfers workspace"; they want to transfer FROM wherever they are

**Inside Quotations:**
- Quotations have a "Lock" action — locking a quotation is not obvious to staff what it means or when to use it

**Inside Context Panel (item detail):**
- Tab labels "Move" and "Transfer ↱" — the ↱ symbol is not intuitive; "Transfer" is a technical word

### Proposed Changes (Navigation)

**1. Remove "Transfers" workspace from sidebar.**

Transfers are always initiated from an item's detail panel. There is no operational reason to have a standalone transfers view. Remove the workspace tab. The WorkspaceTransfers component can be kept as a reference for history reporting but should not appear in the sidebar.

**2. Rename workspaces.**

```
WORKSPACES
  ◈  Track Stock         (was "Pipeline")
  ◎  Customers
  ▷  Dispatch Queue      (was "Dispatch")
```

**3. New PO button placement.**

Move "+ New PO" from the topbar to a floating action at the bottom of the sidebar, or integrate into the Track Stock workspace as a prominent empty-state CTA. Topbar should be search-only.

**4. PurchasesNav (layout.tsx) tab removal.**

`/purchases/layout.tsx` currently injects a tab bar. Review and remove any tabs that now point to removed workspaces or non-functional routes.

**5. Quotation "Lock" label.**

Rename "Lock" → "Finalise Quotation" with a tooltip: "Finalising prevents further edits. Send the PDF to the customer first."

**6. Settings placeholder.**

Settings route shows "module being built" — add a link to the Configure section items (Price Lists, Users) so it's not a dead end.

---

## 7. Staff-First Operational Workflow

### Day-in-the-life: Purchase Manager

**Morning check (10 min):**
1. Open Forge → Purchases → **Track Stock**
2. Glance at left sidebar — any red dots? Those are overdue.
3. Click the "With Company" stage count → filtered view of all items pending from manufacturers
4. For anything older than 14 days: note the vendor name from the line card, call to follow up
5. Click "At Godown" → see what's arrived but not yet packed
6. For each: click the item → "Pack in Box" → done

**When a delivery arrives (5 min):**
1. Purchases → Track Stock
2. Search the product name or SKU
3. Click the item
4. In the detail panel: "Move Stock" tab
5. "Mark In Box" (moves from Order in Company / Company Billing → In Box)
6. Qty = how many actually arrived
7. Done — item now appears in Dispatch Queue

**When stock needs to go to urgent customer (3 min):**
1. Find the item in Track Stock
2. Click "Give to Customer" (visible on the LineCard inline, or in detail panel)
3. Type the urgent customer's name
4. Select qty + reason ("Urgent site requirement")
5. Confirm — stock is now attributed to that customer
6. No allocation setup required. No prerequisite.

---

### Day-in-the-life: Dispatch Staff

**Dispatching packed items (10–20 min):**
1. Open Forge → Purchases → **Dispatch Queue**
2. See all customers with packed items, sorted by "waiting longest"
3. For each customer:
   - Fill in challan number
   - Click "Dispatch All to [Customer]"
4. If nothing in the queue: items haven't arrived yet — go to Track Stock and check "Order in Company" / "Company Billing" to see what's pending from suppliers

**Understanding why an item isn't ready:**
- Every item shows: "Waiting from Supplier" / "In Box — Ready" / "Dispatched"
- No guessing required

---

### Day-in-the-life: Store Manager

**Customer status check (daily, 5 min):**
1. Purchases → **Customers**
2. Green pills at the top of the list = customers with packed items ready to go
3. Click each green-pill customer → see Section 1 ("Ready to Dispatch")
4. Call the customer to confirm delivery date
5. Dispatch team handles actual dispatch

**Commitment tracking:**
1. Click any customer
2. Section 2 ("Coming Soon") shows everything in the pipeline with days elapsed
3. Section 3 ("Transferred") shows any stock redirected to/from this customer
4. Section 4 ("Delivered") shows full history

---

## Implementation Notes

### What NOT to Change

- DB stage names (`PENDING_CO`, `GODOWN`, etc.) — internal code stays identical
- The `LEGAL_TRANSITIONS` map — stage ordering logic unchanged
- Transfer mechanics (qtyTransferredIn/Out model from the integrity fix) — just expand who can be a target
- All existing API routes — only the transfer route needs extension

### What Needs to Change

| Component | Change |
|---|---|
| `purchases-tracker.ts` | Add `STAGE_DISPLAY_LABEL` constant mapping DB → friendly names |
| `STAGE_SHORT_LABEL` | Replace `PEND.CO`, `PEND.DIST` etc. with `With Co.`, `Billing` etc. |
| `LineCard.tsx` | Use friendly stage names; add "Give to Customer" inline button; add Dispatch Readiness chip |
| `ContextPanel.tsx` | Rename tabs; redesign Move tab to show natural next step; replace Transfer tab with Universal Transfer flow |
| `TransferPopover.tsx` | Full redesign — customer search, auto-create, remove prerequisite check |
| `WorkspaceCustomers.tsx` → `CustomerCommandCenter.tsx` | Four-section redesign |
| `WorkspaceDispatch.tsx` | Remove Pack Queue tab (In Box = dispatchable); inline challan field; readiness labels |
| `WorkspacePipeline.tsx` → `WorkspaceTrackStock.tsx` | Rename; minor label updates |
| `PurchasesWorkspace.tsx` | Remove Transfers workspace; rename workspaces |
| `navigation.ts` | No sidebar change needed — Purchases stays as one item |
| Transfer API route | Accept `targetCustomerId` + `newCustomerName`; auto-create POLineItem |

### Training Deck (30 min)

A new staff member should be taught in this order:
1. (5 min) What is Forge Purchases — tracking stock from order to delivery
2. (5 min) The 7 stages and what each means — poster on the wall with friendly names
3. (5 min) Track Stock — how to find any product
4. (5 min) Moving stock through stages (Move Stock tab)
5. (5 min) Giving stock to a customer (Give to Customer)
6. (5 min) Dispatch Queue — how to dispatch a batch

---

## Out of Scope for This Spec

- Real-time notifications (e.g. WhatsApp alerts when stock is packed)
- PDF challan generation (challan number is recorded but no PDF produced)
- Mobile / tablet layout (desktop first)
- Barcode scanning for godown receipt
- Permission-based dispatch (any staff can dispatch; no approval flow)
