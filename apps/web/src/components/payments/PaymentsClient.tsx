'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { formatINR } from '@/lib/mock/dashboard-data'
import RecordPaymentModal from '@/components/payments/RecordPaymentModal'
import type { PaymentsListResponse, PaymentSummary } from '@/app/api/payments/route'
import type { PaymentDetailResponse } from '@/app/api/payments/[orderId]/route'

// ── Fetcher ────────────────────────────────────────────────────────────────────

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to load')
  return res.json() as Promise<T>
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function pct(paid: number, total: number): number {
  if (total <= 0) return 0
  return Math.min(100, Math.round((paid / total) * 100))
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const METHOD_LABEL: Record<string, string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  BANK_TRANSFER: 'Bank Transfer',
  CHEQUE: 'Cheque',
  CREDIT_CARD: 'Credit Card',
}

const STATUS_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  CONFIRMED:  { bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6' },
  PROCESSING: { bg: '#FFFBEB', text: '#B45309', dot: '#F59E0B' },
  DISPATCHED: { bg: '#F5F3FF', text: '#6D28D9', dot: '#8B5CF6' },
  DELIVERED:  { bg: '#F0FDF4', text: '#15803D', dot: '#22C55E' },
  CANCELLED:  { bg: '#FFF1F2', text: '#BE123C', dot: '#F43F5E' },
}

function buildWhatsAppMessage(order: PaymentSummary): string {
  const msg = `Dear ${order.customerName},\n\nThis is a gentle reminder for order ${order.number}.\n\n🧾 Order Total: ${formatINR(order.offerTotal)}\n✅ Received: ${formatINR(order.paidTotal)}\n⏳ Outstanding: ${formatINR(order.outstandingTotal)}\n\nKindly arrange payment at your earliest convenience.\n\nThank you,\nBuildcon House`
  return `https://wa.me/${order.customerPhone?.replace(/\s+/g, '').replace('+', '')}?text=${encodeURIComponent(msg)}`
}

// ── Loading shimmer ────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-[20px] animate-shimmer bg-[linear-gradient(90deg,#f4f4f3,#ffffff,#f4f4f3)]" />
        ))}
      </div>
      <div className="flex flex-1 gap-3 overflow-hidden rounded-[28px] border border-[var(--border)]">
        <div className="w-[300px] animate-shimmer bg-[linear-gradient(90deg,#f4f4f3,#ffffff,#f4f4f3)]" />
        <div className="flex-1 animate-shimmer bg-[linear-gradient(90deg,#f4f4f3,#ffffff,#f4f4f3)]" />
      </div>
    </div>
  )
}

// ── KPI cell ──────────────────────────────────────────────────────────────────

function KpiCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-[20px] border border-[var(--border)] bg-white px-5 py-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</p>
      <p
        className="mt-2 text-2xl font-semibold tracking-[-0.04em]"
        style={{ color: color ?? 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}
      >
        {value}
      </p>
    </div>
  )
}

// ── Order row ─────────────────────────────────────────────────────────────────

