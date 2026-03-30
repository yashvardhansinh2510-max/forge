'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'framer-motion'
import { slideOverVariants } from '../../lib/variants'
import { cn } from '../../lib/cn'

interface SlideOverProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
  side?: 'left' | 'right'
}

const SlideOver = ({ open, onOpenChange, children, side = 'right' }: SlideOverProps) => {
  const variants = side === 'left'
    ? { ...slideOverVariants, initial: { ...slideOverVariants.initial, x: '-100%' }, exit: { ...slideOverVariants.exit, x: '-100%' } }
    : slideOverVariants

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence mode="wait">
        {open && (
          <>
            <DialogPrimitive.Portal forceMount>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                onClick={() => onOpenChange?.(false)}
              />
            </DialogPrimitive.Portal>
            <DialogPrimitive.Portal forceMount>
              <motion.div
                variants={variants}
                initial="initial"
                animate="animate"
                exit="exit"
                className={cn(
                  'fixed top-0 z-50 h-screen w-full max-w-md bg-white shadow-lg',
                  side === 'right' ? 'right-0' : 'left-0',
                )}
              >
                <DialogPrimitive.Content className="h-full flex flex-col">
                  {children}
                </DialogPrimitive.Content>
              </motion.div>
            </DialogPrimitive.Portal>
          </>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  )
}

const SlideOverHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex items-center justify-between border-b border-[--border-subtle] px-6 py-4', className)} {...props} />
))
SlideOverHeader.displayName = 'SlideOverHeader'

const SlideOverTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2 ref={ref} className={cn('text-lg font-semibold', className)} {...props} />
))
SlideOverTitle.displayName = 'SlideOverTitle'

const SlideOverContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex-1 overflow-y-auto px-6 py-4', className)} {...props} />
))
SlideOverContent.displayName = 'SlideOverContent'

const SlideOverFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('border-t border-[--border-subtle] flex justify-end gap-3 px-6 py-4', className)} {...props} />
))
SlideOverFooter.displayName = 'SlideOverFooter'

const SlideOverClose = DialogPrimitive.Close

export { SlideOver, SlideOverHeader, SlideOverTitle, SlideOverContent, SlideOverFooter, SlideOverClose }
export type { SlideOverProps }
