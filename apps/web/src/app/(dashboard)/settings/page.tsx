import { Settings2 } from 'lucide-react'
import { PageContainer } from '@/components/layout/page-container'

export default function SettingsPage() {
  return (
    <PageContainer title="Settings" subtitle="Configure your workspace">
      <div className="flex flex-col items-center justify-center rounded-lg border bg-white p-12 text-center" style={{ borderColor: 'var(--border-default)' }}>
        <Settings2 size={40} style={{ color: 'var(--text-tertiary)' }} className="mb-3" />
        <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Settings</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>This module is being built</p>
      </div>
    </PageContainer>
  )
}
