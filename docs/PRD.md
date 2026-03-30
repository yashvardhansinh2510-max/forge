# Forge — Product Requirements Document

> **Version**: 2.0 | **Last Updated**: March 2026
> **Product**: Forge — Business Operating System for Buildcon House
> **Business**: Buildcon House, Mumbai — Luxury sanitaryware dealer (Grohe, Axor, Hansgrohe, Vitra, Kajaria)

---

## Executive Summary

Forge is a premium SaaS business operating system purpose-built for Buildcon House. It combines a luxury iPad-style visual product configurator, a multi-room quotation engine, inventory management, CRM, invoicing, and analytics — all in one unified platform. The product must feel like a premium Apple app, not an ERP.

---

## Target Users

| User | Role | Primary Use |
|---|---|---|
| Showroom Staff | Sales team at showroom | Build quotations, POS transactions |
| Suresh Iyer / Ramesh Pawar | Operations manager | Inventory, dispatch, order tracking |
| Owner | Business owner | Dashboard, reports, pipeline |
| Architect/Designer (client) | External | Receive PDF quotations |

---

## Module 1: POS & Quotation Builder ⭐ CORE FEATURE

### Overview
A luxury iPad-style visual product configurator. Not a shopping cart — a **project-first pipeline**:
```
Project → Rooms → Products per Room → Quotation → Fulfillment
```

### 1.1 Core Data Flow

1. **Project Entry** — Create project (e.g., "Lodha Palava 4BHK Villa - Mehta")
2. **Room Definition** — Add rooms (Bathroom 1, Bathroom 2, Common Bath, Kitchen)
3. **Visual Selection** — Browse products via e-commerce-style grid → add to active room
4. **Smart Bundling** — Selecting a fixture auto-suggests required concealed/internal parts
5. **Quotation Output** — PDF grouped by room with all 12 columns
6. **Fulfillment (In-Box)** — Track physical box assignment and partial dispatch

### 1.2 UI Layout (4 Zones)

```
┌─────────────────────────────────────────────────────────────────────┐
│ HEADER: Search | Active Project: "Lodha Palava Villa" | 30% Disc | PDF│
├──────────────┬────────────────────────────────┬──────────────────────┤
│ LEFT SIDEBAR │    MAIN — Visual Catalog Grid   │  RIGHT — Room Tabs   │
│              │                                 │  [Bath1][Bath2][+]   │
│ Brands:      │  [Product Card] [Product Card]  │ ─────────────────── │
│ ■ Grohe      │  large image   large image      │ • Grohe Rain 310     │
│ ■ Hansgrohe  │                                 │   Chrome  ×1  −/+   │
│ ■ Vitra      │  [Product Card] [Product Card]  │ • Vitra WC S50       │
│ ■ Geberit    │  large image   large image      │   White   ×1  −/+   │
│              │                                 │ ─────────────────── │
│ Sub-cats:    │  Click → Modal (variants,       │ Subtotal: ₹1,24,500 │
│ • Showers    │  finish, concealed toggle)      │ Disc 30%: -₹37,350  │
│ • Spouts     │                                 │ Total: ₹87,150      │
│ • Ceramics   │                                 │ [Generate PDF]      │
└──────────────┴────────────────────────────────┴──────────────────────┘
```

### 1.3 Multi-Room Tab System

- Dynamic tabs: "Bathroom 1", "Bathroom 2", "+ Add Room"
- **Active context**: selected tab determines which room products are added to
- Each tab shows: product list with thumbnail, name, colour, quantity controls (+/-)
- **Move item**: drag item from Bath1 to Bath2 (or use move icon) — no delete/re-add
- Tabs persist for the session; saved with the project

### 1.4 Smart Bundling Logic

- **Concealed Parts**: selecting Grohe Rainshower 310 → auto-adds Grohe 35600 rough-in valve
- **Auto Color Match**: selecting "Brushed Cool Sunrise" finish → all subsequent items in that room default to that finish
- **Bundle mapping table**: `product_id → [required_part_id, ...]` stored in DB

### 1.5 Quotation PDF Columns

