# Purchases Tracker — Design Spec
**Date:** 2026-03-28
**Replaces:** existing `/purchases` 3-column PO layout
**Status:** Approved for implementation

---

## Overview

Replace the current 3-column purchases page with a unified **Purchase Tracker** — a salesperson-first view that answers at a glance: *what have we ordered from each brand, where is it, and which customer is getting what?*

The page has two togglable views — **Company View** (SKU-level, grouped by brand/vendor) and **Customer View** (order status per customer). Both live at `/purchases`. The existing `/purchases/boxes` route remains.

---

## Routes

| Route | Component | Notes |
|---|---|---|
| `/purchases` | `PurchasesTracker` | **Replaces** `PurchasesView` |
| `/purchases/boxes` | `InBoxTracker` | Unchanged |
| `/purchases/new` | `PODraftSidebar` | Unchanged |

The purchases nav tabs update to: **Tracker** · **Box Tracker** · **New PO**

---

## Page Layout (Company View)

```
┌─ BRAND TAB BAR (sticky, 54px) ──────────────────────────────────────────┐
│  ALL | GROHE | HANSGROHE | AXOR | VITRA | GEBERIT | KAJARIA              │
├─ KPI STRIP (white, 58px) ────────────────────────────────────────────────┤
│  🛒 47 Ordered │ ⏳ 12 Pending │ 📋 8 Needs PO │ 🏭 23 Godown │ 📦 18 Box │ ✅ 31 Done │
├─ SIDEBAR (200px) ──────────────────┬─ CODE PANEL (flex-1) ──────────────┤
│  Company filter (checkboxes)        │ Toolbar: toggle · search · export  │
│  Status filter (pills)              │ Table: SKU rows, click to expand   │
│  View toggle                        │ Expanded row: customer boxes grid   │
└────────────────────────────────────┴────────────────────────────────────┘
                                      Right Detail Panel (300px, slide-in)
```

**Theme:** Light — white panels, `#f5f5f5` page background, `#e5e7eb` borders. No dark mode on this page.

---

## 1. Brand Tab Bar

- Fixed tabs: ALL · GROHE · HANSGROHE · AXOR · VITRA · GEBERIT · KAJARIA
- Each tab shows brand name + PO count badge
- Active tab shows brand-color bottom border + tinted background
- Clicking a tab filters the KPI strip, sidebar counts, and code panel to that brand

Brand colors (from existing `BRAND_COLORS`):
```
GROHE: #00A3E0 · HANSGROHE: #E30613 · AXOR: #374151
VITRA: #005BAC · GEBERIT: #003087 · KAJARIA: #FF6B00
```

---

## 2. KPI Strip

Six chips, always visible. All counts are **reactive** — update instantly when brand tab or company filter changes.

| Chip | Color | Meaning |
|---|---|---|
| Total Ordered | Blue `#2563eb` | Sum of `qtyOrdered` across filtered lines |
| Pending from Co. | Amber `#d97706` | `qtyOrdered - qtyReceived` |
| Needs PO | Purple `#7c3aed` | Customer order placed but no PO raised to vendor |
| At Godown | Cyan `#0891b2` | Received at godown, not yet in a customer box |
| In Box | Green `#059669` | Staged in a customer box, not dispatched |
| Dispatched | Dark green `#16a34a` | Delivered / given to customer or other |

---

## 3. Left Sidebar

### Company Filter (checkboxes)
- Lists all vendor companies that supply the selected brand (e.g. "Grohe India Pvt Ltd", "Grohe AG Import")
- Multi-select checkboxes — checking one filters the code panel to only show lines from that company
- Each shows a count of matching line items
- Default: all checked

### Status Filter (pills)
- All / Needs PO / Ordered+Pending / At Godown / In Box / Dispatched
- Single-select — filters code panel rows to those whose net status matches
- Counts update reactively with brand tab + company filter

### View Toggle
- Company View (default) / Customer View
- Also mirrored in the toolbar toggle at the top of the code panel

---

## 4. Code Panel — Company View

### Toolbar
- View toggle (Company View / Customer View) — pill segment control
- Search input — filters rows by product name or SKU
- Export button (no-op in mock)
- **"+ Mark Received"** button — opens a modal to bulk-mark units received at godown

