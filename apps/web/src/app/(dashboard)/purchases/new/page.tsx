import Link from 'next/link'

export const metadata = { title: 'New Purchase Order — Forge' }

export default function PurchasesNewPage() {
  return (
    <div className="flex h-full items-center justify-center bg-[var(--bg)] p-6">
      <div className="max-w-lg rounded-[32px] border border-[var(--border)] bg-white p-8 shadow-[0_18px_36px_rgba(15,23,42,0.06)]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
          Purchase orders
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
          POs are created from quotations
        </h2>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
          Open an accepted quotation in Sales and click <strong className="font-medium text-[var(--text-primary)]">Lock &amp; Create PO</strong> to generate a purchase order. New line items will appear as <span className="font-medium text-[var(--text-primary)]">Unallocated</span> in the tracker.
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            href="/sales/quotations"
            className="rounded-full bg-[#0f172a] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#1e293b]"
          >
            Go to Quotations
          </Link>
          <Link
            href="/purchases"
            className="rounded-full border border-[var(--border)] bg-white px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
          >
            View Tracker
          </Link>
        </div>
      </div>
    </div>
  )
}
