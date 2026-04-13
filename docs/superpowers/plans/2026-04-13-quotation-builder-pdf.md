# Quotation Builder — Full-Page Editor + PDF Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 720px slide-over quotation builder with a full-page room-based editor and generate exact-match Buildcon House PDF quotations via `@react-pdf/renderer`.

**Architecture:** Each quotation opens at `/sales/quotations/[revisionId]`. The page is a three-zone layout (top bar / left sidebar / main room area). Rooms contain item rows; saving replaces all rooms+items in the DB. PDF is generated server-side at `GET /api/quotations/[id]/pdf` and streamed back as `application/pdf`.

**Tech Stack:** Next.js 15 App Router, Prisma (`@forge/db`), `@react-pdf/renderer`, dnd-kit (existing), Sonner toasts (existing), Framer Motion (existing), Zod (existing).

---

## File Map

### New files
| File | Responsibility |
|---|---|
| `apps/web/src/lib/pdf/quotation-pdf.tsx` | `@react-pdf/renderer` Document — all pages, styles, sub-components |
| `apps/web/src/lib/pdf/format.ts` | Number/date formatting helpers for PDF (INR, dd-MM-yyyy) |
| `apps/web/src/app/api/quotations/[id]/pdf/route.ts` | Stream PDF response |
| `apps/web/src/components/sales/quotations/quotation-editor.tsx` | Full-page builder orchestrator — state, save, keyboard shortcuts |
| `apps/web/src/components/sales/quotations/editor-sidebar.tsx` | Left sidebar — all meta fields editable |
| `apps/web/src/components/sales/quotations/room-section.tsx` | Single room — header, item table, per-room totals |
| `apps/web/src/components/sales/quotations/editor-item-row.tsx` | Single item row — inline edit, replace, delete |
| `apps/web/src/components/sales/quotations/grand-total-bar.tsx` | Sticky bottom bar — grand MRP total + grand offer total |
| `apps/web/src/app/(dashboard)/sales/quotations/new/page.tsx` | New quotation route |
| `apps/web/src/app/(dashboard)/sales/quotations/[id]/page.tsx` | Edit quotation route |

### Modified files
| File | Change |
|---|---|
| `packages/db/prisma/schema.prisma` | Add 6 fields to `Quotation` and `QuotationRevision` |
| `apps/web/src/app/api/quotations/[id]/route.ts` | Extend GET (return rooms); rewrite PATCH (accept rooms array) |
| `apps/web/src/components/sales/quotations/quotations-client.tsx` | Row click → navigate to `/sales/quotations/[revisionId]`; "New" → `/sales/quotations/new` |

---

## Task 1: DB Schema Migration

**Files:**
- Modify: `packages/db/prisma/schema.prisma`

- [ ] **Step 1.1: Add fields to schema**

Open `packages/db/prisma/schema.prisma`. Find the `Quotation` model and add:

```prisma
model Quotation {
  id            String              @id @default(cuid())
  number        String              @unique
  projectId     String?
  project       Project?            @relation(fields: [projectId], references: [id], onDelete: Cascade)
  customerName  String?
  customerPhone  String?            // ← NEW: NUM field in PDF
  billingAddress String?            // ← NEW: billing address
  salesRep       String?            // ← NEW: REF field in PDF
  brandLabel     String?            // ← NEW: section header (e.g. "GROHE")
  siteAddress   String?
  createdById   String
  createdBy     User                @relation("CreatedBy", fields: [createdById], references: [id])
  currentStatus RevisionStatus      @default(DRAFT)
  createdAt     DateTime            @default(now())
  revisions     QuotationRevision[]
}
```

Find the `QuotationRevision` model and add:

```prisma
model QuotationRevision {
  id                String            @id @default(cuid())
  quotationId       String
  quotation         Quotation         @relation(fields: [quotationId], references: [id], onDelete: Cascade)
  revisionNumber    Int               @default(0)
  status            RevisionStatus    @default(DRAFT)
  globalDiscountPct Float             @default(0.0)
  isLocked          Boolean           @default(false)
  lockedAt          DateTime?
  snapshot          Json?
  notes             String?
  validUntil        DateTime?         // ← NEW: quote expiry
  termsAndConditions String?          // ← NEW: footer text + toll-free numbers
  createdAt         DateTime          @default(now())
  rooms             QuotationRoom[]
  approvalRequests  ApprovalRequest[]
  purchaseOrders    PurchaseOrder[]

  @@unique([quotationId, revisionNumber])
}
```

- [ ] **Step 1.2: Run migration**

```bash
cd /Users/yashvardhansinhjhala/forge
pnpm --filter @forge/db exec prisma migrate dev --name add_quotation_pdf_fields
```

Expected: `Your database is now in sync with your schema.`

- [ ] **Step 1.3: Regenerate Prisma client**

```bash
pnpm --filter @forge/db exec prisma generate
```

- [ ] **Step 1.4: Type-check**

```bash
pnpm type-check
```

Expected: 0 errors.

- [ ] **Step 1.5: Commit**

```bash
git add packages/db/prisma/schema.prisma packages/db/prisma/migrations/
git commit -m "feat(db): add pdf fields to Quotation and QuotationRevision"
```

---

## Task 2: Extend GET /api/quotations/[id] — Return Rooms

**Files:**
- Modify: `apps/web/src/app/api/quotations/[id]/route.ts`

- [ ] **Step 2.1: Rewrite the GET handler**

Replace the entire file content:

