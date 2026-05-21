'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Plus, Download, Save } from 'lucide-react'
import { toast } from 'sonner'
import useSWR from 'swr'
import { StatusBadge } from '../shared/status-badge'
import { EditorSidebar, type SidebarData } from './editor-sidebar'
import { RoomSection, type BuilderRoom } from './room-section'
import { GrandTotalBar } from './grand-total-bar'
import type { LiveProduct } from './editor-item-row'

const DEFAULT_NOTES = `NOTE
1. All rate for Grohe are as per current MRP.
2. Company - Grohe and other Company, can revise MRP without notice.
3. Please confirm order with 100% advance for CP items.
4. Quote remains valid till company MRP remains unchanged. Force majure, w.r.t TAX, MRP.
5. For items with escalated MRP, confirm order with 100% payments, prior to cut off time line.
6. Delivery as per company schedule. Freight extra as per actual.
7. RATE VALID FOR THIS MONTH`

const DEFAULT_TERMS = `Regards,
Buildcon House
MO: +91 9909906652
MAIL: buildconhouse10@gmail.com

TOLL FREE NUMBER
GEBERIT      18001024323
GROHE        18001024475
HANSGROHE    18002093246
VITRA        70451 32132
OYSTER       18001208999`

function todayISO() { return new Date().toISOString().slice(0, 10) }
function plusDaysISO(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

interface ApiRevision {
  id:                 string
  revisionId:         string
  quotationNumber:    string
  status:             string
  isLocked:           boolean
  customerName:       string
  customerPhone:      string
  billingAddress:     string
  siteAddress:        string
  salesRep:           string
  brandLabel:         string
  createdAt:          string
  validUntil:         string | null
  notes:              string
  termsAndConditions: string
  rooms: Array<{
    id:    string
    name:  string
    order: number
    items: Array<{
      id:          string
      productId:   string
      sku:         string
      productName: string
      mrp:         number
      qty:         number
      offerRate:   number
    }>
  }>
}

interface ProductApiItem {
  id:   string
  sku:  string
  name: string
  mrp:  number
}

interface QuotationEditorProps {
  revisionId: string | null
}

export function QuotationEditor({ revisionId }: QuotationEditorProps) {
  const router = useRouter()

  const { data: revision } = useSWR<ApiRevision>(
    revisionId ? `/api/quotations/${revisionId}` : null,
    (url: string) => fetch(url).then((r) => r.json()),
  )

  const { data: productsData } = useSWR<{ products: ProductApiItem[] }>(
    '/api/products?limit=2000',
    (url: string) => fetch(url).then((r) => r.json()),
    { revalidateOnFocus: false },
  )
  const liveProducts: LiveProduct[] = React.useMemo(
    () => (productsData?.products ?? []).map((p) => ({ id: p.id, sku: p.sku, name: p.name, mrp: p.mrp })),
    [productsData],
  )

  const [quotationNumber, setQuotationNumber] = React.useState('New Quotation')
  const [status, setStatus]                   = React.useState('DRAFT')
  const [isLocked, setIsLocked]               = React.useState(false)
  const [saving, setSaving]                   = React.useState(false)
  const [downloading, setDownloading]         = React.useState(false)
  const [savedRevisionId, setSavedRevisionId] = React.useState<string | null>(revisionId)

  const [sidebar, setSidebar] = React.useState<SidebarData>({
    customerName:       '',
    customerPhone:      '',
    billingAddress:     '',
    siteAddress:        '',
    projectName:        '',
    salesRep:           '',
    brandLabel:         'GROHE',
    quoteDate:          todayISO(),
    validUntil:         plusDaysISO(30),
    notes:              DEFAULT_NOTES,
    termsAndConditions: DEFAULT_TERMS,
  })

  const [rooms, setRooms] = React.useState<BuilderRoom[]>([
    { id: `room-${Date.now()}`, name: 'Room 1', items: [] },
  ])

  React.useEffect(() => {
    if (!revision) return
    setQuotationNumber(revision.quotationNumber)
    setStatus(revision.status)
    setIsLocked(revision.isLocked)
    setSidebar({
      customerName:       revision.customerName,
      customerPhone:      revision.customerPhone,
      billingAddress:     revision.billingAddress,
      siteAddress:        revision.siteAddress,
      projectName:        '',
      salesRep:           revision.salesRep,
      brandLabel:         revision.brandLabel,
      quoteDate:          revision.createdAt.slice(0, 10),
      validUntil:         revision.validUntil?.slice(0, 10) ?? plusDaysISO(30),
      notes:              revision.notes || DEFAULT_NOTES,
      termsAndConditions: revision.termsAndConditions || DEFAULT_TERMS,
    })
    setRooms(
      revision.rooms.length > 0
        ? revision.rooms.map((r) => ({
            id:    r.id,
            name:  r.name,
            items: r.items.map((i) => ({
              id:          i.id,
              productId:   i.productId,
              sku:         i.sku,
              productName: i.productName,
              mrp:         i.mrp,
              qty:         i.qty,
              offerRate:   i.offerRate,
            })),
          }))
        : [{ id: `room-${Date.now()}`, name: 'Room 1', items: [] }],
    )
  }, [revision?.revisionId])

  React.useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  async function handleSave(): Promise<string | null> {
    setSaving(true)
    try {
      const payload = {
        customerName:       sidebar.customerName,
        customerPhone:      sidebar.customerPhone,
        billingAddress:     sidebar.billingAddress,
        siteAddress:        sidebar.siteAddress,
        salesRep:           sidebar.salesRep,
        brandLabel:         sidebar.brandLabel,
        validUntil:         sidebar.validUntil ? new Date(sidebar.validUntil).toISOString() : undefined,
        notes:              sidebar.notes,
        termsAndConditions: sidebar.termsAndConditions,
        rooms: rooms.map((r) => ({
          name:  r.name,
          items: r.items.filter((i) => i.productId).map((i) => ({ sku: i.sku, qty: i.qty, offerRate: i.offerRate })),
        })),
      }

      if (!savedRevisionId) {
        const res = await fetch('/api/quotations', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ customerName: sidebar.customerName, siteAddress: sidebar.siteAddress, projectName: sidebar.projectName, notes: sidebar.notes, lineItems: [] }),
        })
        if (!res.ok) throw new Error(((await res.json()) as { message?: string }).message ?? 'Save failed')
        const data = (await res.json()) as { revisionId: string; quotationNumber: string }
        setSavedRevisionId(data.revisionId)
        setQuotationNumber(data.quotationNumber)
        const patchRes = await fetch(`/api/quotations/${data.revisionId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        })
        if (!patchRes.ok) throw new Error(((await patchRes.json()) as { message?: string }).message ?? 'Save failed')
        toast.success('Quotation created')
        router.replace(`/sales/quotations/${data.revisionId}` as never)
        return data.revisionId
      } else {
        const res = await fetch(`/api/quotations/${savedRevisionId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error(((await res.json()) as { message?: string }).message ?? 'Save failed')
        toast.success('Saved')
        return savedRevisionId
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save')
      return null
    } finally {
      setSaving(false)
    }
  }

  async function handleDownloadPdf() {
    let rid = savedRevisionId
    if (!rid) { rid = await handleSave(); if (!rid) return }
    setDownloading(true)
    try {
      const res = await fetch(`/api/quotations/${rid}/pdf`)
      if (!res.ok) throw new Error('PDF generation failed')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = `${quotationNumber}.pdf`; a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not generate PDF')
    } finally {
      setDownloading(false)
    }
  }

  function addRoom() {
    setRooms((prev) => [...prev, { id: `room-${Date.now()}`, name: `Room ${prev.length + 1}`, items: [] }])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(12px)', flexShrink: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', color: 'var(--accent)' }}>
            {quotationNumber}
          </span>
          <StatusBadge status={status.toLowerCase() as never} size="md" />
          {isLocked && (
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: '#FEF3C7', color: '#92400E', fontWeight: 600 }}>
              Locked
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => void handleSave()}
            disabled={saving || isLocked}
            style={{ display: 'flex', alignItems: 'center', gap: 5, height: 32, padding: '0 14px', borderRadius: 7, border: '1px solid var(--border-default)', background: 'white', fontSize: 12, fontWeight: 500, cursor: saving || isLocked ? 'not-allowed' : 'pointer', color: 'var(--text-secondary)', opacity: saving ? 0.6 : 1 }}
          >
            <Save size={13} /> {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={() => void handleDownloadPdf()}
            disabled={downloading}
            style={{ display: 'flex', alignItems: 'center', gap: 5, height: 32, padding: '0 14px', borderRadius: 7, border: 'none', background: '#1D4ED8', color: 'white', fontSize: 12, fontWeight: 600, cursor: downloading ? 'not-allowed' : 'pointer', opacity: downloading ? 0.7 : 1 }}
          >
            <Download size={13} /> {downloading ? 'Generating…' : 'Download PDF'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <EditorSidebar data={sidebar} onChange={setSidebar} />
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column' }}>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
            {rooms.map((room) => (
              <RoomSection
                key={room.id}
                room={room}
                products={liveProducts}
                onChange={(updated) => setRooms((prev) => prev.map((r) => r.id === room.id ? updated : r))}
                onDelete={() => setRooms((prev) => prev.filter((r) => r.id !== room.id))}
              />
            ))}
            <button
              onClick={addRoom}
              style={{ display: 'flex', alignItems: 'center', gap: 7, height: 40, padding: '0 18px', borderRadius: 8, border: '1.5px dashed var(--border-default)', background: 'transparent', fontSize: 13, color: 'var(--text-tertiary)', cursor: 'pointer', marginBottom: 80 }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLElement).style.color = 'var(--accent)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)' }}
            >
              <Plus size={14} /> Add Room
            </button>
          </motion.div>
          <GrandTotalBar rooms={rooms} />
        </div>
      </div>
    </div>
  )
}
