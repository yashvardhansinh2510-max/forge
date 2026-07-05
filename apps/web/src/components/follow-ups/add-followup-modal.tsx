'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { ALL_BRANDS, type CustomerType } from '@/lib/follow-up-types'

const STAFF = ['Suresh Iyer', 'Ramesh Pawar']

const CUSTOMER_TYPES: { value: CustomerType; label: string }[] = [
  { value: 'architect',         label: 'Architect' },
  { value: 'interior_designer', label: 'Interior Designer' },
  { value: 'builder',           label: 'Builder' },
  { value: 'retail',            label: 'Retail' },
  { value: 'other',             label: 'Other' },
]

function defaultNextDate() {
  const d = new Date()
  d.setDate(d.getDate() + 2)
  return d.toISOString().split('T')[0]!
}

interface CreatePayload {
  customerName: string
  customerPhone: string
  customerType: string
  brandsInterested: string[]
  productsNoted: string
  estimatedBudget?: number
  projectName?: string
  assignedTo: string
  nextFollowUpDate: string
  notes: string
  status: string
}

interface AddFollowUpModalProps {
  open: boolean
  onClose: () => void
  onCreate?: (payload: CreatePayload) => Promise<void>
}

export function AddFollowUpModal({ open, onClose, onCreate }: AddFollowUpModalProps) {
  const [name, setName] = React.useState('')
  const [phone, setPhone] = React.useState('')
  const [customerType, setCustomerType] = React.useState<CustomerType>('architect')
  const [brands, setBrands] = React.useState<string[]>([])
  const [productsNoted, setProductsNoted] = React.useState('')
  const [budget, setBudget] = React.useState('')
  const [project, setProject] = React.useState('')
  const [assignedTo, setAssignedTo] = React.useState(STAFF[0]!)
  const [nextDate, setNextDate] = React.useState(defaultNextDate)
  const [notes, setNotes] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)

  function reset() {
    setName('')
    setPhone('')
    setCustomerType('architect')
    setBrands([])
    setProductsNoted('')
    setBudget('')
    setProject('')
    setAssignedTo(STAFF[0]!)
    setNextDate(defaultNextDate())
    setNotes('')
  }

  function handleClose() {
    reset()
    onClose()
  }

  function toggleBrand(brand: string) {
    setBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    )
  }

  async function handleSubmit() {
    if (!name.trim()) { toast.error('Customer name is required'); return }
    if (!phone.trim()) { toast.error('Phone number is required'); return }
    if (brands.length === 0) { toast.error('Select at least one brand'); return }

    setSubmitting(true)
    const customerPhone = phone.trim().startsWith('+91') ? phone.trim() : `+91 ${phone.trim()}`
    try {
      if (onCreate) {
        await onCreate({
          customerName: name.trim(),
          customerPhone,
          customerType,
          brandsInterested: brands,
          productsNoted: productsNoted.trim(),
          estimatedBudget: budget ? parseInt(budget.replace(/,/g, ''), 10) : undefined,
          projectName: project.trim() || undefined,
          assignedTo,
          nextFollowUpDate: nextDate,
          notes: notes.trim(),
          status: 'PENDING',
        })
      }
      toast.success(`Follow-up added for ${name.trim()}`)
      handleClose()
    } catch {
      toast.error('Failed to save follow-up')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => !v && handleClose()}>
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                style={{
                  position: 'fixed', inset: 0, zIndex: 60,
                  background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(3px)',
                }}
              />
            </DialogPrimitive.Overlay>

            <DialogPrimitive.Content asChild>
              <div
                style={{
                  position: 'fixed',
                  top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 61,
                  width: 540,
                  maxWidth: '95vw',
                }}
              >
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  background: 'white',
                  borderRadius: 16,
                  boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
                  padding: 28,
                  maxHeight: '90vh',
                  overflowY: 'auto',
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                  <div>
                    <DialogPrimitive.Title
                      style={{
                        fontSize: 18, fontWeight: 700, color: 'var(--text-primary)',
                        letterSpacing: '-0.02em', margin: 0,
                      }}
                    >
                      New Walk-in Follow-up
                    </DialogPrimitive.Title>
                    <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 }}>
                      Log a showroom visitor for follow-up
                    </p>
                  </div>
                  <button
                    onClick={handleClose}
                    style={{
                      width: 28, height: 28, borderRadius: 6,
                      border: '1px solid var(--border-default)', background: 'white',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Form */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Row: name + phone */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <Field label="Customer Name *">
                      <input
                        type="text"
                        placeholder="Ar. Anjali Sharma"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        style={inputStyle}
                      />
                    </Field>
                    <Field label="Phone *">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                        <span
                          style={{
                            height: 34, padding: '0 10px', borderRadius: '8px 0 0 8px',
                            border: '1px solid var(--border-default)', borderRight: 'none',
                            background: 'var(--surface-tint)', fontSize: 13,
                            display: 'flex', alignItems: 'center', color: 'var(--text-tertiary)',
                            flexShrink: 0,
                          }}
                        >
                          +91
                        </span>
                        <input
                          type="tel"
                          placeholder="98200 77345"
                          value={phone.replace(/^\+91\s?/, '')}
                          onChange={(e) => setPhone(e.target.value)}
                          style={{ ...inputStyle, borderRadius: '0 8px 8px 0' }}
                        />
                      </div>
                    </Field>
                  </div>

                  {/* Customer type */}
                  <Field label="Customer Type">
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {CUSTOMER_TYPES.map((ct) => (
                        <button
                          key={ct.value}
                          type="button"
                          onClick={() => setCustomerType(ct.value)}
                          style={{
                            height: 30, padding: '0 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                            border: `1px solid ${customerType === ct.value ? 'var(--accent)' : 'var(--border-default)'}`,
                            background: customerType === ct.value ? 'var(--accent-light)' : 'white',
                            color: customerType === ct.value ? 'var(--accent)' : 'var(--text-secondary)',
                            cursor: 'pointer',
                          }}
                        >
                          {ct.label}
                        </button>
                      ))}
                    </div>
                  </Field>

                  {/* Brands */}
                  <Field label="Brands Interested *">
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {ALL_BRANDS.map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => toggleBrand(b)}
                          style={{
                            height: 30, padding: '0 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                            border: `1px solid ${brands.includes(b) ? 'var(--accent)' : 'var(--border-default)'}`,
                            background: brands.includes(b) ? 'var(--accent-light)' : 'white',
                            color: brands.includes(b) ? 'var(--accent)' : 'var(--text-secondary)',
                            cursor: 'pointer',
                          }}
                        >
                          {brands.includes(b) ? '✓ ' : ''}{b}
                        </button>
                      ))}
                    </div>
                  </Field>

                  {/* Products noted */}
                  <Field label="Products Discussed">
                    <textarea
                      placeholder="e.g. Grohe Rainshower 310, Axor Urquiola basin mixer…"
                      value={productsNoted}
                      onChange={(e) => setProductsNoted(e.target.value)}
                      rows={2}
                      style={{
                        ...inputStyle, resize: 'vertical', fontFamily: 'var(--font-ui)', lineHeight: 1.5,
                      }}
                    />
                  </Field>

                  {/* Budget + Project */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <Field label="Est. Budget (₹)">
                      <input
                        type="text"
                        placeholder="4,50,000"
                        value={budget}
                        onChange={(e) => setBudget(e.target.value)}
                        style={inputStyle}
                      />
                    </Field>
                    <Field label="Project Name">
                      <input
                        type="text"
                        placeholder="Hiranandani — 3BHK refurb"
                        value={project}
                        onChange={(e) => setProject(e.target.value)}
                        style={inputStyle}
                      />
                    </Field>
                  </div>

                  {/* Assigned + Next date */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <Field label="Assigned To">
                      <select
                        value={assignedTo}
                        onChange={(e) => setAssignedTo(e.target.value)}
                        style={inputStyle}
                      >
                        {STAFF.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Next Follow-up Date">
                      <input
                        type="date"
                        value={nextDate}
                        onChange={(e) => setNextDate(e.target.value)}
                        style={inputStyle}
                      />
                    </Field>
                  </div>

                  {/* Notes */}
                  <Field label="Visit Notes">
                    <textarea
                      placeholder="What happened during the visit? Any special requests?"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      style={{ ...inputStyle, resize: 'vertical', fontFamily: 'var(--font-ui)', lineHeight: 1.5 }}
                    />
                  </Field>
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', gap: 8, marginTop: 24, justifyContent: 'flex-end' }}>
                  <button
                    onClick={handleClose}
                    style={{
                      height: 36, padding: '0 16px', borderRadius: 8, fontSize: 13,
                      border: '1px solid var(--border-default)', background: 'white',
                      color: 'var(--text-secondary)', cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    style={{
                      height: 36, padding: '0 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                      background: 'var(--accent)', color: 'white', border: 'none',
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      opacity: submitting ? 0.7 : 1,
                    }}
                  >
                    Add Follow-up
                  </button>
                </div>
              </motion.div>
              </div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  )
}

// ─── Helper components ────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        style={{
          display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)',
          textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: 34, padding: '0 10px', fontSize: 13,
  border: '1px solid var(--border-default)', borderRadius: 8,
  background: 'white', outline: 'none', boxSizing: 'border-box',
  color: 'var(--text-primary)',
}