```typescript
// GET   /api/quotations/[id]  — load quotation revision with rooms + items
// PATCH /api/quotations/[id]  — replace rooms + update metadata

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@forge/db'
import { withErrorHandling } from '@/lib/api-helpers'

// ─── Schemas ──────────────────────────────────────────────────────────────────

const RoomItemSchema = z.object({
  sku: z.string().min(1),
  qty: z.number().int().positive(),
  offerRate: z.number().min(0),
})

const RoomSchema = z.object({
  name: z.string().min(1),
  items: z.array(RoomItemSchema),
})

const PatchSchema = z.object({
  customerName:       z.string().optional(),
  customerPhone:      z.string().optional(),
  billingAddress:     z.string().optional(),
  siteAddress:        z.string().optional(),
  salesRep:           z.string().optional(),
  brandLabel:         z.string().optional(),
  validUntil:         z.string().datetime({ offset: true }).optional(),
  notes:              z.string().optional(),
  termsAndConditions: z.string().optional(),
  rooms:              z.array(RoomSchema).optional(),
})

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withErrorHandling(async () => {
    const { id } = await params

    const revision = await prisma.quotationRevision.findUnique({
      where: { id },
      include: {
        quotation: true,
        rooms: {
          orderBy: { order: 'asc' as const },
          include: {
            items: {
              orderBy: { sortOrder: 'asc' as const },
              include: {
                product: { select: { sku: true, name: true, mrp: true } },
              },
            },
          },
        },
      },
    })

    if (!revision) {
      return NextResponse.json({ message: 'Revision not found' }, { status: 404 })
    }

    return NextResponse.json({
      id:                 revision.quotationId,
      revisionId:         revision.id,
      quotationNumber:    revision.quotation.number,
      status:             revision.status,
      isLocked:           revision.isLocked,
      customerName:       revision.quotation.customerName ?? '',
      customerPhone:      revision.quotation.customerPhone ?? '',
      billingAddress:     revision.quotation.billingAddress ?? '',
      siteAddress:        revision.quotation.siteAddress ?? '',
      salesRep:           revision.quotation.salesRep ?? '',
      brandLabel:         revision.quotation.brandLabel ?? 'GROHE',
      createdAt:          revision.createdAt.toISOString(),
      validUntil:         revision.validUntil?.toISOString() ?? null,
      notes:              revision.notes ?? '',
      termsAndConditions: revision.termsAndConditions ?? '',
      rooms: revision.rooms.map((room) => ({
        id:    room.id,
        name:  room.roomName,
        order: room.order,
        items: room.items.map((item) => ({
          id:          item.id,
          productId:   item.productId,
          sku:         item.product.sku,
          productName: item.product.name,
          mrp:         item.mrp,
          qty:         item.quantity,
          offerRate:   item.offerRate,
        })),
      })),
    })
  })
}

// ─── PATCH ────────────────────────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withErrorHandling(async () => {
    const { id } = await params
    const body = PatchSchema.parse(await req.json())

    const revision = await prisma.quotationRevision.findUnique({ where: { id } })
    if (!revision) {
      return NextResponse.json({ message: 'Revision not found' }, { status: 404 })
    }
    if (revision.isLocked) {
      return NextResponse.json({ message: 'Cannot update a locked revision' }, { status: 422 })
    }

    await prisma.$transaction(async (tx) => {
      // Update Quotation metadata
      await tx.quotation.update({
        where: { id: revision.quotationId },
        data: {
          ...(body.customerName   !== undefined && { customerName:   body.customerName }),
          ...(body.customerPhone  !== undefined && { customerPhone:  body.customerPhone }),
          ...(body.billingAddress !== undefined && { billingAddress: body.billingAddress }),
          ...(body.siteAddress    !== undefined && { siteAddress:    body.siteAddress }),
          ...(body.salesRep       !== undefined && { salesRep:       body.salesRep }),
          ...(body.brandLabel     !== undefined && { brandLabel:     body.brandLabel }),
        },
      })

      // Update Revision metadata
      await tx.quotationRevision.update({
        where: { id },
        data: {
          ...(body.notes              !== undefined && { notes:              body.notes }),
          ...(body.termsAndConditions !== undefined && { termsAndConditions: body.termsAndConditions }),
          ...(body.validUntil         !== undefined && { validUntil:         new Date(body.validUntil) }),
        },
      })

      // Replace rooms if provided — delete all, re-insert
      if (body.rooms !== undefined) {
        await tx.quotationRoom.deleteMany({ where: { revisionId: id } })

        // Look up all SKUs in one query
        const allSkus = body.rooms.flatMap((r) => r.items.map((i) => i.sku))
        const products = await tx.product.findMany({
          where: { sku: { in: allSkus } },
          select: { id: true, sku: true, mrp: true },
        })
        const productBySku = new Map(products.map((p) => [p.sku, p]))

        let roomOrder = 0
        for (const roomPayload of body.rooms) {
          const room = await tx.quotationRoom.create({
            data: {
              revisionId: id,
              roomName:   roomPayload.name,
              order:      roomOrder++,
            },
          })

          let itemOrder = 0
          for (const item of roomPayload.items) {
            const product = productBySku.get(item.sku)
            if (!product) continue          // skip unknown SKUs
            await tx.quotationItem.create({
              data: {
                roomId:     room.id,
                productId:  product.id,
                quantity:   item.qty,
                mrp:        product.mrp,
                discountPct: 0,
                offerRate:  item.offerRate,
                totalOffer: item.offerRate * item.qty,
                sortOrder:  itemOrder++,
              },
            })
          }
        }
      }
    })

    return NextResponse.json({ success: true })
  })
}
```

- [ ] **Step 2.2: Type-check**

```bash
pnpm type-check
```

Expected: 0 errors.

- [ ] **Step 2.3: Smoke test GET (only if DB has a revision)**

```bash
# Grab any revisionId from the DB:
curl http://localhost:3000/api/quotations/<any-revision-id> | jq '.rooms'
```

Expected: array of room objects each with `id`, `name`, `items`.

- [ ] **Step 2.4: Commit**

```bash
git add apps/web/src/app/api/quotations/[id]/route.ts
git commit -m "feat(api): extend GET + rewrite PATCH for room-based quotation schema"
```

---

## Task 3: Install @react-pdf/renderer

**Files:** `apps/web/package.json`

- [ ] **Step 3.1: Install**

```bash
pnpm --filter web add @react-pdf/renderer
```

- [ ] **Step 3.2: Verify**

```bash
pnpm type-check
```

Expected: 0 errors (react-pdf ships its own types).

- [ ] **Step 3.3: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml
git commit -m "chore: add @react-pdf/renderer"
```

---

## Task 4: PDF Formatting Helpers

**Files:**
- Create: `apps/web/src/lib/pdf/format.ts`

- [ ] **Step 4.1: Create the file**

```typescript
// apps/web/src/lib/pdf/format.ts

/** Format number as Indian Rupees — e.g. 47700 → "₹47,700" */
export function fmtINR(value: number): string {
  return '₹' + value.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

/** Format Date as dd-MM-yyyy — e.g. new Date('2026-03-24') → "24-03-2026" */
export function fmtDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}-${mm}-${yyyy}`
}
```

- [ ] **Step 4.2: Commit**

```bash
git add apps/web/src/lib/pdf/format.ts
git commit -m "feat(pdf): add INR and date formatting helpers"
```

---

## Task 5: PDF Document Component

**Files:**
- Create: `apps/web/src/lib/pdf/quotation-pdf.tsx`

This file defines the entire PDF. It is a pure function — no hooks, no browser APIs.

- [ ] **Step 5.1: Define types and constants**

Create `apps/web/src/lib/pdf/quotation-pdf.tsx`:

