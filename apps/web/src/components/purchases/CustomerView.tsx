'use client'

import { useEffect, useState } from 'react'
import LineCard from '@/components/purchases/LineCard'
import {
  STAGE_ORDER,
  getBrandSectionKey,
  matchesBrandTab,
  normalizeBrandTab,
  type BrandTab,
  type HeaderCounts,
  type PurchaseTrackerLine,
} from '@/lib/purchases-tracker'

interface CustomerViewProps {
  lines: PurchaseTrackerLine[]
  activeBrand: BrandTab
  onMoved: (newCounts: HeaderCounts) => void
}

interface CustomerBucket {
  id: string
  name: string
  siteAddress: string | null
  lines: PurchaseTrackerLine[]
}

function pendingUnits(line: PurchaseTrackerLine): number {
  return (
    line.stages.UNALLOCATED +
    line.stages.PENDING_CO +
    line.stages.PENDING_DIST +
    line.stages.GODOWN +
    line.stages.IN_BOX
  )
}

export default function CustomerView({
  lines,
  activeBrand,
  onMoved,
}: CustomerViewProps) {
  const sidebarBrands: BrandTab[] = ['ALL', 'GROHE', 'HANSGROHE', 'VITRA', 'GEBERIT']
  const [search, setSearch] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [detailBrand, setDetailBrand] = useState<BrandTab>('ALL')

  const customers = lines.reduce<Record<string, CustomerBucket>>((acc, line) => {
    if (!line.customer) return acc
    const bucket = acc[line.customer.id] ?? {
      id: line.customer.id,
      name: line.customer.name,
      siteAddress: line.customer.siteAddress,
      lines: [],
    }

    bucket.lines.push(line)
    acc[line.customer.id] = bucket
    return acc
  }, {})

  const customerList = Object.values(customers)
    .filter((customer) => {
      const query = search.trim().toLowerCase()
      if (!query) return true
      return (
        customer.name.toLowerCase().includes(query) ||
        customer.siteAddress?.toLowerCase().includes(query) === true
      )
    })
    .filter((customer) => {
      if (detailBrand === 'ALL') return true
      return customer.lines.some((line) => matchesBrandTab(line.product.brand, detailBrand))
    })
    .sort((left, right) => left.name.localeCompare(right.name))

  useEffect(() => {
    if (!customerList.some((customer) => customer.id === selectedCustomerId)) {
      setSelectedCustomerId(customerList[0]?.id ?? null)
    }
  }, [customerList, selectedCustomerId])

  const selectedCustomer = customerList.find((customer) => customer.id === selectedCustomerId) ?? null
  const selectedLines = selectedCustomer
    ? selectedCustomer.lines.filter((line) => detailBrand === 'ALL' || matchesBrandTab(line.product.brand, detailBrand))
    : []

  const availableBrands = Array.from(new Set(
    (selectedCustomer?.lines ?? []).map((line) => normalizeBrandTab(getBrandSectionKey(line.product.brand))),
  )).filter((brand): brand is Exclude<BrandTab, 'ALL'> => brand !== 'ALL')

  useEffect(() => {
    if (detailBrand !== 'ALL' && !availableBrands.includes(detailBrand)) {
      setDetailBrand('ALL')
    }
  }, [availableBrands, detailBrand])

  return (
    <div className="grid min-h-[420px] gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="rounded-[32px] border border-[var(--border)] bg-white p-5 shadow-[0_14px_30px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap items-center gap-2">
          {sidebarBrands.map((brand) => {
            const active = detailBrand === brand
            return (
              <button
                key={brand}
                type="button"
                onClick={() => setDetailBrand(brand)}
                className={[
                  'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                  active
                    ? 'border-[#dbeafe] bg-[#eff6ff] text-[#1d4ed8]'
                    : 'border-[var(--border)] bg-[var(--n-50)] text-[var(--text-secondary)] hover:bg-white',
                ].join(' ')}
              >
                {brand === 'HANSGROHE' ? 'H|A' : brand}
              </button>
            )
          })}
        </div>

        <div className="mt-4">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search customer or site"
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--n-50)] px-4 py-3 text-sm outline-none transition focus:border-[#93c5fd]"
          />
        </div>

        <div className="mt-5 space-y-3">
          {customerList.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[var(--border-strong)] bg-[var(--n-50)] px-4 py-8 text-center text-sm text-[var(--text-muted)]">
              No customers match this filter.
            </div>
          ) : (
            customerList.map((customer) => {
              const filteredLines = customer.lines.filter((line) => detailBrand === 'ALL' || matchesBrandTab(line.product.brand, detailBrand))
              const delivered = filteredLines.reduce((sum, line) => sum + line.stages.DISPATCHED + line.stages.NOT_DISPLAYED, 0)
              const pending = filteredLines.reduce((sum, line) => sum + pendingUnits(line), 0)
              const active = customer.id === selectedCustomerId

              return (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => setSelectedCustomerId(customer.id)}
                  className={[
                    'w-full rounded-[24px] border p-4 text-left transition',
                    active
                      ? 'border-[#dbeafe] bg-[#f8fbff] shadow-[0_12px_24px_rgba(37,99,235,0.08)]'
                      : 'border-[var(--border)] bg-[var(--n-50)] hover:bg-white',
                  ].join(' ')}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--n-100)] text-sm font-semibold text-[var(--text-secondary)]">
                      {customer.name.slice(0, 1)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                        {customer.name}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {delivered > 0 ? `✓${delivered} delivered` : 'No delivered units yet'}
                        {' · '}
                        {pending} pending
                      </p>
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </aside>

      <section className="rounded-[32px] border border-[var(--border)] bg-white p-5 shadow-[0_14px_30px_rgba(15,23,42,0.04)]">
        {selectedCustomer ? (
          <>
            <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
                  Customer view
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                  {selectedCustomer.name}
                </h2>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  {selectedCustomer.siteAddress ?? 'Project-linked purchase activity'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(['ALL', ...availableBrands] as BrandTab[]).map((brand) => {
                  const active = detailBrand === brand
                  return (
                    <button
                      key={brand}
                      type="button"
                      onClick={() => setDetailBrand(brand)}
                      className={[
                        'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                        active
                          ? 'border-[#dbeafe] bg-[#eff6ff] text-[#1d4ed8]'
                          : 'border-[var(--border)] bg-[var(--n-50)] text-[var(--text-secondary)] hover:bg-white',
                      ].join(' ')}
                    >
                      {brand === 'HANSGROHE' ? 'HANSGROHE' : brand}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {selectedLines.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-[var(--border-strong)] bg-[var(--n-50)] px-6 py-12 text-center text-sm text-[var(--text-muted)]">
                  This customer has no lines under the current detail filter.
                </div>
              ) : (
                selectedLines
                  .slice()
                  .sort((left, right) => {
                    const leftWeight = STAGE_ORDER.findIndex((stage) => left.stages[stage] > 0)
                    const rightWeight = STAGE_ORDER.findIndex((stage) => right.stages[stage] > 0)
                    return leftWeight - rightWeight || left.product.name.localeCompare(right.product.name)
                  })
                  .map((line) => (
                    <LineCard
                      key={line.id}
                      line={line}
                      context="customer"
                      onMoved={onMoved}
                      brandScope={activeBrand}
                    />
                  ))
              )}
            </div>
          </>
        ) : (
          <div className="flex h-full min-h-[360px] items-center justify-center rounded-3xl border border-dashed border-[var(--border-strong)] bg-[var(--n-50)] px-6 text-center text-sm text-[var(--text-muted)]">
            Select a customer from the left to inspect their purchase pipeline.
          </div>
        )}
      </section>
    </div>
  )
}
