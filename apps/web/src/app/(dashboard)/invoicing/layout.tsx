import { InvoicingNav } from '@/components/sales/shared/invoicing-nav'

export default function InvoicingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <InvoicingNav />
      {children}
    </div>
  )
}