```tsx
// apps/web/src/lib/pdf/quotation-pdf.tsx
import {
  Document, Page, View, Text, StyleSheet,
} from '@react-pdf/renderer'
import { fmtINR, fmtDate } from './format'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PdfItem {
  sku:         string
  productName: string
  mrp:         number
  qty:         number
  offerRate:   number
}

export interface PdfRoom {
  name:  string
  items: PdfItem[]
}

export interface QuotationPdfData {
  quotationNumber:    string
  customerName:       string
  customerPhone:      string
  salesRep:           string
  brandLabel:         string
  createdAt:          string   // ISO string
  notes:              string   // numbered list text
  termsAndConditions: string   // footer / toll-free text
  rooms:              PdfRoom[]
}

// ─── Brand row ────────────────────────────────────────────────────────────────

const BRANDS = ['GROHE', 'hansgrohe', 'AXOR', 'GEBERIT', 'VitrA', 'Oyster', 'QUTONE', 'Nexion', 'DIMORE', 'ittimi']

// ─── Styles ───────────────────────────────────────────────────────────────────

const YELLOW = '#FFC000'
const BORDER = '#CCCCCC'
const S = StyleSheet.create({
  page:          { fontFamily: 'Helvetica', fontSize: 8, padding: 28, color: '#111' },
  // Header
  title:         { fontSize: 22, fontFamily: 'Helvetica-Bold', textAlign: 'center', letterSpacing: 3 },
  tagline:       { fontSize: 9, textAlign: 'center', marginTop: 2, color: '#555' },
  divider:       { borderBottom: `1pt solid ${BORDER}`, marginVertical: 6 },
  // Brand row
  brandRow:      { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  brandName:     { fontSize: 8, color: '#333' },
  // Subtitle
  subtitle:      { textAlign: 'center', fontSize: 9, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  introText:     { textAlign: 'center', fontSize: 8, marginBottom: 8 },
  // Info table
  infoTable:     { border: `1pt solid ${BORDER}`, marginBottom: 10 },
  infoRow:       { flexDirection: 'row', borderBottom: `1pt solid ${BORDER}` },
  infoRowLast:   { flexDirection: 'row' },
  infoLabel:     { width: 80, padding: '4 6', fontFamily: 'Helvetica-Bold', borderRight: `1pt solid ${BORDER}` },
  infoValue:     { flex: 1, padding: '4 6' },
  // Brand header section
  brandHeader:   { backgroundColor: YELLOW, padding: '4 8', textAlign: 'center', fontFamily: 'Helvetica-Bold', fontSize: 11, marginBottom: 6 },
  // Summary table
  tableHeader:   { flexDirection: 'row', backgroundColor: YELLOW, padding: '4 6', fontFamily: 'Helvetica-Bold' },
  tableRow:      { flexDirection: 'row', borderBottom: `0.5pt solid ${BORDER}`, padding: '4 6' },
  tableRowYellow:{ flexDirection: 'row', backgroundColor: YELLOW, padding: '4 6', fontFamily: 'Helvetica-Bold' },
  colIdx:        { width: 36, textAlign: 'center' },
  colRoom:       { flex: 1 },
  colMRP:        { width: 90, textAlign: 'right' },
  colOfferRate:  { width: 90, textAlign: 'right' },
  // Notes
  notesTitle:    { fontFamily: 'Helvetica-Bold', fontSize: 8, marginTop: 8, marginBottom: 3 },
  noteItem:      { fontSize: 7.5, marginBottom: 2 },
  // Footer
  footerSection: { marginTop: 8, fontSize: 7.5 },
  // Detail page — item table
  detailHeader:  { backgroundColor: YELLOW, padding: '5 6', fontFamily: 'Helvetica-Bold', fontSize: 9, marginBottom: 4 },
  itemHeader:    { flexDirection: 'row', backgroundColor: YELLOW, padding: '4 4', fontFamily: 'Helvetica-Bold', fontSize: 7 },
  itemRow:       { flexDirection: 'row', borderBottom: `0.5pt solid ${BORDER}`, padding: '5 4', fontSize: 7 },
  itemRowTotal:  { flexDirection: 'row', backgroundColor: YELLOW, padding: '4 4', fontFamily: 'Helvetica-Bold', fontSize: 7 },
  dSr:           { width: 22, textAlign: 'center' },
  dArticle:      { width: 58, textAlign: 'left' },
  dDesc:         { flex: 1 },
  dImg:          { width: 44, textAlign: 'center' },
  dMRP:          { width: 44, textAlign: 'right' },
  dQty:          { width: 24, textAlign: 'center' },
  dMRPTotal:     { width: 54, textAlign: 'right' },
  dOfferRate:    { width: 54, textAlign: 'right' },
  dTotal:        { width: 54, textAlign: 'right' },
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function roomMrpTotal(room: PdfRoom)   { return room.items.reduce((s, i) => s + i.mrp * i.qty, 0) }
function roomOfferTotal(room: PdfRoom) { return room.items.reduce((s, i) => s + i.offerRate * i.qty, 0) }

// ─── Cover Page ───────────────────────────────────────────────────────────────

function CoverPage({ q }: { q: QuotationPdfData }) {
  const grandMRP   = q.rooms.reduce((s, r) => s + roomMrpTotal(r), 0)
  const grandOffer = q.rooms.reduce((s, r) => s + roomOfferTotal(r), 0)

  const noteLines = q.notes
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)

  const footerLines = q.termsAndConditions
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)

  return (
    <Page size="A4" style={S.page}>
      {/* Header */}
      <Text style={S.title}>BUILDCON HOUSE</Text>
      <Text style={S.tagline}>Let you live better</Text>
      <View style={S.divider} />

      {/* Brand row */}
      <View style={S.brandRow}>
        {BRANDS.map((b) => <Text key={b} style={S.brandName}>{b}</Text>)}
      </View>
      <View style={S.divider} />

      {/* Subtitle */}
      <Text style={S.subtitle}>SUB: Quotation</Text>
      <Text style={S.introText}>
        Dear sir thanks you for positive approach to our products. We are glad to give you our best competitive rate, as per your requirement.
      </Text>

      {/* Info table */}
      <View style={S.infoTable}>
        {[
          ['NAME :', q.customerName],
          ['DATE :', fmtDate(q.createdAt)],
          ['NUM  :', q.customerPhone],
          ['REF  :', q.salesRep],
        ].map(([label, value], idx, arr) => (
          <View key={label} style={idx === arr.length - 1 ? S.infoRowLast : S.infoRow}>
            <Text style={S.infoLabel}>{label}</Text>
            <Text style={S.infoValue}>{value}</Text>
          </View>
        ))}
      </View>

      {/* Brand section header */}
      {q.brandLabel ? <Text style={S.brandHeader}>{q.brandLabel}</Text> : null}

      {/* Summary table header */}
      <View style={[S.tableHeader, { border: `1pt solid ${BORDER}` }]}>
        <Text style={S.colIdx}>SL,NO.</Text>
        <Text style={S.colRoom}>BATHROOM</Text>
        <Text style={S.colMRP}>MRP</Text>
      </View>

      {/* Summary rows */}
      {q.rooms.map((room, idx) => (
        <View key={room.name} style={[S.tableRow, { border: `0.5pt solid ${BORDER}`, borderTop: 'none' }]}>
          <Text style={S.colIdx}>{idx + 1}</Text>
          <Text style={S.colRoom}>{room.name}</Text>
          <Text style={S.colMRP}>{fmtINR(roomMrpTotal(room))}</Text>
        </View>
      ))}

      {/* TOTAL row */}
      <View style={[S.tableRowYellow, { border: `0.5pt solid ${BORDER}`, borderTop: 'none' }]}>
        <Text style={S.colIdx}> </Text>
        <Text style={S.colRoom}>TOTAL</Text>
        <Text style={S.colMRP}>{fmtINR(grandMRP)}</Text>
      </View>

      {/* SPECIAL OFFER RATE row */}
      <View style={[S.tableRowYellow, { border: `0.5pt solid ${BORDER}`, borderTop: 'none', fontSize: 10 }]}>
        <Text style={S.colIdx}> </Text>
        <Text style={S.colRoom}>SPECIAL OFFER RATE</Text>
        <Text style={S.colMRP}>{fmtINR(grandOffer)}</Text>
      </View>

      {/* Notes */}
      {noteLines.length > 0 && (
        <View>
          <Text style={S.notesTitle}>NOTE</Text>
          {noteLines.map((line, i) => (
            <Text key={i} style={S.noteItem}>{line}</Text>
          ))}
        </View>
      )}

      {/* Footer */}
      <View style={S.footerSection}>
        {footerLines.map((line, i) => (
          <Text key={i} style={S.noteItem}>{line}</Text>
        ))}
      </View>
    </Page>
  )
}

// ─── Detail Page (one per room) ───────────────────────────────────────────────

function RoomDetailPage({ room, srOffset }: { room: PdfRoom; srOffset: number }) {
  const mrpTotal   = roomMrpTotal(room)
  const offerTotal = roomOfferTotal(room)
  const totalQty   = room.items.reduce((s, i) => s + i.qty, 0)
  const offerSumPerItem = room.items.reduce((s, i) => s + i.offerRate, 0)

  return (
    <Page size="A4" style={S.page}>
      {/* Room header */}
      <Text style={S.detailHeader}>{room.name}</Text>

      {/* Table header */}
      <View style={S.itemHeader}>
        <Text style={S.dSr}>Sr.\nNo.</Text>
        <Text style={S.dArticle}>Article\nNo.</Text>
        <Text style={S.dDesc}>Product Description</Text>
        <Text style={S.dImg}>Product\nImage</Text>
        <Text style={S.dMRP}>MRP</Text>
        <Text style={S.dQty}>QTY</Text>
        <Text style={S.dMRPTotal}>MRP\nTOTAL</Text>
        <Text style={S.dOfferRate}>OFFER\nRATE</Text>
        <Text style={S.dTotal}>TOTAL</Text>
      </View>

      {/* Item rows */}
      {room.items.map((item, idx) => (
        <View key={item.sku + idx} style={S.itemRow}>
          <Text style={S.dSr}>{srOffset + idx + 1}</Text>
          <Text style={S.dArticle}>{item.sku}</Text>
          <Text style={S.dDesc}>{item.productName}</Text>
          <Text style={S.dImg}> </Text>
          <Text style={S.dMRP}>{fmtINR(item.mrp)}</Text>
          <Text style={S.dQty}>{item.qty}</Text>
          <Text style={S.dMRPTotal}>{fmtINR(item.mrp * item.qty)}</Text>
          <Text style={S.dOfferRate}>{fmtINR(item.offerRate)}</Text>
          <Text style={S.dTotal}>{fmtINR(item.offerRate * item.qty)}</Text>
        </View>
      ))}

      {/* TOTAL row */}
      <View style={S.itemRowTotal}>
        <Text style={{ ...S.dSr, ...S.dArticle }}>TOTAL</Text>
        <Text style={S.dDesc}> </Text>
        <Text style={S.dImg}> </Text>
        <Text style={S.dMRP}> </Text>
        <Text style={S.dQty}>{totalQty}</Text>
        <Text style={S.dMRPTotal}>{fmtINR(mrpTotal)}</Text>
        <Text style={S.dOfferRate}>{fmtINR(offerSumPerItem)}</Text>
        <Text style={S.dTotal}>{fmtINR(offerTotal)}</Text>
      </View>
    </Page>
  )
}

// ─── Root Document ────────────────────────────────────────────────────────────

export function QuotationPdfDocument({ q }: { q: QuotationPdfData }) {
  let srOffset = 0
  return (
    <Document title={q.quotationNumber}>
      <CoverPage q={q} />
      {q.rooms.map((room) => {
        const page = <RoomDetailPage key={room.name} room={room} srOffset={srOffset} />
        srOffset += room.items.length
        return page
      })}
    </Document>
  )
}
```

