import * as React from 'react'
import { cn } from '@forge/ui'

interface PageContainerProps {
  title: React.ReactNode
  subtitle?: string
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function PageContainer({
  title,
  subtitle,
  actions,
  children,
  className,
}: PageContainerProps) {
  return (
    <div className={cn('px-8 py-6', className)}>
      <div className="mb-6 flex min-h-[44px] items-start justify-between">
        <div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '24px',
              fontWeight: 700,
              letterSpacing: '-0.032em',
              color: 'var(--text-primary)',
              lineHeight: 1.15,
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="mt-0.5" style={{ fontSize: '14px', letterSpacing: '-0.006em', color: 'var(--text-secondary)' }}>
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  )
}
