'use client'

import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/cn'

const skeletonVariants = cva('animate-shimmer rounded-[--radius-md]', {
  variants: {
    variant: {
      text: 'h-4 w-full',
      circle: 'h-10 w-10 rounded-full',
      rect: 'h-24 w-full',
    },
  },
  defaultVariants: {
    variant: 'text',
  },
})

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {}

function Skeleton({ className, variant, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'bg-gradient-to-r from-[--border-subtle] via-[--border-default] to-[--border-subtle]',
        'bg-[200%_100%]',
        skeletonVariants({ variant, className }),
      )}
      style={{
        animation: 'shimmer 1.8s ease-in-out infinite',
      }}
      {...props}
    />
  )
}

Skeleton.displayName = 'Skeleton'

export { Skeleton, skeletonVariants }