- [ ] **Step 5.2: Type-check**

```bash
pnpm type-check
```

Expected: 0 errors.

- [ ] **Step 5.3: Commit**

```bash
git add apps/web/src/lib/pdf/
git commit -m "feat(pdf): add QuotationPdfDocument react-pdf component"
```

---

## Task 6: PDF API Route

**Files:**
- Create: `apps/web/src/app/api/quotations/[id]/pdf/route.ts`

- [ ] **Step 6.1: Create the route**

```typescript
// apps/web/src/app/api/quotations/[id]/pdf/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { prisma } from '@forge/db'
import { withErrorHandling } from '@/lib/api-helpers'
import { QuotationPdfDocument, type QuotationPdfData } from '@/lib/pdf/quotation-pdf'
import React from 'react'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withErrorHandling(async () => {
    const { id } = await params

    const revision = await prisma.quotationRevision.findUnique({
      where: { id },
      include: {
        quotation: true,
        rooms: {
          orderBy: { order: 'asc' as const },
          include: {
            items: {
              orderBy: { sortOrder: 'asc' as const },
              include: { product: { select: { sku: true, name: true, mrp: true } } },
            },
          },
        },
      },
    })

    if (!revision) {
      return NextResponse.json({ message: 'Revision not found' }, { status: 404 })
    }

    const pdfData: QuotationPdfData = {
      quotationNumber:    revision.quotation.number,
      customerName:       revision.quotation.customerName   ?? '',
      customerPhone:      revision.quotation.customerPhone  ?? '',
      salesRep:           revision.quotation.salesRep       ?? '',
      brandLabel:         revision.quotation.brandLabel     ?? 'GROHE',
      createdAt:          revision.createdAt.toISOString(),
      notes:              revision.notes              ?? '',
      termsAndConditions: revision.termsAndConditions ?? '',
      rooms: revision.rooms.map((room) => ({
        name:  room.roomName,
        items: room.items.map((item) => ({
          sku:         item.product.sku,
          productName: item.product.name,
          mrp:         item.mrp,
          qty:         item.quantity,
          offerRate:   item.offerRate,
        })),
      })),
    }

    const buffer = await renderToBuffer(
      React.createElement(QuotationPdfDocument, { q: pdfData }),
    )

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="${revision.quotation.number}.pdf"`,
        'Content-Length':      String(buffer.byteLength),
      },
    })
  })
}
```

- [ ] **Step 6.2: Type-check**

```bash
pnpm type-check
```

Expected: 0 errors.

- [ ] **Step 6.3: Smoke test (requires DB revision with items)**

```bash
curl -o /tmp/test.pdf http://localhost:3000/api/quotations/<revisionId>/pdf
open /tmp/test.pdf
```

Expected: PDF opens with cover page and room detail pages.

- [ ] **Step 6.4: Commit**

```bash
git add apps/web/src/app/api/quotations/[id]/pdf/route.ts
git commit -m "feat(api): add GET /api/quotations/[id]/pdf endpoint"
```

---

## Task 7: Editor Item Row Component

**Files:**
- Create: `apps/web/src/components/sales/quotations/editor-item-row.tsx`

This is the single item row in the room table. Inline editable.

- [ ] **Step 7.1: Create component**

```tsx
// apps/web/src/components/sales/quotations/editor-item-row.tsx
'use client'

import * as React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2, RefreshCw, Search } from 'lucide-react'
import { formatINR } from '@/lib/format'

export interface EditorItem {
  id:          string
  productId:   string
  sku:         string
  productName: string
  mrp:         number
  qty:         number
  offerRate:   number
}

export interface LiveProduct {
  id:   string
  sku:  string
  name: string
  mrp:  number
}

interface EditorItemRowProps {
  item:         EditorItem
  srNo:         number
  products:     LiveProduct[]
  onUpdate:     (updates: Partial<EditorItem>) => void
  onDelete:     () => void
  isLast:       boolean
}