### Table Columns
| Column | Notes |
|---|---|
| Expand arrow | ▸/▾ toggle — click row to expand customer boxes |
| Product / Code | Product image placeholder + name + SKU (monospace) |
| Company | Vendor company badge (e.g. "Grohe India") |
| Qty | Total units across all customer allocations |
| Ordered | Units ordered from vendor — blue if > 0, `—` if not yet ordered |
| Pending | Units ordered but not yet received — amber |
| Cust. Order | Units where customer has placed an order but no vendor PO raised yet — purple. Distinct from "Ordered" (vendor PO sent) |
| In Box | Units received + staged in customer boxes — green |
| Dispatched | Units given to customer — dark green |
| Customers | Row of colored avatar chips (initials) per customer |

- Rows with **no PO raised** get a dashed left border and purple-tinted company badge
- All numeric cells use `font-variant-numeric: tabular-nums` and `var(--font-ui)`
- Clicking a row **expands inline** customer boxes AND **loads** the right detail panel for that SKU

### Expanded Row — Customer Boxes Grid
Displayed inline below the row. Shows a horizontal wrapping grid of **Customer Box cards**, one per customer allocation.

Each box card states:

| State | Badge | Card tint | When |
|---|---|---|---|
| Needs PO | ⏳ Needs PO | Purple dashed border | Customer ordered, no vendor PO |
| Ordered / Pending | 🔵 Ordered | Blue tint | PO raised, not received yet |
| At Godown | 🏭 At Godown | Cyan tint | Received, not staged |
| In Box | 📦 In Box | Blue tint | Staged in box |
| Delivery Pending | 🚚 Del. Pending | Amber tint | Dispatched date set, not confirmed |
| Delivered | ✓ Delivered | Green tint | Confirmed delivered |
| Given to Other | 👤 Other | Orange tint | Given to plumber/contractor/etc. |

**"Given to Other"** card additionally shows a **custom note** field (free text, saved inline). The note is immutable once saved (matches existing `MockDispatchRecord.customNote`).

Each box card is **clickable** — clicking it opens an edit popover to change the state or update the scheduled delivery date.

**Interactivity rule:** When a state changes on a customer box card, the following update automatically:
- The row's `Pending`, `In Box`, `Dispatched` columns
- The KPI strip counts
- The right detail panel mini-KPIs
- The customer's card in Customer View

---

## 5. Right Detail Panel

Slides in (300px) when a row is selected. Contains:

**Header:**
- Product name + SKU
- Mini-KPI row: Ordered · Pending · In Box · Done

**Customer Assignments list:**
- One row per customer with avatar, name, quantity, status badge
- Clicking a row opens the same edit popover as the box card
- "+ Assign to Customer" button — opens modal to pick a customer from CRM contacts and set quantity

**Mark Received at Godown:**
- Shows current received count + pending count
- Editable number input + "Update" button
- Saving triggers: recalculates Pending KPI, updates At Godown count, enables staging into boxes

---

## 6. Customer View

Toggled via the view toggle or sidebar. Same page, same URL, different render.

### Layout
```
┌─ TOP BAR (brand filter pills + search + toggle) ──────────────────────┐
├─ CUSTOMER LIST (260px) ──────────┬─ CUSTOMER DETAIL (flex-1) ──────────┤
│  Search                           │  Header: avatar, name, KPIs          │
│  Customer cards with mini badges  │  Brand filter pills (for this cust.) │
│                                   │  Order rows (expandable)             │
└──────────────────────────────────┴──────────────────────────────────────┘
```

### Customer List (left)
- One card per customer/project with colored avatar (initials)
- Shows summary badges: "✓ 3 delivered", "📦 2 in box", "⏳ needs PO"
- Clicking loads that customer's detail on the right
- Top filter bar has brand pills (ALL + 6 brands) — filters which customers to show based on their ordered brands
- Search filters by customer name

### Customer Detail (right)
**Header:**
- Customer name, sub-info (city, contact name, phone)
- KPI chips: Products · Needs PO · Pending · In Box · Delivered

**Brand filter bar:**
- Pill filters (ALL + brands this customer has ordered from) — filters the order rows below

**Order rows** — one per product line the customer has ordered:
- Product image + name + SKU + brand badge + quantity
- **Status funnel** (4 steps inline): Needs PO → At Godown → In Box → Delivered
  - Steps turn green (✓) when complete, blue ring (●) when active, amber (!) when overdue
- Status badge (rightmost)
- Clicking a row expands inline detail:
  - Box code, staged date, scheduled delivery date (editable)
  - Action buttons: "Mark Dispatched" / "Reschedule" / "Create PO" (for Needs PO state)

**Pending section:**
- Sticky summary at the bottom of each customer detail showing total pending delivery units and next scheduled date

**Interactivity rule:** Same as Company View — all state changes sync immediately to Company View.

---

