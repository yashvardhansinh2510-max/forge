import * as React from 'react'
import { DefaultUserProvider } from '@/lib/user-context'
import { ShellContentClient } from './shell-content-client'

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <DefaultUserProvider>
      <ShellContentClient>{children}</ShellContentClient>
    </DefaultUserProvider>
  )
}