function InlineNum({
  value, onChange, prefix,
}: { value: number; onChange: (v: number) => void; prefix?: string }) {
  const [editing, setEditing] = React.useState(false)
  const [raw, setRaw] = React.useState(String(value))

  React.useEffect(() => { if (!editing) setRaw(String(value)) }, [value, editing])

  if (editing) {
    return (
      <input
        autoFocus
        value={raw}
        onFocus={(e) => e.target.select()}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={() => {
          const n = parseFloat(raw)
          if (!isNaN(n) && n >= 0) onChange(n)
          setEditing(false)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          if (e.key === 'Escape') { setEditing(false); setRaw(String(value)) }
        }}
        style={{
          width: '100%', height: 26, padding: '0 4px',
          fontSize: 12, fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
          border: '1.5px solid rgba(0,113,227,0.5)', borderRadius: 5,
          boxShadow: '0 0 0 3px rgba(0,113,227,0.12)', outline: 'none',
        }}
      />
    )
  }
  return (
    <div
      onClick={() => setEditing(true)}
      style={{
        fontSize: 12, fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
        cursor: 'text', padding: '2px 4px', borderRadius: 5,
        transition: 'background 80ms',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-tint)' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      {prefix}{value}
    </div>
  )
}

function ProductSearch({
  item, products, onUpdate, autoOpen,
}: {
  item: EditorItem
  products: LiveProduct[]
  onUpdate: (updates: Partial<EditorItem>) => void
  autoOpen?: boolean
}) {
  const [open, setOpen] = React.useState(autoOpen ?? false)
  const [query, setQuery] = React.useState('')

  const filtered = products
    .filter((p) => !query || p.name.toLowerCase().includes(query.toLowerCase()) || p.sku.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 6)

  function selectProduct(p: LiveProduct) {
    onUpdate({ productId: p.id, sku: p.sku, productName: p.name, mrp: p.mrp, offerRate: p.mrp })
    setOpen(false)
    setQuery('')
  }

  if (!open) {
    return (
      <div onClick={() => setOpen(true)} style={{ cursor: 'text' }}>
        {item.productName ? (
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{item.productName}</div>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{item.sku}</div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-tertiary)', fontSize: 12 }}>
            <Search size={11} /> Search product…
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search by name or SKU…"
        style={{
          width: '100%', height: 26, padding: '0 6px', fontSize: 12,
          border: '1.5px solid rgba(0,113,227,0.5)', borderRadius: 5, outline: 'none',
          boxShadow: '0 0 0 3px rgba(0,113,227,0.12)',
        }}
      />
      {filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: 30, left: 0, right: 0, zIndex: 100,
          background: 'white', border: '1px solid var(--border-default)',
          borderRadius: 8, boxShadow: 'var(--shadow-lg)', overflow: 'hidden',
        }}>
          {filtered.map((p) => (
            <div
              key={p.id}
              onMouseDown={() => selectProduct(p)}
              style={{
                padding: '7px 10px', cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-tint)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'white' }}
            >
              <div style={{ fontSize: 12, fontWeight: 600 }}>{p.name}</div>
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{p.sku} · {formatINR(p.mrp)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function EditorItemRow({ item, srNo, products, onUpdate, onDelete, isLast }: EditorItemRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id })

  // replacing = cleared product, search auto-open
  const [replacing, setReplacing] = React.useState(false)

  function handleReplace() {
    onUpdate({ productId: '', sku: '', productName: '', mrp: 0, offerRate: 0, qty: 1 })
    setReplacing(true)
  }

  const TD: React.CSSProperties = {
    padding: '6px 6px',
    borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
    verticalAlign: 'middle',
    transition: 'background 80ms',
  }

  return (
    <tr
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        background: isDragging ? 'var(--surface-tint)' : 'transparent',
      }}
    >
      {/* Drag handle */}
      <td style={{ ...TD, width: 20, cursor: 'grab', color: 'var(--text-tertiary)', paddingLeft: 4 }}
        {...attributes} {...listeners}>
        <GripVertical size={12} />
      </td>

      {/* Sr.No */}
      <td style={{ ...TD, width: 28, textAlign: 'center', fontSize: 11, color: 'var(--text-tertiary)' }}>
        {srNo}
      </td>

      {/* Article No (SKU) */}
      <td style={{ ...TD, width: 90, fontSize: 11, fontFamily: 'var(--font-ui)', color: 'var(--text-secondary)' }}>
        {item.sku || '—'}
      </td>

      {/* Product Description */}
      <td style={{ ...TD, minWidth: 180 }}>
        <ProductSearch
          item={item}
          products={products}
          onUpdate={(u) => { onUpdate(u); setReplacing(false) }}
          autoOpen={replacing && !item.productName}
        />
      </td>

      {/* MRP */}
      <td style={{ ...TD, width: 80, textAlign: 'right', fontSize: 12, fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', color: 'var(--text-secondary)' }}>
        {item.mrp ? formatINR(item.mrp) : '—'}
      </td>

      {/* Qty */}
      <td style={{ ...TD, width: 50 }}>
        <InlineNum value={item.qty} onChange={(v) => onUpdate({ qty: Math.max(1, Math.round(v)) })} />
      </td>

      {/* Offer Rate */}
      <td style={{ ...TD, width: 90 }}>
        <InlineNum value={item.offerRate} onChange={(v) => onUpdate({ offerRate: v })} prefix="₹" />
      </td>

      {/* Total */}
      <td style={{ ...TD, width: 90, textAlign: 'right', fontSize: 12, fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
        {formatINR(item.offerRate * item.qty)}
      </td>

      {/* Replace */}
      <td style={{ ...TD, width: 28 }}>
        <button
          onClick={handleReplace}
          title="Replace item"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, border: '1px solid var(--border-default)', borderRadius: 5, background: 'white', cursor: 'pointer', color: 'var(--text-tertiary)' }}
        >
          <RefreshCw size={11} />
        </button>
      </td>

      {/* Delete */}
      <td style={{ ...TD, width: 28 }}>
        <button
          onClick={onDelete}
          title="Delete item"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, border: '1px solid var(--border-default)', borderRadius: 5, background: 'white', cursor: 'pointer', color: '#BE123C' }}
        >
          <Trash2 size={11} />
        </button>
      </td>
    </tr>
  )
}
```

- [ ] **Step 7.2: Type-check**

```bash
pnpm type-check
```

- [ ] **Step 7.3: Commit**

```bash
git add apps/web/src/components/sales/quotations/editor-item-row.tsx
git commit -m "feat(ui): add EditorItemRow — inline editable item with replace + delete"
```

---

## Task 8: Room Section Component

**Files:**
- Create: `apps/web/src/components/sales/quotations/room-section.tsx`

- [ ] **Step 8.1: Create component**

```tsx
// apps/web/src/components/sales/quotations/room-section.tsx
'use client'

import * as React from 'react'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatINR } from '@/lib/format'
import { EditorItemRow, type EditorItem, type LiveProduct } from './editor-item-row'

export interface BuilderRoom {
  id:    string
  name:  string
  items: EditorItem[]
}

interface RoomSectionProps {
  room:     BuilderRoom
  products: LiveProduct[]
  onChange: (updated: BuilderRoom) => void
  onDelete: () => void
}

export function RoomSection({ room, products, onChange, onDelete }: RoomSectionProps) {
  const [editingName, setEditingName] = React.useState(false)
  const [nameValue, setNameValue] = React.useState(room.name)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const mrpTotal   = room.items.reduce((s, i) => s + i.mrp * i.qty, 0)
  const offerTotal = room.items.reduce((s, i) => s + i.offerRate * i.qty, 0)

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    const oldIdx = room.items.findIndex((i) => i.id === active.id)
    const newIdx = room.items.findIndex((i) => i.id === over.id)
    onChange({ ...room, items: arrayMove(room.items, oldIdx, newIdx) })
  }

  function addItem() {
    const newItem: EditorItem = {
      id: `item-${Date.now()}`,
      productId: '', sku: '', productName: '', mrp: 0, qty: 1, offerRate: 0,
    }
    onChange({ ...room, items: [...room.items, newItem] })
  }

  function updateItem(id: string, updates: Partial<EditorItem>) {
    onChange({ ...room, items: room.items.map((i) => i.id === id ? { ...i, ...updates } : i) })
  }

  function deleteItem(id: string) {
    onChange({ ...room, items: room.items.filter((i) => i.id !== id) })
  }

  function handleDeleteRoom() {
    if (room.items.length > 0) {
      if (!window.confirm(`Delete "${room.name}" and its ${room.items.length} item(s)?`)) return
    }
    onDelete()
  }

  function commitName() {
    setEditingName(false)
    if (nameValue.trim()) onChange({ ...room, name: nameValue.trim() })
    else setNameValue(room.name)
  }

  return (
    <div style={{
      border: '1px solid var(--border-default)', borderRadius: 10, marginBottom: 16,
      background: 'white', overflow: 'hidden',
    }}>
      {/* Room header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border-subtle)',
      }}>
        {editingName ? (
          <input
            autoFocus
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => { if (e.key === 'Enter') commitName(); if (e.key === 'Escape') { setEditingName(false); setNameValue(room.name) } }}
            style={{
              fontSize: 14, fontWeight: 700, border: '1.5px solid rgba(0,113,227,0.5)',
              borderRadius: 6, padding: '2px 8px', outline: 'none', background: 'white',
            }}
          />
        ) : (
          <div
            onClick={() => setEditingName(true)}
            style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', cursor: 'text', padding: '2px 4px', borderRadius: 5 }}
            title="Click to rename"
          >
            {room.name}
          </div>
        )}
        <button
          onClick={handleDeleteRoom}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, border: '1px solid var(--border-default)', borderRadius: 6, background: 'white', cursor: 'pointer', color: '#BE123C' }}
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Item table */}
      <div style={{ overflowX: 'auto' }}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.02)' }}>
                <th style={{ width: 20 }} />
                <th style={TH}>Sr.No</th>
                <th style={TH}>Article No</th>
                <th style={{ ...TH, textAlign: 'left' }}>Product Description</th>
                <th style={{ ...TH, textAlign: 'right' }}>MRP</th>
                <th style={TH}>Qty</th>
                <th style={TH}>Offer Rate</th>
                <th style={{ ...TH, textAlign: 'right' }}>Total</th>
                <th style={{ width: 28 }} />
                <th style={{ width: 28 }} />
              </tr>
            </thead>
            <SortableContext items={room.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              <tbody>
                {room.items.map((item, idx) => (
                  <EditorItemRow
                    key={item.id}
                    item={item}
                    srNo={idx + 1}
                    products={products}
                    onUpdate={(u) => updateItem(item.id, u)}
                    onDelete={() => deleteItem(item.id)}
                    isLast={idx === room.items.length - 1}
                  />
                ))}
              </tbody>
            </SortableContext>
          </table>
        </DndContext>
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 16px', borderTop: '1px solid var(--border-subtle)',
      }}>
        <button
          onClick={addItem}
          style={{
            display: 'flex', alignItems: 'center', gap: 5, height: 30, padding: '0 10px',
            borderRadius: 7, border: '1.5px dashed var(--border-default)', background: 'transparent',
            fontSize: 12, color: 'var(--text-tertiary)', cursor: 'pointer',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLElement).style.color = 'var(--accent)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)' }}
        >
          <Plus size={12} /> Add item
        </button>
        <div style={{ display: 'flex', gap: 20, fontSize: 12, fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}>
          <span style={{ color: 'var(--text-tertiary)' }}>MRP: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatINR(mrpTotal)}</span></span>
          <span style={{ color: 'var(--text-tertiary)' }}>Offer: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatINR(offerTotal)}</span></span>
        </div>
      </div>
    </div>
  )
}