## 7. State Management

A new Zustand store `usePurchaseTrackerStore` holds:

```ts
{
  // Brand tab
  activeBrand: 'ALL' | BrandKey

  // View
  viewMode: 'company' | 'customer'

  // Filters
  activeCompanies: string[]   // vendor company names (empty = all)
  activeStatus: StatusFilter  // 'all' | 'needs_po' | 'pending' | 'at_godown' | 'in_box' | 'dispatched'
  searchQuery: string

  // Selection
  selectedLineId: string | null
  selectedCustomerId: string | null

  // Actions
  setActiveBrand, setViewMode, toggleCompany, setStatus, setSearch
  setSelectedLine, setSelectedCustomer
}
```

The existing `useProcurementStore` (Zustand, holds `MockPurchaseOrder[]`) is the **source of truth** for all order + line item data. The tracker store only holds UI state (filters, selection). All mutations (mark received, update box status, assign customer) call `useProcurementStore` actions.

---

## 8. Mock Data Updates

The existing `procurement-data.ts` mock data needs additions:

1. **Kajaria** added to `BRANDS_ORDERED` — currently only 5 brands, needs 6
2. `MockPOLineItem` needs a `customerAllocations` array:
   ```ts
   customerAllocations: {
     customerId: string
     customerName: string
     qty: number
     boxStatus: 'NEEDS_PO' | 'ORDERED' | 'AT_GODOWN' | 'IN_BOX' | 'DEL_PENDING' | 'DELIVERED' | 'GIVEN_OTHER'
     scheduledDelivery: string | null
     customNote: string | null   // only for GIVEN_OTHER
   }[]
   ```
3. At least 6 mock customers with varied allocation states across 3+ brands
4. At least 12 mock line items spread across all 6 brands

---

## 9. Component File Map

```
apps/web/src/
├── app/(dashboard)/purchases/
│   ├── layout.tsx                     UPDATE — new nav tabs
│   └── page.tsx                       UPDATE — render PurchaseTrackerView
│
├── components/procurement/
│   ├── PurchaseTrackerView.tsx         NEW — top-level layout coordinator
│   ├── BrandTabBar.tsx                 NEW — 7 tabs (ALL + 6 brands)
│   ├── TrackerKPIStrip.tsx             NEW — 6 KPI chips
│   ├── TrackerSidebar.tsx              NEW — company filter + status + view toggle
│   ├── CompanyView/
│   │   ├── CompanyView.tsx             NEW — toolbar + table wrapper
│   │   ├── CodeTable.tsx               NEW — the main SKU table
│   │   ├── CodeTableRow.tsx            NEW — single expandable row
│   │   ├── CustomerBoxGrid.tsx         NEW — inline expanded customer boxes
│   │   ├── CustomerBoxCard.tsx         NEW — one box card (7 states)
│   │   └── SkuDetailPanel.tsx          NEW — right slide-in panel
│   └── CustomerView/
│       ├── CustomerView.tsx            NEW — list + detail layout
│       ├── CustomerListPanel.tsx       NEW — left customer list
│       ├── CustomerDetailPanel.tsx     NEW — right customer detail
│       ├── OrderRow.tsx                NEW — expandable product row with funnel
│       └── StatusFunnel.tsx            NEW — 4-step progress funnel
│
└── lib/
    ├── usePurchaseTrackerStore.ts      NEW — UI state (filters, selection)
    └── mock/procurement-data.ts       UPDATE — add customerAllocations, Kajaria, more mock data
```

---

## 10. Interactions & Mutability

Every value in the UI that has a real-world equivalent is **editable**:

| Field | How to edit | Effect |
|---|---|---|
| Units received at godown | Right panel → number input + Update | Updates `qtyReceived`, recalculates Pending KPI |
| Box status | Click box card → popover with status dropdown | Updates `boxStatus`, syncs KPIs and customer view |
| Scheduled delivery date | Click box card → date picker | Updates card date, highlights overdue in amber |
| Custom note (Given to Other) | Click box card → text area | Saved in `customNote`, displayed on card |
| Customer assignment | Right panel → "+ Assign" | Adds a `customerAllocation` entry |
| Qty per customer | Click box card → number input | Updates qty, validates total ≤ ordered |

All edits are saved in-memory (Zustand) in the mock. In production these would be API calls.

---

## Out of Scope

- PDF generation or printing
- Real API calls (all data stays in Zustand mock)
- The existing PO creation draft flow (`/purchases/new`) — untouched
- The Box Tracker page (`/purchases/boxes`) — untouched
- Authentication / permissions
