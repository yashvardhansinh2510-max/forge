'use client'

import * as React from 'react'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import { ChevronDown, Shield, Users, Wrench } from 'lucide-react'
import { useRole, ROLE_LABELS } from '@/lib/use-role'
import type { Role } from '@/lib/role-store'
import { cn } from '@forge/ui'

const ROLE_CONFIG: Record<Role, { icon: React.ElementType; dot: string }> = {
  owner:   { icon: Shield, dot: '#22C55E' },
  manager: { icon: Users,  dot: '#3B82F6' },
  worker:  { icon: Wrench, dot: '#F59E0B' },
}

export function RoleSwitcher({ collapsed }: { collapsed: boolean }) {
  const { role, setRole, canSwitchRole } = useRole()
  if (!canSwitchRole) return null

  const config = ROLE_CONFIG[role]
  const Icon = config.icon

  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>
        <button
          className={cn(
            'flex w-full cursor-pointer items-center rounded-md transition-colors',
            collapsed ? 'h-9 justify-center' : 'h-9 gap-2 px-2.5',
          )}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <Icon size={15} style={{ color: '#A1A1AA' }} />
            <div
              style={{
                position: 'absolute', bottom: -1, right: -1,
                width: 6, height: 6, borderRadius: '50%',
                backgroundColor: config.dot,
                border: '1px solid var(--shell-bg)',
              }}
            />
          </div>
          {!collapsed && (
            <>
              <span style={{ flex: 1, fontSize: '12px', color: '#A1A1AA', textAlign: 'left' }}>
                {ROLE_LABELS[role]}
              </span>
              <ChevronDown size={11} style={{ color: '#52525B' }} />
            </>
          )}
        </button>
      </DropdownMenuPrimitive.Trigger>

      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          side="right"
          align="end"
          sideOffset={8}
          style={{
            backgroundColor: '#27272A',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 10,
            minWidth: 160,
            zIndex: 50,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            padding: '4px 0',
          }}
        >
          <div style={{ padding: '6px 10px 4px', fontSize: 10, color: '#52525B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Switch Role
          </div>
          {(['owner', 'manager', 'worker'] as Role[]).map((r) => {
            const rc = ROLE_CONFIG[r]
            const RoleIcon = rc.icon
            const isActive = role === r
            return (
              <DropdownMenuPrimitive.Item
                key={r}
                onSelect={() => setRole(r)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 10px', cursor: 'pointer', fontSize: 13,
                  color: isActive ? 'white' : '#A1A1AA',
                  backgroundColor: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                  borderRadius: 6, margin: '0 4px', outline: 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <div style={{ position: 'relative' }}>
                  <RoleIcon size={13} />
                  <div style={{ position: 'absolute', bottom: -1, right: -1, width: 5, height: 5, borderRadius: '50%', backgroundColor: rc.dot, border: '1px solid #27272A' }} />
                </div>
                {ROLE_LABELS[r]}
                {isActive && (
                  <span style={{ marginLeft: 'auto', fontSize: 10, color: '#52525B' }}>current</span>
                )}
              </DropdownMenuPrimitive.Item>
            )
          })}
          <div style={{ height: 4 }} />
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  )
}
