'use client'

import * as React from 'react'
import * as ToastPrimitive from '@radix-ui/react-toast'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/cn'

const toastVariants = cva(
  'relative flex w-full items-center justify-between rounded-[--radius-md] border shadow-lg p-4 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full',
  {
    variants: {
      variant: {
        default: 'border-[--border-default] bg-white',
        success: 'border-[--success-border] bg-[--success-bg]',
        warning: 'border-[--warning-border] bg-[--warning-bg]',
        danger: 'border-[--danger-border] bg-[--danger-bg]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

interface ToastContentProps extends VariantProps<typeof toastVariants> {
  className?: string
  title?: React.ReactNode
  description?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Root>,
  ToastContentProps
>(({ className, variant, title, description, open, onOpenChange }, ref) => (
  <ToastPrimitive.Root
    ref={ref}
    className={cn(toastVariants({ variant, className }))}
    open={open}
    onOpenChange={onOpenChange}
  >
    <div className="flex flex-col gap-1">
      {title && <ToastPrimitive.Title className="font-medium">{title}</ToastPrimitive.Title>}
      {description && <ToastPrimitive.Description className="text-sm">{description}</ToastPrimitive.Description>}
    </div>
    <ToastPrimitive.Close className="h-6 w-6 flex items-center justify-center text-[--text-tertiary] hover:text-[--text-primary]">
      ×
    </ToastPrimitive.Close>
  </ToastPrimitive.Root>
))

Toast.displayName = 'Toast'

export { Toast, toastVariants }
export type { ToastContentProps as ToastProps }