const TH: React.CSSProperties = {
  padding: '6px 6px', textAlign: 'center', fontSize: 10, fontWeight: 600,
  color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em',
}
```

- [ ] **Step 8.2: Type-check**

```bash
pnpm type-check
```

- [ ] **Step 8.3: Commit**

```bash
git add apps/web/src/components/sales/quotations/room-section.tsx
git commit -m "feat(ui): add RoomSection component with item table and per-room totals"
```

---

## Task 9: Editor Sidebar

**Files:**
- Create: `apps/web/src/components/sales/quotations/editor-sidebar.tsx`

- [ ] **Step 9.1: Create component**

```tsx
// apps/web/src/components/sales/quotations/editor-sidebar.tsx
'use client'

import * as React from 'react'

export interface SidebarData {
  customerName:       string
  customerPhone:      string
  billingAddress:     string
  siteAddress:        string
  projectName:        string
  salesRep:           string
  brandLabel:         string
  quoteDate:          string   // ISO date string yyyy-mm-dd
  validUntil:         string   // ISO date string yyyy-mm-dd
  notes:              string
  termsAndConditions: string
}

interface EditorSidebarProps {
  data:     SidebarData
  onChange: (updated: SidebarData) => void
}

function Field({
  label, children,
}: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', fontSize: 12, padding: '5px 8px',
  border: '1px solid var(--border-default)', borderRadius: 6,
  outline: 'none', fontFamily: 'var(--font-ui)', boxSizing: 'border-box',
  color: 'var(--text-primary)', background: 'white',
}

const textareaStyle: React.CSSProperties = {
  ...inputStyle, resize: 'vertical', lineHeight: '1.5',
}

export function EditorSidebar({ data, onChange }: EditorSidebarProps) {
  function set(key: keyof SidebarData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange({ ...data, [key]: e.target.value })
  }

  return (
    <div style={{
      width: 260, flexShrink: 0, borderRight: '1px solid var(--border-subtle)',
      overflowY: 'auto', padding: '16px 16px',
    }}>
      <Field label="Customer Name">
        <input value={data.customerName} onChange={set('customerName')} style={inputStyle} />
      </Field>
      <Field label="Phone (NUM)">
        <input value={data.customerPhone} onChange={set('customerPhone')} style={inputStyle} />
      </Field>
      <Field label="Billing Address">
        <textarea value={data.billingAddress} onChange={set('billingAddress')} rows={2} style={textareaStyle} />
      </Field>
      <Field label="Site Address">
        <textarea value={data.siteAddress} onChange={set('siteAddress')} rows={2} style={textareaStyle} />
      </Field>
      <Field label="Project Name">
        <input value={data.projectName} onChange={set('projectName')} style={inputStyle} />
      </Field>
      <Field label="Sales Rep (REF)">
        <input value={data.salesRep} onChange={set('salesRep')} style={inputStyle} />
      </Field>
      <Field label="Brand Label">
        <input value={data.brandLabel} onChange={set('brandLabel')} style={inputStyle} placeholder="e.g. GROHE" />
      </Field>
      <Field label="Quote Date">
        <input type="date" value={data.quoteDate} onChange={set('quoteDate')} style={inputStyle} />
      </Field>
      <Field label="Valid Until">
        <input type="date" value={data.validUntil} onChange={set('validUntil')} style={inputStyle} />
      </Field>
      <Field label="Notes">
        <textarea value={data.notes} onChange={set('notes')} rows={6} style={textareaStyle} />
      </Field>
      <Field label="Terms & Contacts">
        <textarea value={data.termsAndConditions} onChange={set('termsAndConditions')} rows={6} style={textareaStyle} />
      </Field>
    </div>
  )
}
```

- [ ] **Step 9.2: Type-check**

```bash
pnpm type-check
```

- [ ] **Step 9.3: Commit**

```bash
git add apps/web/src/components/sales/quotations/editor-sidebar.tsx
git commit -m "feat(ui): add EditorSidebar — all quotation meta fields"
```

---

## Task 10: Grand Total Bar

**Files:**
- Create: `apps/web/src/components/sales/quotations/grand-total-bar.tsx`

- [ ] **Step 10.1: Create component**

```tsx
// apps/web/src/components/sales/quotations/grand-total-bar.tsx
'use client'

import { formatINR } from '@/lib/format'
import type { BuilderRoom } from './room-section'

