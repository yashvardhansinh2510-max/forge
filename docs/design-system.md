# Forge — Design System Reference

> Think: 25-year Apple designer. Every pixel intentional.
> The app should feel like a premium iPad application, not an ERP.

---

## Core Principles

1. **Typography creates hierarchy** — not color, not borders
2. **Numbers never jitter** — `fontVariantNumeric: 'tabular-nums'` everywhere
3. **Space is luxury** — generous padding signals quality
4. **Interaction is instant** — Framer Motion 220ms, no longer
5. **Buildcon House context** — every piece of data reflects the real business

---

## Typography Rules

### Font Variables
```css
--font-ui:      Geist Sans        /* Everything: UI, labels, data, numbers */
--font-mono:    Geist Mono        /* ONLY: keyboard shortcuts like ⌘K */
--font-display: Bricolage Grotesque /* ONLY: hero headings, marketing copy */
```

### Critical: Numbers and Financial Data
```tsx
// ✅ CORRECT — all financial numbers, prices, dates, SKUs, IDs
<span style={{
  fontFamily: 'var(--font-ui)',
  fontVariantNumeric: 'tabular-nums',
  fontWeight: 600,
  letterSpacing: '-0.02em',
}}>
  ₹28,47,500
</span>

// ❌ WRONG — never use mono on data
<span style={{ fontFamily: 'var(--font-mono)' }}>₹28,47,500</span>
```

### KPI / Stat Numbers
```tsx
// Large KPI tiles on dashboard
fontSize: 26, fontWeight: 700, fontFamily: 'var(--font-ui)',
letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums'

// Medium stats (table values, totals)
fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-ui)',
fontVariantNumeric: 'tabular-nums'
```

---

## Color System

### Philosophy
- Dark sidebar + light content = premium SaaS convention
- One accent color (blue), neutrals for everything else
- Status colors only where meaningful (red = overdue, green = paid)

### Usage
```
Background: var(--background)     Light off-white
Surface:    var(--surface)        Cards, panels
Border:     var(--border)         Subtle dividers
Primary:    var(--text-primary)   Headings, important data
Secondary:  var(--text-secondary) Labels, subtitles
Muted:      var(--text-muted)     Timestamps, helper text

Status:
  Paid/Active:   emerald/green
  Pending/Sent:  blue
  Overdue/Alert: red/destructive
  Draft:         muted/gray
  Processing:    amber/orange
```

### Badge Colors
```tsx
// Status badges — use semantic colors
<Badge variant="outline" style={{ color: '#16a34a' }}>Paid</Badge>
<Badge variant="outline" style={{ color: '#2563eb' }}>Sent</Badge>
<Badge variant="outline" style={{ color: '#dc2626' }}>Overdue</Badge>
<Badge variant="outline" style={{ color: '#9ca3af' }}>Draft</Badge>
```

---

## Layout Patterns

### Page Structure
```tsx
// Standard page layout
<PageContainer title="Invoices" subtitle="Create, send, and track client invoices">
  {/* Alert banners first */}
  {/* KPI tiles row */}
  {/* Filters / search */}
  {/* Main content (table or grid) */}
  {/* Slide-over panel (conditionally rendered) */}
</PageContainer>
```

### KPI Tile Row
```tsx
// 3-4 tiles in a row, each with:
// - Label (12px, muted, uppercase tracking)
// - Value (24-26px, bold, tabular-nums)
// - Trend badge (+21.7%)
// Equal-width tiles, subtle border, hover lift
```

### Table Pattern
```tsx
// Column headers: 12px, uppercase, letter-spaced, muted
// Row cells: 14px, primary or secondary
// Numeric cells: tabular-nums, right-aligned
// Row hover: subtle background shift
// Click → opens slide-over (not navigation)
```

### Slide-Over Panel
```tsx
// Fixed right panel, ~400px wide
// Slides in from right with spring animation
// Header: record ID + status badge
// Body: structured sections with labels above values
// Actions: at bottom (primary CTA + secondary)
// Close: X button top-right
```

