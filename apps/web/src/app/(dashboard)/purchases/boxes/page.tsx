export const metadata = { title: 'Box Tracker — Forge' }

export default function PurchasesBoxesPage() {
  return (
    <div className="flex h-full items-center justify-center bg-[var(--bg)] p-6">
      <div className="max-w-2xl rounded-[32px] border border-[var(--border)] bg-white p-8 shadow-[0_18px_36px_rgba(15,23,42,0.06)]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
          Box queue
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
          Dispatch box tooling is queued behind the tracker replacement
        </h2>
        <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
          The previous box tracker depended on the same legacy procurement graph that has been retired.
          This route remains intact so the purchases section still navigates cleanly while the new flow lands.
        </p>
      </div>
    </div>
  )
}