export function GrandTotalBar({ rooms }: { rooms: BuilderRoom[] }) {
  const grandMRP   = rooms.reduce((s, r) => s + r.items.reduce((rs, i) => rs + i.mrp * i.qty, 0), 0)
  const grandOffer = rooms.reduce((s, r) => s + r.items.reduce((rs, i) => rs + i.offerRate * i.qty, 0), 0)

  return (
    <div style={{
      position: 'sticky', bottom: 0,
      borderTop: '1px solid var(--border-default)',
      background: 'rgba(255,255,255,0.96)',
      backdropFilter: 'blur(12px)',
      padding: '12px 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 32,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>MRP Total</span>
        <span style={{ fontSize: 15, fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: 'var(--text-primary)' }}>
          {formatINR(grandMRP)}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Offer Total</span>
        <span style={{ fontSize: 18, fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--accent)' }}>
          {formatINR(grandOffer)}
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 10.2: Type-check + commit**

```bash
pnpm type-check
git add apps/web/src/components/sales/quotations/grand-total-bar.tsx
git commit -m "feat(ui): add GrandTotalBar — sticky MRP + offer totals"
```

---

## Task 11: Quotation Editor Orchestrator

**Files:**
- Create: `apps/web/src/components/sales/quotations/quotation-editor.tsx`

This is the full-page builder. It loads data, holds state, wires save + PDF download.

- [ ] **Step 11.1: Define default terms constant**

At the top of `quotation-editor.tsx`, define the pre-populated template:

```tsx
// apps/web/src/components/sales/quotations/quotation-editor.tsx
'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Plus, Download, Send, Save } from 'lucide-react'
import { toast } from 'sonner'
import useSWR from 'swr'
import { StatusBadge } from '../shared/status-badge'
import { EditorSidebar, type SidebarData } from './editor-sidebar'
import { RoomSection, type BuilderRoom } from './room-section'
import { GrandTotalBar } from './grand-total-bar'
import type { LiveProduct } from './editor-item-row'

const DEFAULT_NOTES = `NOTE
1. All rate for Grohe are as per current MRP.
2. Company - Grohe and other Company, can revise MRP without notice.
3. Please confirm order with 100% advance for CP items.
4. Quote remains valid till company MRP remains unchanged. Force majure, w.r.t TAX, MRP.
5. For items with escalated MRP, confirm order with 100% payments, prior to cut off time line.
6. Delivery as per company schedule. Freight extra as per actual.
7. RATE VALID FOR THIS MONTH`

const DEFAULT_TERMS = `Regards,
Buildcon House
MO: +91 9909906652
MAIL: buildconhouse10@gmail.com

TOLL FREE NUMBER
GEBERIT      18001024323
GROHE        18001024475
HANSGROHE    18002093246
VITRA        70451 32132
OYSTER       18001208999`

function todayISO() { return new Date().toISOString().slice(0, 10) }
function plusDaysISO(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ApiRevision {
  id:                 string
  revisionId:         string
  quotationNumber:    string
  status:             string
  isLocked:           boolean
  customerName:       string
  customerPhone:      string
  billingAddress:     string
  siteAddress:        string
  salesRep:           string
  brandLabel:         string
  createdAt:          string
  validUntil:         string | null
  notes:              string
  termsAndConditions: string
  rooms: Array<{
    id:    string
    name:  string
    order: number
    items: Array<{
      id:          string
      productId:   string
      sku:         string
      productName: string
      mrp:         number
      qty:         number
      offerRate:   number
    }>
  }>
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface QuotationEditorProps {
  revisionId: string | null   // null = new quotation
}

// ─── Component ────────────────────────────────────────────────────────────────

export function QuotationEditor({ revisionId }: QuotationEditorProps) {
  const router = useRouter()
  const isNew = revisionId === null

  // Fetch existing revision (skipped for new)
  const { data: revision } = useSWR<ApiRevision>(
    revisionId ? `/api/quotations/${revisionId}` : null,
    (url: string) => fetch(url).then((r) => r.json()),
  )

  // Fetch live product catalogue
  const { data: liveProducts = [] } = useSWR<LiveProduct[]>(
    '/api/products',
    (url: string) => fetch(url).then((r) => r.json()),
  )

  // ─── State ────────────────────────────────────────────────────────

  const [quotationNumber, setQuotationNumber] = React.useState('New Quotation')
  const [status, setStatus]                   = React.useState('DRAFT')
  const [isLocked, setIsLocked]               = React.useState(false)
  const [saving, setSaving]                   = React.useState(false)
  const [downloading, setDownloading]         = React.useState(false)
  const [savedRevisionId, setSavedRevisionId] = React.useState<string | null>(revisionId)

  const [sidebar, setSidebar] = React.useState<SidebarData>({
    customerName:       '',
    customerPhone:      '',
    billingAddress:     '',
    siteAddress:        '',
    projectName:        '',
    salesRep:           '',
    brandLabel:         'GROHE',
    quoteDate:          todayISO(),
    validUntil:         plusDaysISO(30),
    notes:              DEFAULT_NOTES,
    termsAndConditions: DEFAULT_TERMS,
  })

  const [rooms, setRooms] = React.useState<BuilderRoom[]>([
    { id: `room-${Date.now()}`, name: 'Room 1', items: [] },
  ])

  // ─── Hydrate from API ─────────────────────────────────────────────

  React.useEffect(() => {
    if (!revision) return
    setQuotationNumber(revision.quotationNumber)
    setStatus(revision.status)
    setIsLocked(revision.isLocked)
    setSidebar({
      customerName:       revision.customerName,
      customerPhone:      revision.customerPhone,
      billingAddress:     revision.billingAddress,
      siteAddress:        revision.siteAddress,
      projectName:        '',
      salesRep:           revision.salesRep,
      brandLabel:         revision.brandLabel,
      quoteDate:          revision.createdAt.slice(0, 10),
      validUntil:         revision.validUntil?.slice(0, 10) ?? plusDaysISO(30),
      notes:              revision.notes || DEFAULT_NOTES,
      termsAndConditions: revision.termsAndConditions || DEFAULT_TERMS,
    })
    setRooms(
      revision.rooms.length > 0
        ? revision.rooms.map((r) => ({
            id:    r.id,
            name:  r.name,
            items: r.items.map((i) => ({
              id:          i.id,
              productId:   i.productId,
              sku:         i.sku,
              productName: i.productName,
              mrp:         i.mrp,
              qty:         i.qty,
              offerRate:   i.offerRate,
            })),
          }))
        : [{ id: `room-${Date.now()}`, name: 'Room 1', items: [] }],
    )
  }, [revision?.revisionId])

  // ─── Unsaved-changes warning ──────────────────────────────────────

  React.useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  // ─── Save ─────────────────────────────────────────────────────────

  async function handleSave(): Promise<string | null> {
    setSaving(true)
    try {
      const payload = {
        customerName:       sidebar.customerName,
        customerPhone:      sidebar.customerPhone,
        billingAddress:     sidebar.billingAddress,
        siteAddress:        sidebar.siteAddress,
        salesRep:           sidebar.salesRep,
        brandLabel:         sidebar.brandLabel,
        validUntil:         sidebar.validUntil ? new Date(sidebar.validUntil).toISOString() : undefined,
        notes:              sidebar.notes,
        termsAndConditions: sidebar.termsAndConditions,
        rooms: rooms.map((r) => ({
          name:  r.name,
          items: r.items
            .filter((i) => i.productId)
            .map((i) => ({ sku: i.sku, qty: i.qty, offerRate: i.offerRate })),
        })),
      }

      if (!savedRevisionId) {
        // Create new
        const res = await fetch('/api/quotations', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            customerName: sidebar.customerName,
            siteAddress:  sidebar.siteAddress,
            projectName:  sidebar.projectName,
            notes:        sidebar.notes,
            lineItems:    [],        // POST creates with no items; PATCH fills rooms
          }),
        })
        if (!res.ok) throw new Error((await res.json() as { message?: string }).message ?? 'Save failed')
        const data = await res.json() as { revisionId: string; quotationNumber: string }
        setSavedRevisionId(data.revisionId)
        setQuotationNumber(data.quotationNumber)

        // Now save rooms via PATCH
        const patchRes = await fetch(`/api/quotations/${data.revisionId}`, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload),
        })
        if (!patchRes.ok) throw new Error((await patchRes.json() as { message?: string }).message ?? 'Save failed')

        toast.success('Quotation created')
        router.replace(`/sales/quotations/${data.revisionId}`)
        return data.revisionId
      } else {
        const res = await fetch(`/api/quotations/${savedRevisionId}`, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload),
        })
        if (!res.ok) throw new Error((await res.json() as { message?: string }).message ?? 'Save failed')
        toast.success('Saved')
        return savedRevisionId
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save')
      return null
    } finally {
      setSaving(false)
    }
  }

  // ─── PDF Download ─────────────────────────────────────────────────

  async function handleDownloadPdf() {
    let rid = savedRevisionId
    if (!rid) {
      rid = await handleSave()
      if (!rid) return
    }
    setDownloading(true)
    try {
      const res = await fetch(`/api/quotations/${rid}/pdf`)
      if (!res.ok) throw new Error('PDF generation failed')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `${quotationNumber}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not generate PDF')
    } finally {
      setDownloading(false)
    }
  }

  // ─── Rooms ────────────────────────────────────────────────────────

  function addRoom() {
    setRooms((prev) => [...prev, { id: `room-${Date.now()}`, name: `Room ${prev.length + 1}`, items: [] }])
  }

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 24px', borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(12px)', flexShrink: 0,
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', color: 'var(--accent)' }}>
            {quotationNumber}
          </span>
          <StatusBadge status={status.toLowerCase() as never} size="md" />
          {isLocked && (
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: '#FEF3C7', color: '#92400E', fontWeight: 600 }}>
              Locked
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => void handleSave()}
            disabled={saving || isLocked}
            style={{ display: 'flex', alignItems: 'center', gap: 5, height: 32, padding: '0 14px', borderRadius: 7, border: '1px solid var(--border-default)', background: 'white', fontSize: 12, fontWeight: 500, cursor: saving || isLocked ? 'not-allowed' : 'pointer', color: 'var(--text-secondary)', opacity: saving ? 0.6 : 1 }}
          >
            <Save size={13} /> {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={() => void handleDownloadPdf()}
            disabled={downloading}
            style={{ display: 'flex', alignItems: 'center', gap: 5, height: 32, padding: '0 14px', borderRadius: 7, border: 'none', background: '#1D4ED8', color: 'white', fontSize: 12, fontWeight: 600, cursor: downloading ? 'not-allowed' : 'pointer', opacity: downloading ? 0.7 : 1 }}
          >
            <Download size={13} /> {downloading ? 'Generating…' : 'Download PDF'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Left sidebar */}
        <EditorSidebar data={sidebar} onChange={setSidebar} />

        {/* Main area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column' }}>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
          >
            {rooms.map((room) => (
              <RoomSection
                key={room.id}
                room={room}
                products={liveProducts}
                onChange={(updated) => setRooms((prev) => prev.map((r) => r.id === room.id ? updated : r))}
                onDelete={() => setRooms((prev) => prev.filter((r) => r.id !== room.id))}
              />
            ))}

            {/* Add Room */}
            <button
              onClick={addRoom}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, height: 40, padding: '0 18px',
                borderRadius: 8, border: '1.5px dashed var(--border-default)', background: 'transparent',
                fontSize: 13, color: 'var(--text-tertiary)', cursor: 'pointer', marginBottom: 80,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLElement).style.color = 'var(--accent)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)' }}
            >
              <Plus size={14} /> Add Room
            </button>
          </motion.div>

          {/* Grand Total Bar */}
          <GrandTotalBar rooms={rooms} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 11.2: Type-check**