function OrderRow({
  order,
  selected,
  onClick,
}: {
  order: PaymentSummary
  selected: boolean
  onClick: () => void
}) {
  const p = pct(order.paidTotal, order.offerTotal)
  const isPaid = order.outstandingTotal === 0
  const statusStyle = STATUS_STYLE[order.status] ?? STATUS_STYLE['CONFIRMED']!

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full border-b border-[var(--border)] px-4 py-3 text-left transition-colors hover:bg-[var(--n-50)]"
      style={{
        borderLeft: selected ? '3px solid #2563EB' : '3px solid transparent',
        background: selected ? '#EFF6FF' : undefined,
      }}
    >
      <div className="mb-1 flex items-start justify-between gap-2">
        <span className="truncate text-[13px] font-semibold text-[var(--text-primary)]">
          {order.customerName}
        </span>
        {isPaid ? (
          <span className="shrink-0 rounded-full bg-[rgba(22,163,74,0.08)] px-2 py-0.5 text-[10px] font-semibold text-[#16A34A]">
            ✓ Paid
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-[rgba(220,38,38,0.08)] px-2 py-0.5 text-[10px] font-semibold text-[#DC2626]"
            style={{ fontVariantNumeric: 'tabular-nums' }}>
            {formatINR(order.outstandingTotal, true)} due
          </span>
        )}
      </div>

      <p className="mb-2 text-[11px] text-[var(--text-muted)]">
        {order.number} · {fmtDate(order.createdAt)}
      </p>

      <div className="h-[3px] overflow-hidden rounded-full bg-[var(--n-150)]">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${p}%`,
            background: isPaid ? '#16A34A' : p > 50 ? '#D97706' : '#DC2626',
          }}
        />
      </div>
      <p className="mt-1 text-[10px] text-[var(--text-muted)]" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {isPaid ? '100% — fully paid' : `${p}% collected`}
      </p>
    </button>
  )
}

// ── Financial box ─────────────────────────────────────────────────────────────

function FinBox({ label, value, sub, valueColor }: { label: string; value: string; sub: string; valueColor: string }) {
  return (
    <div className="rounded-[14px] border border-[var(--border)] bg-white px-3 py-3 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">{label}</p>
      <p
        className="mt-1 text-[15px] font-bold tracking-[-0.03em]"
        style={{ color: valueColor, fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-ui)' }}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[10px]" style={{ color: valueColor, opacity: 0.7 }}>{sub}</p>
    </div>
  )
}

// ── Detail panel ──────────────────────────────────────────────────────────────

function DetailPanel({
  summary,
  onRecordPayment,
}: {
  summary: PaymentSummary
  onRecordPayment: () => void
}) {
  const { data: detail, isLoading } = useSWR<PaymentDetailResponse>(
    `/api/payments/${summary.id}`,
    fetcher,
    { revalidateOnFocus: true },
  )

  const discountSaving = summary.mrpTotal - summary.offerTotal
  const statusStyle = STATUS_STYLE[summary.status] ?? STATUS_STYLE['CONFIRMED']!
  const isPaid = summary.outstandingTotal === 0

  return (
    <div className="flex h-full flex-col overflow-y-auto p-5">

      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-[16px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
              {summary.customerName}
            </h2>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ background: statusStyle.bg, color: statusStyle.text }}
            >
              <span
                className="mr-1 inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: statusStyle.dot, verticalAlign: 'middle' }}
              />
              {summary.status}
            </span>
          </div>
          <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
            {summary.number} · Confirmed {fmtDate(summary.createdAt)}
            {summary.projectName ? ` · ${summary.projectName}` : ''}
          </p>
        </div>

        {/* Contact buttons */}
        <div className="flex shrink-0 gap-2">
          {summary.customerPhone && (
            <>
              <a
                href={buildWhatsAppMessage(summary)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-[10px] border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-2 text-[11px] font-semibold text-[#16A34A] transition hover:bg-[#dcfce7]"
              >
                📲 WhatsApp
              </a>
              <a
                href={`tel:${summary.customerPhone}`}
                className="flex items-center gap-1.5 rounded-[10px] border border-[var(--border)] bg-white px-3 py-2 text-[11px] font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)]"
              >
                📞 Call
              </a>
            </>
          )}
        </div>
      </div>

      {/* Financial boxes */}
      <div className="mb-4 grid grid-cols-4 gap-2">
        <FinBox
          label="MRP"
          value={formatINR(summary.mrpTotal)}
          sub="Catalogue price"
          valueColor="var(--text-primary)"
        />
        <FinBox
          label="Disc. Rate"
          value={formatINR(summary.offerTotal)}
          sub={`Save ${formatINR(discountSaving)}`}
          valueColor="#2563EB"
        />
        <FinBox
          label="Paid"
          value={formatINR(summary.paidTotal)}
          sub={`${pct(summary.paidTotal, summary.offerTotal)}% of order`}
          valueColor="#16A34A"
        />
        <FinBox
          label="Outstanding"
          value={formatINR(summary.outstandingTotal)}
          sub={isPaid ? 'Fully settled ✓' : 'Remaining'}
          valueColor={isPaid ? '#16A34A' : '#DC2626'}
        />
      </div>

      {/* Payment history */}
      <div className="mb-4 overflow-hidden rounded-[16px] border border-[var(--border)] bg-white">
        <div className="border-b border-[var(--border)] px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Payment History
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-2 p-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-10 animate-shimmer rounded-[10px] bg-[linear-gradient(90deg,#f4f4f3,#ffffff,#f4f4f3)]" />
            ))}
          </div>
        ) : detail?.payments.length === 0 ? (
          <div className="px-4 py-5 text-center text-[12px] text-[var(--text-muted)]">
            No payments recorded yet
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {detail?.payments.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[#16A34A]" />
                <div className="min-w-0 flex-1">
                  <p
                    className="text-[13px] font-semibold text-[var(--text-primary)]"
                    style={{ fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-ui)' }}
                  >
                    {formatINR(p.amount)}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {METHOD_LABEL[p.method] ?? p.method}
                    {p.reference ? ` · ${p.reference}` : ''}
                  </p>
                </div>
                <p className="shrink-0 text-[11px] text-[var(--text-muted)]">{fmtDate(p.receivedAt)}</p>
              </div>
            ))}

            {!isPaid && (
              <div className="flex items-center gap-3 bg-[rgba(220,38,38,0.02)] px-4 py-3">
                <span className="h-2 w-2 shrink-0 rounded-full border border-dashed border-[#AEAEA9]" />
                <p
                  className="text-[12px] font-medium text-[#DC2626]"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {formatINR(summary.outstandingTotal)} still outstanding
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Record payment button */}
      {!isPaid && (
        <button
          type="button"
          onClick={onRecordPayment}
          className="w-full rounded-[12px] bg-[#141414] py-3 text-[13px] font-semibold text-white transition hover:bg-[#2E2E2B]"
        >
          + Record Payment
        </button>
      )}

      {isPaid && (
        <div className="rounded-[12px] border border-[#bbf7d0] bg-[#f0fdf4] py-3 text-center text-[13px] font-semibold text-[#16A34A]">
          ✓ Order fully paid
        </div>
      )}
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyDetailState() {
  return (
    <div className="flex h-full items-center justify-center p-8 text-center">
      <div>
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--n-100)]">
          <span className="text-xl">₹</span>
        </div>
        <p className="text-[13px] font-medium text-[var(--text-secondary)]">Select an order</p>
        <p className="mt-1 text-[11px] text-[var(--text-muted)]">Click any order on the left to view payment details</p>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function PaymentsClient() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')

  const { data, isLoading, mutate } = useSWR<PaymentsListResponse>(
    '/api/payments',
    fetcher,
    { revalidateOnFocus: true },
  )

  const orders = data?.orders ?? []
  const kpis = data?.kpis
  const selectedOrder = orders.find((o) => o.id === selectedId) ?? null

  const filtered = orders.filter((o) =>
    search.trim() === '' ||
    o.customerName.toLowerCase().includes(search.toLowerCase()) ||
    o.number.toLowerCase().includes(search.toLowerCase()) ||
    (o.projectName ?? '').toLowerCase().includes(search.toLowerCase()),
  )

  const handlePaymentSaved = async () => {
    setShowModal(false)
    await mutate()
  }

  if (isLoading) return <LoadingState />

  return (
    <div className="flex h-full flex-col gap-4">

      {/* Page heading */}
      <section className="relative overflow-hidden rounded-[32px] border border-white/80 bg-[linear-gradient(135deg,#f0f9ff_0%,#ffffff_50%,#f0fdf4_100%)] p-6 shadow-[0_20px_36px_rgba(15,23,42,0.05)]">
        <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[#dbeafe] blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-28 w-28 rounded-full bg-[#dcfce7] blur-3xl" />
        <div className="relative">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
            Buildcon House
          </p>
          <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
            Payments
          </h1>
          <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
            Customer collection tracker — see what's owed, record payments, and send reminders instantly.
          </p>
        </div>
      </section>

      {/* KPI bar */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCell
          label="Total Outstanding"
          value={kpis ? formatINR(kpis.totalOutstanding) : '—'}
          color="#DC2626"
        />
        <KpiCell
          label="Collected This Month"
          value={kpis ? formatINR(kpis.collectedThisMonth) : '—'}
          color="#16A34A"
        />
        <KpiCell
          label="Active Orders"
          value={kpis ? String(kpis.activeOrders) : '—'}
        />
        <KpiCell
          label="Fully Paid"
          value={kpis ? `${kpis.fullyPaidOrders} ✓` : '—'}
          color="#16A34A"
        />
      </div>

      {/* Split pane */}
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-[28px] border border-[var(--border)] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.04)]">

        {/* Left — order list */}
        <div className="flex w-[290px] shrink-0 flex-col border-r border-[var(--border)]">
          <div className="border-b border-[var(--border)] p-3">
            <input
              type="text"
              placeholder="Search orders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-[10px] border border-[var(--border)] bg-[var(--n-50)] px-3 py-2 text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] outline-none focus:border-[var(--accent)] focus:bg-white"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="p-6 text-center text-[12px] text-[var(--text-muted)]">No orders found</p>
            ) : (
              filtered.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  selected={order.id === selectedId}
                  onClick={() => setSelectedId(order.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Right — detail */}
        <div className="min-h-0 flex-1 bg-[var(--n-50)]">
          {selectedOrder ? (
            <DetailPanel
              summary={selectedOrder}
              onRecordPayment={() => setShowModal(true)}
            />
          ) : (
            <EmptyDetailState />
          )}
        </div>
      </div>

      {/* Record payment modal */}
      {showModal && selectedOrder && (
        <RecordPaymentModal
          order={selectedOrder}
          onClose={() => setShowModal(false)}
          onSaved={handlePaymentSaved}
        />
      )}
    </div>
  )
}
