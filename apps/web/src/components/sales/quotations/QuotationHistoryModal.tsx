'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Clock } from 'lucide-react'
import { formatINR } from '@/lib/format'
import { format } from 'date-fns'
import type { Quotation } from '@/lib/mock/sales-data'

const APPLE_EASE = [0.22, 1, 0.36, 1] as const

interface QuotationHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  quotation: Quotation | null
}

export function QuotationHistoryModal({
  isOpen,
  onClose,
  quotation,
}: QuotationHistoryModalProps) {

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={onClose}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 50,
          }}
        />
        <DialogPrimitive.Content
          style={{
            position: 'fixed',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'white',
            borderRadius: 12,
            boxShadow: 'var(--shadow-lg)',
            maxWidth: 500,
            width: '90vw',
            maxHeight: '80vh',
            overflow: 'auto',
            zIndex: 51,
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: APPLE_EASE }}
          >
            <div style={{ padding: 24, borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={18} style={{ color: 'var(--text-secondary)' }} />
                <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Quotation History
                </h2>
              </div>
              <DialogPrimitive.Close
                asChild>
                <button
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 6,
                    border: 'none',
                    background: 'var(--surface-tint)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={16} />
                </button>
              </DialogPrimitive.Close>
            </div>

            <div style={{ padding: 16 }}>
              {!quotation ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-tertiary)' }}>
                  <p>No quotation selected.</p>
                </div>
              ) : (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-tertiary)' }}>
                  <p>Quotation history feature coming soon.</p>
                  <p style={{ marginTop: 8, fontSize: 12 }}>Current quotation: {quotation.number}</p>
                </div>
              )}
            </div>
          </motion.div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