```bash
pnpm type-check
```

- [ ] **Step 11.3: Commit**

```bash
git add apps/web/src/components/sales/quotations/quotation-editor.tsx
git commit -m "feat(ui): add QuotationEditor full-page builder orchestrator"
```

---

## Task 12: New Routes

**Files:**
- Create: `apps/web/src/app/(dashboard)/sales/quotations/new/page.tsx`
- Create: `apps/web/src/app/(dashboard)/sales/quotations/[id]/page.tsx`

- [ ] **Step 12.1: Create /new route**

```tsx
// apps/web/src/app/(dashboard)/sales/quotations/new/page.tsx

import { QuotationEditor } from '@/components/sales/quotations/quotation-editor'

export const metadata = { title: 'New Quotation — Forge' }

export default function NewQuotationPage() {
  return <QuotationEditor revisionId={null} />
}
```

- [ ] **Step 12.2: Create /[id] route**

```tsx
// apps/web/src/app/(dashboard)/sales/quotations/[id]/page.tsx

import { QuotationEditor } from '@/components/sales/quotations/quotation-editor'

export const metadata = { title: 'Edit Quotation — Forge' }

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditQuotationPage({ params }: Props) {
  const { id } = await params
  return <QuotationEditor revisionId={id} />
}
```

- [ ] **Step 12.3: Type-check**

```bash
pnpm type-check
```

- [ ] **Step 12.4: Commit**

```bash
git add apps/web/src/app/(dashboard)/sales/quotations/new/ apps/web/src/app/(dashboard)/sales/quotations/[id]/
git commit -m "feat(routing): add /sales/quotations/new and /sales/quotations/[id] pages"
```

---

## Task 13: Update Quotations List — Navigate Instead of Slide-Over

**Files:**
- Modify: `apps/web/src/components/sales/quotations/quotations-client.tsx`

- [ ] **Step 13.1: Apply edits to quotations-client.tsx**

**a) Remove the `QuotationBuilder` import (line 11):**
```diff
- import { QuotationBuilder } from './quotation-builder'
```

**b) Add `useRouter` to the next.js import:**
```diff
+ import { useRouter } from 'next/navigation'
```

**c) Inside `QuotationsClient`, remove `selectedQuotation` state (line 72) and add `router`:**
```diff
- const [selectedQuotation, setSelectedQuotation] = React.useState<Quotation | null>(null)
+ const router = useRouter()
```

**d) Remove `mutate` from the SWR destructure (it's only used in the removed `onClose`):**
```diff
- const { data: apiQuotations = [], isLoading, mutate } = useSWR<ApiQuotation[]>(
+ const { data: apiQuotations = [], isLoading } = useSWR<ApiQuotation[]>(
```

**e) Replace "New Quotation" button handler (line 136):**
```diff
- <Button size="sm" onClick={() => toast.success('New quotation coming soon')}>
+ <Button size="sm" onClick={() => router.push('/sales/quotations/new')}>
```

**f) Replace `onRowClick` on `<QuotationTable>` (line 214):**
```diff
- <QuotationTable data={filtered} globalFilter={search} onRowClick={setSelectedQuotation} />
+ <QuotationTable data={filtered} globalFilter={search} onRowClick={(q) => router.push(`/sales/quotations/${q.revisionId ?? ''}`)} />
```

**g) Remove the `<QuotationBuilder ...>` block (lines 216–220):**
```diff
- <QuotationBuilder
-   quotation={selectedQuotation}
-   onClose={() => { setSelectedQuotation(null); void mutate() }}
-   onConvertToOrder={() => {}}
- />
```

- [ ] **Step 13.3: Type-check**

```bash
pnpm type-check
```

Expected: 0 errors.

- [ ] **Step 13.4: Manual smoke test**

```bash
pnpm dev
```

Navigate to `http://localhost:3000/sales/quotations`. Verify:
- Clicking a row navigates to `/sales/quotations/<revisionId>`
- "New Quotation" button navigates to `/sales/quotations/new`
- The editor page renders with the left sidebar and main area
- If the quotation has rooms+items, they appear in the editor
- "Save" button saves and shows a toast
- "Download PDF" downloads a `.pdf` file that opens correctly

- [ ] **Step 13.5: Commit**

```bash
git add apps/web/src/components/sales/quotations/quotations-client.tsx
git commit -m "feat(ui): update quotation list — rows navigate to full-page editor"
```

---

## Task 14: Final Integration Check

- [ ] **Step 14.1: Full type-check**

```bash
pnpm type-check
```

Expected: 0 errors.

- [ ] **Step 14.2: Build**

```bash
pnpm build
```

Expected: build completes without errors.

- [ ] **Step 14.3: End-to-end manual test**

With `pnpm dev` running:

1. Go to `/sales/quotations` → click "New Quotation"
2. Fill: Customer Name, Phone, Sales Rep, Brand Label
3. Rename "Room 1" → "BATHROOM 1,2"
4. Add items — search for a product, set qty + offer rate
5. Add a second room "KITCHEN", add items
6. Click "Save" → URL changes to `/sales/quotations/<revisionId>`, toast confirms
7. Refresh page → all data reloads correctly
8. Click "Download PDF" → PDF downloads, opens with correct cover page and room detail pages
9. Go back to list → row appears, click it → editor loads with saved state
10. Replace an item (⇄ icon) → product clears, search opens, qty=1 after select
11. Delete a room with items → confirm dialog appears

- [ ] **Step 14.4: Final commit**

```bash
git add -A
git commit -m "feat: complete quotation builder full-page editor + PDF generation"
```
