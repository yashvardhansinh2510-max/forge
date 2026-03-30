# Forge — Claude Reference

> This file is automatically loaded at the start of every Claude Code session.
> Keep it current. Full details live in `docs/`.

---

## What Is This Project?

**Forge** is a SaaS business operating system built for **Buildcon House** — a luxury sanitaryware dealer in Mumbai that sells Grohe, Axor, Hansgrohe, Vitra, and Kajaria products to architects, interior designers, and builders.

This is a **monorepo** running on Turborepo + pnpm workspaces.

- Full PRD: [`docs/PRD.md`](docs/PRD.md)
- Architecture details: [`docs/architecture.md`](docs/architecture.md)
- Design system rules: [`docs/design-system.md`](docs/design-system.md)
- Agent teams reference: [`docs/agent-teams-reference.md`](docs/agent-teams-reference.md)

---

## Project Structure

```
forge/
├── apps/
│   └── web/                  # Next.js 15 app (primary)
│       └── src/
│           ├── app/          # App Router pages
│           ├── components/   # Feature components (one folder per module)
│           └── lib/
│               ├── mock/     # ALL data is mock — no real DB yet
│               └── navigation.ts
├── packages/
│   ├── ui/                   # Shared component library (@forge/ui)
│   └── db/                   # Prisma client (@forge/db) — schema is EMPTY
└── docs/                     # Reference documents
```

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 15, App Router, React 18 |
| Monorepo | Turborepo + pnpm workspaces |
| Auth | Clerk (`@clerk/nextjs`) |
| Styling | Tailwind CSS v4 |
| UI Primitives | Radix UI (via `@forge/ui`) |
| Fonts | Geist Sans (`--font-ui`) · Geist Mono (`--font-mono`) |
| Animation | Framer Motion (`pageVariants` wraps every page) |
| State | Zustand |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Tables | TanStack Table + TanStack Virtual |
| Drag & Drop | @dnd-kit |
| Toasts | Sonner |
| Database | PostgreSQL + Prisma (`packages/db`) — **schema currently empty** |
| Data | **100% mock data** in `apps/web/src/lib/mock/` |

---

## Running the Project

```bash
# Install (from repo root)
pnpm install

# Start dev server
pnpm dev
# → http://localhost:3000

# Type-check
pnpm type-check

# Build
pnpm build
```

---

## Current App State

- **All data is mock** — `src/lib/mock/*.ts` files. Prisma schema is a placeholder.
- **Auth is optional** — Clerk is wired but gracefully degrades if `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is not set
- **Routes that are placeholders**: `/manufacturing/orders`, `/reports`, `/settings` — show "module is being built" state
- **Catalogue** — empty state UI (no data yet)
- **Agent teams** — enabled via `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in settings

---

## Modules

| Module | Routes | Status |
|---|---|---|
| Dashboard | `/dashboard` | ✅ Full (KPIs, charts, activity, quick actions) |
| CRM | `/crm/contacts`, `/crm/companies`, `/crm/pipeline`, `/crm/activities` | ✅ Full |
| Sales | `/sales/quotations`, `/sales/orders`, `/sales/deliveries` | ✅ Full |
| Samples | `/samples` | ✅ Full |
| Inventory | `/inventory/products`, `/inventory/warehouses`, `/inventory/movements` | ✅ Full |
| Manufacturing | `/manufacturing/orders` | 🚧 Placeholder |
| Invoicing | `/invoicing/invoices`, `/invoicing/payments` | ✅ Full |
| Reports | `/reports` | 🚧 Placeholder |
| Catalogue | `/catalogue` | 🚧 Empty state |
| Price Lists | `/settings/price-lists` | ✅ Full |
| Settings | `/settings` | 🚧 Placeholder |

---

## Critical Conventions

### Typography — Apple-quality numbers
Every financial number, price, date, SKU, invoice/order number must use:
```tsx
style={{
  fontFamily: 'var(--font-ui)',        // NEVER var(--font-mono) for data
  fontVariantNumeric: 'tabular-nums',  // prevents digit-width jitter
}}
```
`var(--font-mono)` is only for keyboard shortcut labels (e.g., `⌘K`).

### Page animations
Every page is wrapped in Framer Motion `pageVariants` (opacity 0→1, 220ms). Screenshots taken immediately after navigation will look blank — this is expected, not a bug.

### Shared layouts
- `/sales/*` pages all get `SalesNav` injected via `/sales/layout.tsx`. Tabs: Quotations, Orders, Deliveries.
- `/crm/*` pages share a CRM tab bar (Contacts, Companies, Pipeline, Activities).
- `/inventory/*` pages share an Inventory tab bar (Products, Warehouses, Stock Movements).
- `/invoicing/*` pages share a Finance tab bar (Invoices, Payments).

### Buildcon House branding
All content must reflect the Buildcon House business:
- **Products**: Grohe, Axor, Hansgrohe, Vitra, Kajaria
- **Customers**: Architects, interior designers, builders in Mumbai (Lodha, Prestige, Oberoi Realty, Mehta Architects, etc.)
- **Locations**: Showroom & Experience Centre (Mumbai), Main Godown (Bhiwandi), Dispatch Hub (Navi Mumbai)
- **Currency**: Indian Rupees (₹), Indian numbering (lakhs/crores)
- **Tax**: CGST + SGST @ 14% each
- **Price tiers**: Retail (MRP), Trade & Architect (12% below), Builder/Project (18% below)

### Component patterns
- Slide-overs: click on a table row → right panel slides in (not a modal)
- Kanban board in CRM/Pipeline using @dnd-kit
- `font-ui` + `tabular-nums` on all financial/numeric data
- Empty states for every module with contextual CTAs

---

## @forge/ui Package

Shared component library at `packages/ui/`. Key exports:
- Design tokens: `--font-ui` (Geist Sans), `--font-mono` (Geist Mono), `--text-primary`, `--text-secondary`, etc.
- `pageVariants` — Framer Motion animation config used on every page
- `useRecentPages`, `useBreadcrumbs` — navigation hooks
- Primitives: Button, Input, Badge, Card, Avatar, Skeleton, Tooltip, etc.

Import as: `import { ... } from '@forge/ui'`

---

## Environment Variables

```bash
# Required for auth (optional — app degrades gracefully without it)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Required for database (not yet connected)
DATABASE_URL=postgresql://...

# Agent teams (experimental)
CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

---

## What NOT to Do

- Don't use `var(--font-mono)` on data/numbers — use `var(--font-ui)` + `fontVariantNumeric: 'tabular-nums'`
- Don't create modals for row details — use slide-over panels
- Don't add non-Buildcon House product/customer names to mock data
- Don't import `@prisma/client` directly in the web app — use `@forge/db`
- Don't use `@vercel/postgres` or `@vercel/kv` — these are sunset (use Neon + Upstash)
- Don't hardcode currency symbols without ₹ — always Indian Rupees