---

## Spacing Scale

```
4px   — icon gap, tight spacing
8px   — element padding
12px  — compact row padding
16px  — standard spacing unit
20px  — card padding
24px  — section gap
32px  — major section gap
48px  — page top padding
```

---

## Component Conventions

### Empty States
Every module must have an empty state with:
- Lucide icon (48px, muted)
- Heading: "No [things] yet"
- Subtext explaining what this module is for
- CTA button if user can create items

### Loading States
Use `<Skeleton>` from `@forge/ui` for:
- Table rows (show 5-8 skeleton rows)
- KPI tiles (skeleton for the number)
- Card grids

### Alert Banners
```tsx
// Above KPI tiles, full-width, amber/red background
// Icon + message + action link (right-aligned)
// Example: "1 invoice overdue → ₹1.0L outstanding  [View invoices →]"
```

### Status Pills / Badges
```tsx
// Small, rounded, border-only (outline variant)
// Text only — no solid backgrounds except for critical alerts
// Consistent across all modules
```

---

## Buildcon House Data Conventions

### Product SKUs
```
GRH-ESS-001   → Grohe Essence (Basin Mixer)
GRH-RAIN-001  → Grohe Rainshower
AXR-EDG-001   → Axor Edge (Chrome)
HAN-MET-001   → Hansgrohe Metropol
VIT-S50-001   → Vitra S50
KAJ-FT-001    → Kajaria Floor Tile
GEB-UP-001    → Geberit UP (concealed cistern)
```

### Currency & Numbers
```tsx
// Always Indian Rupees
₹28,47,500    // Large (crores view)
₹2,84,000     // Lakhs
₹28,400       // Thousands

// Helper (in format.ts)
formatCurrency(28470000)   // → "₹2.84Cr"
formatCurrency(284000)     // → "₹2.84L"
formatCurrency(28400)      // → "₹28,400"
```

### Reference Numbers
```
Q-2025-0045   → Quotation
SO-2025-0448  → Sales Order
INV-2025-0156 → Invoice
PO-2025-0115  → Purchase Order (stock in)
TRF-2025-0034 → Stock Transfer
ADJ-2025-0068 → Stock Adjustment
RTN-2025-0003 → Stock Return
WH-2025-0017  → Warehouse Movement
```

### People
```
Suresh Iyer      → Senior Sales Manager (internal)
Ramesh Pawar     → Warehouse Manager
Deepa Kulkarni   → Dispatch Manager (Navi Mumbai)
Ar. Vikram Mehta → Architect at Mehta Architects Studio
Priya Nair       → Interior Designer at Priya Nair Interiors
Sameer Kapoor    → VP Projects at Lodha Developers Ltd
Dr. Meera Iyer   → Owner of luxury retail account
```

### Companies
```
Lodha Developers Ltd      → Builder (premium residential)
Prestige Group (Mumbai)   → Builder
Oberoi Realty             → Builder (luxury)
Mehta Architects Studio   → Architecture firm
Priya Nair Interiors      → Interior design
Studio Anita Lobo         → Interior design
KD Building Works         → Contractor (Thane)
JW Marriott Mumbai        → Hospitality
```

---

## Do's and Don'ts

| Do | Don't |
|---|---|
| Use `var(--font-ui)` + `tabular-nums` on numbers | Use `var(--font-mono)` on financial data |
| Slide-over panels for record detail | Modal dialogs for record detail |
| `₹` prefix for all currency | `Rs.` or no prefix |
| Indian number formatting (lakhs/crores) | Western formatting on large numbers |
| Buildcon House product names | Generic "Product A", "Widget B" |
| Framer Motion 220ms page transition | No animation or slow animation |
| Generous whitespace | Cramped, dense layouts |
| Muted/outline badges for status | Heavy solid colored status boxes |
| Overdue dates in red | Overdue dates in default color |
| Empty states with context | Blank white pages |
