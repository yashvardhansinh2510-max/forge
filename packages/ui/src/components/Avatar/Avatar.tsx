'use client'

import * as React from 'react'
import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/cn'

const avatarVariants = cva(
  'relative inline-flex items-center justify-center whitespace-nowrap rounded-full bg-[--surface-ground] font-medium text-[--text-primary]',
  {
    variants: {
      size: {
        sm: 'h-7 w-7 text-xs',
        md: 'h-8 w-8 text-sm',
        lg: 'h-10 w-10 text-base',
        xl: 'h-12 w-12 text-lg',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  },
)

export interface AvatarProps extends VariantProps<typeof avatarVariants> {
  src?: string
  alt?: string
  initials?: string
}

const hashCode = (str: string): number => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

const colors = [
  '#2563EB',
  '#059669',
  '#EA580C',
  '#D97706',
  '#7C3AED',
  '#DC2626',
  '#0891B2',
  '#4B5563',
]

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> & AvatarProps
>(({ className, size, src, alt, initials, ...props }, ref) => {
  const bgColor = initials ? colors[hashCode(initials) % colors.length] : colors[0]

  return (
    <AvatarPrimitive.Root
      ref={ref}
      className={cn(avatarVariants({ size, className }))}
      {...props}
    >
      {src && <AvatarPrimitive.Image src={src} alt={alt || ''} className="h-full w-full object-cover" />}
      <AvatarPrimitive.Fallback
        className="flex items-center justify-center h-full w-full"
        style={{ backgroundColor: bgColor, color: 'white' }}
      >
        {initials?.substring(0, 2).toUpperCase()}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  )
})

Avatar.displayName = 'Avatar'

export { Avatar, avatarVariants }
