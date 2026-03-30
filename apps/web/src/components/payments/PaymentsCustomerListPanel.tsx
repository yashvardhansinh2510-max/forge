'use client'

import { usePaymentsStore } from '@/lib/payments-store'
import {
  getAccountTotals, formatINR, BRAND_COLORS,
  type CustomerAccount,
} from '@/lib/mock/payments-data'
import { getInitials, getAvatarColor } from '@/lib/tracker-utils'

export function PaymentsCustomerListPanel() {
  const { accounts, payments, selectedId, searchQuery, sortBy,
          setSelectedId, setSearchQuery, setSortBy } = usePaymentsStore()

  const filtered = accounts
    .filter(a => {
      const q = searchQuery.trim().toLowerCase()
      return !q || a.customerName.toLowerCase().includes(q) || a.projectName.toLowerCase().includes(q)
    })
    .slice()
    .sort((a, b) => {
      if (sortBy === 'name') return a.customerName.localeCompare(b.customerName)
      if (sortBy === 'pending') {
        return getAccountTotals(b.brandAccounts).pending - getAccountTotals(a.brandAccounts).pending
      }
      const la = payments.find(p => p.customerId === a.customerId)?.paidAt ?? ''
      const lb = payments.find(p => p.customerId === b.customerId)?.paidAt ?? ''
      return lb.localeCompare(la)
    })

  return (
    <div style={{
      width: 264, flexShrink: 0,
      display: 'flex', flexDirection: 'column',
      height: '100%', overflow: 'hidden',
      background: '#fafafa', borderRight: '1px solid #e5e7eb',
    }}>
      {/* Search + sort */}
      <div style={{ padding: '10px 10px 6px', flexShrink: 0, background: '#fafafa' }}>
        <input
          type="text"
          placeholder="Search…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            width: '100%', height: 30, padding: '0 10px',
            borderRadius: 6, border: '1px solid #e5e7eb',
            fontSize: 12, fontFamily: 'var(--font-ui)',
            background: '#fff', color: '#111827',
            outline: 'none', boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
          {(['pending','name','lastPayment'] as const).map(s => (
            <button key={s} onClick={() => setSortBy(s)} style={{
              height: 22, padding: '0 8px', borderRadius: 4,
              border: '1px solid ' + (sortBy === s ? '#2563eb' : '#e5e7eb'),
              background: sortBy === s ? '#dbeafe' : '#fff',
              color: sortBy === s ? '#1d4ed8' : '#6b7280',
              fontSize: 10, fontFamily: 'var(--font-ui)',
              fontWeight: sortBy === s ? 600 : 400, cursor: 'pointer',
            }}>
              {s === 'pending' ? 'Pending' : s === 'name' ? 'A–Z' : 'Recent'}
            </button>
          ))}
        </div>
      </div>

      {/* Customer list — fills remaining height, scrollable */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {filtered.map(account => {
          const lastPay = payments.find(p => p.customerId === account.customerId)
          return (
            <CustomerCard
              key={account.customerId}
              account={account}
              lastPaymentAt={lastPay?.paidAt ?? null}
              lastPaymentBrand={lastPay?.brand ?? null}
              isSelected={selectedId === account.customerId}
              onSelect={() => setSelectedId(account.customerId)}
            />
          )
        })}
        {filtered.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 12, fontFamily: 'var(--font-ui)' }}>
            No customers found
          </div>
        )}
      </div>

      {/* Footer summary */}
      <div style={{
        padding: '8px 10px', borderTop: '1px solid #e5e7eb',
        background: '#f3f4f6', flexShrink: 0,
      }}>
        {(() => {
          const totals = accounts.reduce(
            (acc, a) => {
              const t = getAccountTotals(a.brandAccounts)
              return { billed: acc.billed + t.billed, pending: acc.pending + t.pending }
            },
            { billed: 0, pending: 0 },
          )
          return (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, color: '#6b7280', fontFamily: 'var(--font-ui)' }}>
                {accounts.length} customers · {formatINR(totals.billed)} billed
              </span>
              {totals.pending > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}>
                  {formatINR(totals.pending)} due
                </span>
              )}
            </div>
          )
        })()}
      </div>
    </div>
  )
}

function CustomerCard({
  account, lastPaymentAt, lastPaymentBrand, isSelected, onSelect,
}: {
  account:          CustomerAccount
  lastPaymentAt:    string | null
  lastPaymentBrand: string | null
  isSelected:       boolean
  onSelect:         () => void
}) {
  const totals = getAccountTotals(account.brandAccounts)
  const avatarBg = getAvatarColor(account.customerName)

  return (
    <button
      onClick={onSelect}
      style={{
        width: '100%', textAlign: 'left',
        padding: '10px 10px 10px 0',
        background: isSelected ? '#eff6ff' : '#fff',
        borderLeft: isSelected ? '3px solid #2563eb' : '3px solid transparent',
        border: 'none',
        borderBottom: '1px solid #f0f0f0',
        cursor: 'pointer',
        display: 'flex', gap: 9, alignItems: 'flex-start',
        paddingLeft: 10,
      }}
    >
      {/* Avatar */}
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: avatarBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 700, color: '#fff',
        fontFamily: 'var(--font-ui)', flexShrink: 0,
      }}>
        {getInitials(account.customerName)}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Name */}
        <div style={{
          fontSize: 13, fontWeight: 600, color: '#111827',
          fontFamily: 'var(--font-ui)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {account.customerName}
        </div>

        {/* Project */}
        <div style={{
          fontSize: 10, color: '#9ca3af', fontFamily: 'var(--font-ui)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          marginTop: 1,
        }}>
          {account.projectName}
        </div>

        {/* Financial row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
          {totals.pending > 0 ? (
            <span style={{
              fontSize: 12, fontWeight: 700, color: '#dc2626',
              fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
            }}>
              {formatINR(totals.pending)} due
            </span>
          ) : (
            <span style={{ fontSize: 11, color: '#16a34a', fontFamily: 'var(--font-ui)' }}>
              ✓ Fully paid
            </span>
          )}
          <span style={{ fontSize: 10, color: '#d1d5db' }}>·</span>
          <span style={{ fontSize: 10, color: '#6b7280', fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}>
            {formatINR(totals.received)} rcvd
          </span>
        </div>

        {/* Brand dots + last payment */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 }}>
          <div style={{ display: 'flex', gap: 3 }}>
            {account.brandAccounts.map(ba => (
              <div
                key={ba.brand}
                title={ba.brand}
                style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: BRAND_COLORS[ba.brand] ?? '#6b7280',
                  opacity: ba.billed - ba.received > 0 ? 1 : 0.35,
                }}
              />
            ))}
          </div>
          {lastPaymentAt && (
            <span style={{ fontSize: 9, color: '#9ca3af', fontFamily: 'var(--font-ui)' }}>
              {fmtShort(lastPaymentAt)}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

function fmtShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}
