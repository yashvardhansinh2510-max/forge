export const metadata = { title: 'New Purchase Order — Forge' }

export default function PurchasesNewPage() {
  return (
    <div className="flex h-full items-center justify-center bg-[var(--bg)] p-6">
      <div className="max-w-2xl rounded-[32px] border border-[var(--border)] bg-white p-8 shadow-[0_18px_36px_rgba(15,23,42,0.06)]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
          Purchase orders
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
          New PO creation is being folded into the tracker rebuild
        </h2>
        <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
          The old draft grid was tied to the legacy procurement surface that this replacement removes.
          This route stays live, but the active work is now centered on the new purchases tracker page.
        </p>
      </div>
    </div>
  )
}
