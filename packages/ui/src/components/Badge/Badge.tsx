'use client'

import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/cn'

const badgeVariants = cva(
  'inline-flex items-center rounded-[4px] px-2 py-1 text-[11px] font-semibold uppercase tracking-widest text-white',
  {
    variants: {
      variant: {
        default: 'bg-gray-600',
        success: 'bg-[--success] text-white',
        warning: 'bg-[--warning] text-white',
        danger: 'bg-[--danger] text-white',
        info: 'bg-[--info] text-white',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
