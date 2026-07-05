'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

type TollFreeKey = 'GEBERIT' | 'GROHE' | 'HANSGROHE' | 'VITRA' | 'OYSTER'

type CompanySettings = {
  name: string
  gstin: string
  address: string
  phone: string
  email: string
  tollFree: Record<TollFreeKey, string>
}

const TOLL_FREE_BRANDS: TollFreeKey[] = ['GEBERIT', 'GROHE', 'HANSGROHE', 'VITRA', 'OYSTER']

const DEFAULT: CompanySettings = {
  name: 'Buildcon House',
  gstin: '',
  address: '',
  phone: '+91 99099 06652',
  email: 'buildconhouse10@gmail.com',
  tollFree: {
    GEBERIT: '1800 102 4323',
    GROHE: '1800 102 4475',
    HANSGROHE: '1800 209 3246',
    VITRA: '70451 32132',
    OYSTER: '1800 120 8999',
  },
}

function inputCls() {
  return 'w-full rounded-md border px-3 py-2 text-sm outline-none transition-colors focus:ring-2'
}

function inputStyle() {
  return {
    borderColor: 'var(--border-default)',
    background: 'var(--surface)',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-ui)',
  } as React.CSSProperties
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label
      className="mb-1.5 block text-sm font-medium"
      style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}
    >
      {children}
    </label>
  )
}

export function GeneralSection() {
  const [form, setForm] = useState<CompanySettings>(DEFAULT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/settings/company')
      .then((r) => r.json())
      .then((data: CompanySettings) => { setForm(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  function set<K extends keyof CompanySettings>(key: K, value: CompanySettings[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function setTollFree(brand: TollFreeKey, value: string) {
    setForm((prev) => ({ ...prev, tollFree: { ...prev.tollFree, [brand]: value } }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/settings/company', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        toast.success('Settings saved')
      } else {
        toast.error('Failed to save settings')
      }
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-sm" style={{ color: 'var(--text-secondary)' }}>
        Loading…
      </div>
    )
  }

  return (
    <div className="max-w-xl space-y-6 p-8">
      <div>
        <h2
          className="text-base font-semibold"
          style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-primary)' }}
        >
          Company Profile
        </h2>
        <p className="mt-0.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Business details shown on quotations and invoices.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label>Business Name</Label>
          <input
            className={inputCls()}
            style={inputStyle()}
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
          />
        </div>

        <div>
          <Label>GSTIN</Label>
          <input
            className={inputCls()}
            style={inputStyle()}
            value={form.gstin}
            placeholder="e.g. 27AABCB1234F1Z5"
            onChange={(e) => set('gstin', e.target.value)}
          />
        </div>

        <div>
          <Label>Business Address</Label>
          <textarea
            className={inputCls()}
            style={{ ...inputStyle(), resize: 'vertical', minHeight: '80px' }}
            value={form.address}
            placeholder="Full address"
            onChange={(e) => set('address', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Phone</Label>
            <input
              className={inputCls()}
              style={inputStyle()}
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
            />
          </div>
          <div>
            <Label>Email</Label>
            <input
              className={inputCls()}
              style={inputStyle()}
              value={form.email}
              type="email"
              onChange={(e) => set('email', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div>
        <h3
          className="mb-3 text-sm font-semibold"
          style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-primary)' }}
        >
          Toll-Free Numbers
        </h3>
        <div
          className="overflow-hidden rounded-lg border"
          style={{ borderColor: 'var(--border-default)' }}
        >
          {TOLL_FREE_BRANDS.map((brand, i) => (
            <div
              key={brand}
              className="flex items-center gap-4 px-4 py-2.5"
              style={{
                borderBottom:
                  i < TOLL_FREE_BRANDS.length - 1 ? '1px solid var(--border-default)' : undefined,
              }}
            >
              <span
                className="w-28 shrink-0 text-sm font-medium"
                style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-secondary)' }}
              >
                {brand}
              </span>
              <input
                className="flex-1 rounded border px-2 py-1 text-sm outline-none"
                style={{
                  borderColor: 'var(--border-default)',
                  background: 'var(--surface)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-ui)',
                }}
                value={form.tollFree[brand]}
                onChange={(e) => setTollFree(brand, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-60"
          style={{ backgroundColor: 'var(--accent)', fontFamily: 'var(--font-ui)' }}
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
