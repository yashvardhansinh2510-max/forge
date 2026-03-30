import { POSHeader } from '@/components/pos/pos-header'
import { POSBuilder } from '@/components/pos/pos-builder'

export const metadata = { title: 'Quotation Builder — Forge' }

export default function POSPage() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <POSHeader />
      <POSBuilder />
    </div>
  )
}
