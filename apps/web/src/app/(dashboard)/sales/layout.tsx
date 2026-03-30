import { SalesNav } from '@/components/sales/shared/sales-nav'

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <SalesNav />
      {children}
    </div>
  )
}
