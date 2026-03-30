# Forge — Architecture Reference

---

## Monorepo Structure

```
forge/
├── apps/
│   └── web/                          # @forge/web — Next.js 15 app
│       └── src/
│           ├── app/                  # App Router (pages + layouts)
│           │   ├── (auth)/           # Sign-in/sign-up (Clerk)
│           │   └── (dashboard)/      # Main app (protected)
│           │       ├── layout.tsx    # Auth guard + DashboardShell
│           │       ├── crm/
│           │       ├── sales/        # Has shared layout.tsx for SalesNav
│           │       ├── samples/
│           │       ├── inventory/    # Has shared layout.tsx for InventoryNav
│           │       ├── manufacturing/
│           │       ├── invoicing/    # Has shared layout.tsx for InvoicingNav
│           │       ├── reports/
│           │       ├── catalogue/
│           │       └── settings/
│           ├── components/           # Feature components (mirrored to app/)
│           │   ├── layout/           # Shell, header, sidebar, command palette
│           │   ├── dashboard/
│           │   ├── crm/
│           │   ├── sales/
│           │   ├── inventory/
│           │   ├── invoicing/
│           │   ├── samples/
│           │   └── settings/
│           └── lib/
│               ├── mock/             # All mock data (replace with API calls later)
│               ├── navigation.ts     # NAV_GROUPS, isNavItemActive
│               ├── format.ts         # Currency formatting helpers
│               ├── user-context.tsx  # User context (dev fallback)
│               └── clerk-user-provider.tsx
├── packages/
│   ├── ui/                           # @forge/ui — shared component library
│   │   └── src/
│   │       ├── components/           # Button, Input, Badge, Card, Avatar, etc.
│   │       ├── hooks/                # useRecentPages, useBreadcrumbs
│   │       └── lib/                  # pageVariants, cn utility
│   └── db/                           # @forge/db — Prisma client
│       └── prisma/
│           └── schema.prisma         # ⚠️ EMPTY — needs building
└── docs/                             # This folder
```

---

## Key Architectural Patterns

### 1. Page Layout Pattern

Every dashboard page follows this pattern:

```
/app/(dashboard)/[module]/[page]/page.tsx
  └── <PageContainer title="..." subtitle="...">
        └── <ModuleClient />       ← 'use client' component with all logic
```

`PageContainer` from `@forge/ui` handles:
- Consistent padding and max-width
- Breadcrumb context
- Page title animation

### 2. Slide-Over Pattern

Clicking a table row opens a right-side panel (not a modal):

```tsx
const [selectedId, setSelectedId] = useState<string | null>(null)

// Table with onRowClick → setSelectedId
// Conditionally render SlideOver panel when selectedId !== null
```

Never use dialogs/modals for record detail views. Always slide-over panels.

### 3. Shared Module Layouts

Some modules inject a tab bar via `layout.tsx`:

```
/sales/layout.tsx    → injects <SalesNav> (Quotations | Orders | Deliveries)
/crm/layout.tsx      → injects CRM tab bar
/inventory/layout.tsx → injects Inventory tab bar
/invoicing/layout.tsx → injects Invoicing tab bar
```

When adding a new route to a module, add its tab to the shared nav component.

### 4. Mock Data Flow

```
lib/mock/[module]-data.ts → component imports directly → renders
```

Future: replace mock imports with `fetch('/api/[module]')` or Prisma calls in Server Components.

### 5. Authentication Flow

```
Clerk configured? Yes → ClerkProvider wraps app
                       → DashboardLayout checks auth()
                       → Redirect to /sign-in if no userId

Clerk not configured? → DashboardLayout skips auth
                      → DefaultUserProvider provides fallback user
```

---

## Data Models (Current Mock Structure)

These represent the shapes in `lib/mock/`. The Prisma schema should mirror these.

### Project → Room → Item (POS — to be built)
```ts
Project {
  id: string
  name: string
  clientId: string
  discount: number   // global % discount
  rooms: Room[]
  status: 'draft' | 'quoted' | 'confirmed' | 'fulfilled'
}

Room {
  id: string
  projectId: string
  name: string      // "Bathroom 1", "Master Bath", etc.
  items: RoomItem[]
}

RoomItem {
  id: string
  roomId: string
  productId: string
  quantity: number
  selectedFinish: string
  unitPrice: number
  discount: number  // override global
  concealedPartIds: string[]  // auto-bundled
}
```

### CRM
```ts
Contact { id, name, role, company, email, phones, tags, ownerId }
Company { id, name, industry, revenue, contacts: Contact[] }
Deal { id, title, stage, value, companyId, contactId, expectedCloseDate }
Activity { id, type, description, relatedTo, createdBy, createdAt }
```

### Sales
```ts
Quotation { id, customerId, projectId, items: LineItem[], status, validUntil }
Order { id, quotationId, items: LineItem[], status, deliveryDate }
Delivery { id, orderId, items: DeliveryItem[], dispatchDate, status }
```

### Inventory
```ts
Product { id, sku, name, brand, category, price, gstRate, stockQty, warehouseId }
Warehouse { id, name, location, managerId, skuCount, unitCount, value }
StockMovement { id, productId, type, qty, from, to, reference, by, date }
```

### Invoicing
```ts
Invoice { id, customerId, orderId, lineItems, subtotal, gst, total, status, dueDate }
Payment { id, invoiceId, amount, method, reference, receivedDate }
```

---

## Component Library (@forge/ui)

### Design Tokens (CSS Variables)
```css
--font-ui: Geist Sans       /* ALL text, numbers, data */
--font-mono: Geist Mono     /* Only: keyboard shortcuts (⌘K) */
--font-display: Bricolage Grotesque  /* Hero headings only */
--text-primary
--text-secondary
--text-muted
--background
--surface
--border
--accent
```

### Animation
```ts
// pageVariants — applied to every page
initial: { opacity: 0, y: 6 }
animate: { opacity: 1, y: 0, transition: { duration: 0.22 } }
```

### Key Components
- `Button` — variant: default, destructive, outline, ghost, link
- `Badge` — variant: default, secondary, destructive, outline
- `Card`, `CardHeader`, `CardContent`, `CardFooter`
- `Input`, `Avatar`, `Skeleton`, `Tooltip`, `TooltipProvider`
- `pageVariants` — Framer Motion config
- `useRecentPages()` — tracks recently visited pages for command palette
- `useBreadcrumbs()` — generates breadcrumb trail from pathname

---

## Next Steps for DB Integration

1. Build out `packages/db/prisma/schema.prisma` with models above
2. Run `pnpm --filter @forge/db db:push` to create tables
3. Replace mock imports with `import { prisma } from '@forge/db'` in Server Components
4. Add API route handlers for client-side mutations
5. Connect Clerk userId to `User` model for multi-tenant scoping
