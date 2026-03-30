import { BarChart3 } from 'lucide-react'
import { PageContainer } from '@/components/layout/page-container'

export default function ReportsPage() {
  return (
    <PageContainer title="Reports" subtitle="Business analytics and insights">
      <div className="flex flex-col items-center justify-center rounded-lg border bg-white p-12 text-center" style={{ borderColor: 'var(--border-default)' }}>
        <BarChart3 size={40} style={{ color: 'var(--text-tertiary)' }} className="mb-3" />
        <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Reports</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>This module is being built</p>
      </div>
    </PageContainer>
  )
}