| Col | Field |
|---|---|
| SR NO | Sequential line number |
| PICTURE | High-res product thumbnail |
| BRAND | Grohe, Vitra, Hansgrohe, etc. |
| CODE NO. | SKU |
| DESCRIPTION | Full product name + specs |
| COLOR | Selected finish |
| QTY | Units |
| M.R.P. (₹) | Base price per unit |
| TOTAL M.R.P. (₹) | QTY × M.R.P. |
| DISCOUNT | % applied |
| OFFER RATE (₹) | Discounted price per unit |
| TOTAL OFFER (₹) | Final line total |

Groups: items grouped by room with room subtotals. Grand total at bottom.
Footer: Buildcon House letterhead, GST number, T&Cs, signature line.

### 1.6 In-Box Fulfillment

- Once order confirmed and stock received → staff assigns items to client's physical "Box"
- Status per line item: `Ordered → In Box → Dispatched`
- Partial dispatch: "1 Dispatched, 1 Pending in Box"
- Box view shows client name, box contents, dispatch history

---

## Module 2: CRM ✅ Built

- **Contacts**: Architects, interior designers, builders with tags (premium-brands, kohler-preferred)
- **Companies**: 7 companies — Mehta Architects, Lodha Developers, Prestige Group, etc.
- **Pipeline**: Kanban — Enquiry → Site Visit → Sample Sent → Quote Shared → Negotiation → Won
- **Activities**: Calls, WhatsApp, Site Visits, Showroom Visits, Emails, Meetings

---

## Module 3: Sales ✅ Built

- **Quotations**: Draft → Sent → Viewed → Accepted → Declined (linked to CRM projects)
- **Orders**: Confirmed purchase orders with status tracking
- **Deliveries**: Dispatch scheduling and delivery confirmation

---

## Module 4: Samples ✅ Built

- Track product samples sent to clients (architects/designers)
- Return due date tracking, overdue alerts
- Mark as returned with one click

---

## Module 5: Inventory ✅ Built

- **Products**: SKU browser with brand, category, price, GST, stock
- **Warehouses**: 3 locations — Showroom (Mumbai), Main Godown (Bhiwandi), Dispatch Hub (Navi Mumbai)
- **Stock Movements**: IN, OUT, TRANSFER, ADJUST, RETURN with reference numbers

---

## Module 6: Invoicing ✅ Built

- **Invoices**: Create GST-compliant invoices with CGST+SGST breakdown
- **Payments**: Record payments with UTR references and bank transfer details
- Outstanding/overdue tracking

---

## Module 7: Reports 🚧 Planned

- Revenue by brand, category, region
- Top customers, top products
- Monthly/quarterly P&L
- Inventory turnover

---

## Module 8: Price Lists ✅ Built

Three tiers:
1. **Retail (MRP)** — Default, walk-in customers
2. **Trade & Architect (12% below MRP)** — Architects and interior designers
3. **Builder/Project (18% below MRP)** — Bulk project orders

---

## Non-Functional Requirements

### Design
- Premium Apple-quality UI — every pixel intentional
- Geist Sans for all UI, `fontVariantNumeric: 'tabular-nums'` on all numbers
- Dark sidebar, light content area
- Framer Motion transitions (220ms page entry)
- Mobile-responsive (tablet-first for showroom iPad use)

### Performance
- Page loads < 1s on LAN (showroom environment)
- Product image grid: lazy-load, progressive enhancement
- PDF generation: < 3s for 50-item quotation

### Data
- Indian Rupees (₹) everywhere, Indian number formatting (lakhs, crores)
- GST: 18% (CGST 9% + SGST 9%) or 28% for luxury items
- SKUs: brand prefix format (GRH-ESS-001, AXR-EDG-001, VIT-S50-001)

---

## Roadmap

| Priority | Feature | Status |
|---|---|---|
| P0 | POS/Quotation Builder (Module 1) | 🔴 Not started |
| P0 | Prisma schema + real database | 🔴 Not started |
| P1 | PDF quotation generation | 🔴 Not started |
| P1 | In-Box fulfillment tracking | 🔴 Not started |
| P2 | Reports & Analytics | 🚧 Placeholder |
| P2 | Manufacturing module | 🚧 Placeholder |
| P3 | Catalogue (digital product library) | 🚧 Empty |
| P3 | Settings (user mgmt, company config) | 🚧 Placeholder |
