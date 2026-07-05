# Testing

100% test coverage is the key to great vibe coding. Tests let you move fast, trust your instincts, and ship with confidence — without them, vibe coding is just yolo coding.

## Framework

**vitest v4** + **@testing-library/react** in `apps/web`.

## Running Tests

```bash
# From repo root
pnpm --filter @forge/web test

# Watch mode
pnpm --filter @forge/web test:watch

# From apps/web directly
cd apps/web && pnpm test
```

## Test Layers

- **Unit tests** (`src/__tests__/`) — pure functions, mappers, utilities. Fast, no network.
- **Component tests** — React components with @testing-library/react + jsdom.
- **Integration tests** — API routes + DB (future, needs test DB).

## Conventions

- Files: `src/__tests__/foo.test.ts` or colocated `foo.test.tsx` next to the component
- Assertions: use `@testing-library/jest-dom` matchers (`toBeInTheDocument`, `toHaveTextContent`, etc.)
- Mocks: `vi.mock()` for modules; `vi.fn()` for functions
- Never test implementation details — test behavior
