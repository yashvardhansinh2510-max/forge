import { requirePermission } from '@/lib/auth'
import AuditCenterClient from './AuditCenterClient'

export const metadata = {
  title: 'Audit Center | Forge',
}

export default async function AuditCenterPage() {
  // Ensure user has permission
  await requirePermission('Settings', 'View')

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[1200px] mx-auto w-full">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Audit Center</h1>
        <p className="text-gray-500">Track and monitor all activities across the organization.</p>
      </div>

      <AuditCenterClient />
    </div>
  )
}
