# Payments Page — File Audit

> Auto-generated audit for files containing `payment|invoice|amount|balance`.
> Reviewed before any code changes.

---

## Mock Data

| File | Relevant content | Status |
|------|-----------------|--------|
| `apps/web/src/lib/mock/sales-data.ts` | Primary source of truth for existing invoicing data. Exports: `InvoiceStatus`, `PaymentMethod`, `Invoice` interface (with `paidAmount` field), `Payment` interface, `invoices[]` array, `payments[]` array, `calcDocumentTotals()`. **3 mock payments recorded** (pay01–03). | ✅ Exists — will be extended |
| `apps/web/src/lib/mock/purchases-data.ts` | References `amount` as "Lodha Altamount" in project names only — no financial data. | ✅ No conflict |
| `apps/web/src/lib/mock/procurement-data.ts` | References `amount` only as part of "Lodha Altamount" project name — no financial fields. | ✅ No conflict |
| `apps/web/src/lib/mock/dashboard-data.ts` | Uses `invoice_sent` / `payment_received` notification types; imports `invoices[]`. | ✅ Read-only, no change needed |
| `apps/web/src/lib/mock/crm-data.ts` | Single reference to "GST invoice format" in an activity body. | ✅ No conflict |

---

## Existing Invoicing Components

| File | What it does | Action |
|------|-------------|--------|
| `apps/web/src/components/invoicing/invoices/invoices-client.tsx` | Main invoices page client (217 lines). Renders `InvoiceTable` + `InvoiceSlideOver` + `RecordPaymentModal`. | ✅ Untouched |
| `apps/web/src/components/invoicing/invoices/invoice-table.tsx` | TanStack Table for invoices (313 lines). Columns: Invoice #, Customer, Date, Amount, Paid, Outstanding, Status. | ✅ Untouched |
| `apps/web/src/components/invoicing/invoices/invoice-slide-over.tsx` | Right panel for an invoice (368 lines). Shows line items, totals, linked payments. | ✅ Untouched |
| `apps/web/src/components/invoicing/invoices/record-payment-modal.tsx` | Modal for recording a payment against an invoice. Uses `PaymentMethod`, validates `amount ≤ outstanding`. | ✅ Untouched |
| `apps/web/src/components/invoicing/payments/payments-client.tsx` | Payments list page client (171 lines). | ✅ Untouched |
| `apps/web/src/components/invoicing/payments/payments-table.tsx` | TanStack Table for payments (253 lines). | ✅ Untouched |

---

## Existing Routes

| Route | File | Notes |
|-------|------|-------|
| `/invoicing/invoices` | `app/(dashboard)/invoicing/invoices/page.tsx` | **Existing** — don't touch |
| `/invoicing/payments` | `app/(dashboard)/invoicing/payments/page.tsx` | **Existing** — don't touch |
| `/invoicing/layout.tsx` | Wraps both with `InvoicingNav` (Invoices / Payments tabs) | Don't touch |

**The new `/payments` route will live at `/payments` (top-level), separate from `/invoicing/*`.**

---

## Layout / Navigation Files

| File | What to change |
|------|---------------|
| `apps/web/src/lib/navigation.ts` | Add `/payments` entry to sidebar nav |
| `apps/web/src/components/layout/sidebar.tsx` | Picks up navigation.ts — no direct change likely needed |
| `apps/web/src/components/layout/command-palette.tsx` | Has `jump-payments` → `/invoicing/payments`. May need new entry for `/payments`. |
| `apps/web/src/components/layout/mobile-nav.tsx` | Similar — add `/payments` if needed |
| `apps/web/src/components/layout/notification-panel.tsx` | Uses `overdue_invoice` type. Untouched. |
| `apps/web/src/components/sales/shared/invoicing-nav.tsx` | Nav between Invoices/Payments at `/invoicing/*`. Untouched. |

---

## Other Files

| File | Relevant content | Action |
|------|-----------------|--------|
| `apps/web/src/components/pos/quotation-preview.tsx` | Payment terms text: "50% advance against order; balance before dispatch." | ✅ Untouched |
| `apps/web/src/components/sales/shared/document-totals.tsx` | Renders "Taxable Amount" row in totals block. | ✅ Untouched |
| `apps/web/src/components/sales/orders/order-slide-over.tsx` | "Create Invoice" button. | ✅ Untouched |
| `apps/web/src/components/inventory/products/product-slide-over.tsx` | GST amount display only. | ✅ Untouched |
| `apps/web/src/components/procurement/PurchaseGrid.tsx` | "Lodha Altamount" reference only. | ✅ Untouched |
| `apps/web/src/components/dashboard/dashboard-client.tsx` | Imports `invoices[]`, shows overdue invoice alert, links to `/invoicing/invoices`. | ✅ Untouched |
| `apps/web/src/lib/commands.ts` | `jump-invoices` / `jump-payments` / `create-invoice` / `action-record-payment` entries. | Add new command for `/payments` |

---

## New Files to Create (per spec)

```
apps/web/src/
├── app/(dashboard)/payments/
│   └── page.tsx                              ← new route
├── lib/mock/
│   └── payments-data.ts                      ← new mock data (customer payments)
└── components/payments/
    ├── PaymentsView.tsx                       ← top-level layout
    ├── PaymentsStatCards.tsx                  ← 3 header KPI cards
    ├── CustomerListPanel.tsx                  ← 280px left panel
    ├── tab-customer/
    │   ├── CustomerPaymentTab.tsx             ← TAB 1
    │   ├── BrandBreakdownTable.tsx            ← company-wise table
    │   ├── RecordPaymentInline.tsx            ← inline payment recording
    │   └── PaymentHistoryList.tsx             ← payment history
    └── tab-company/
        ├── CompanyDashboardTab.tsx            ← TAB 2
        ├── BrandCard.tsx                      ← per-brand card with bar chart
        └── CustomerBrandMatrix.tsx            ← Customer × Brand matrix
```

---

## Key Design Decisions

1. **New route `/payments`** — completely separate from `/invoicing/payments` (which tracks invoice-level payments). This new view is the **customer account / project-level financial summary**.
2. **Mock data only** — no Prisma changes needed yet (schema is empty placeholder). Will create `lib/mock/payments-data.ts` with realistic Buildcon House data.
3. **Existing invoicing untouched** — all 6 invoicing components and 2 invoicing routes stay as-is.
4. **Shared `sales-data.ts` types** — will reuse `PaymentMethod` from `sales-data.ts` for consistency.

---

## Summary Counts

- **26 files** matched the search pattern
- **6 existing invoicing components** — untouched
- **2 existing invoicing routes** — untouched
- **5 layout/nav files** — minor additions only (nav link, command entry)
- **5 mock data files** — 1 new file, rest untouched
- **~8 new component files** to create
- **1 new route** to create
