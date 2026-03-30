'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'framer-motion'
import { modalVariants } from '../../lib/variants'
import { cn } from '../../lib/cn'

export interface ModalProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

const Modal = ({ open, onOpenChange, children }: ModalProps) => {
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
                variants={modalVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2"
              >
                <DialogPrimitive.Content className="rounded-[--radius-lg] border border-[--border-default] bg-white shadow-[--shadow-modal]">
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

const ModalHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex items-center justify-between p-6 pb-4', className)} {...props} />
))
ModalHeader.displayName = 'ModalHeader'

const ModalTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2 ref={ref} className={cn('text-lg font-semibold', className)} {...props} />
))
ModalTitle.displayName = 'ModalTitle'

const ModalDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-[--text-secondary]', className)} {...props} />
))
ModalDescription.displayName = 'ModalDescription'

const ModalContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('px-6 py-4', className)} {...props} />
))
ModalContent.displayName = 'ModalContent'

const ModalFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex justify-end gap-3 border-t border-[--border-subtle] px-6 py-4', className)} {...props} />
))
ModalFooter.displayName = 'ModalFooter'

const ModalClose = DialogPrimitive.Close

export { Modal, ModalHeader, ModalTitle, ModalDescription, ModalContent, ModalFooter, ModalClose }
