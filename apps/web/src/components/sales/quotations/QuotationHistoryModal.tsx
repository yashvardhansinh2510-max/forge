'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Clock } from 'lucide-react'
import { formatINR } from '@/lib/format'
import { format } from 'date-fns'
import type { QuotationRevision } from '@/lib/mock/sales-data'
import { getQuotationHistory } from '@/lib/mock/sales-data'

const APPLE_EASE = [0.22, 1, 0.36, 1] as const

interface QuotationHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  customerName: string | null
  onSelectRevision?: (revision: QuotationRevision) => void
}

export function QuotationHistoryModal({
  isOpen,
  onClose,
  customerName,
  onSelectRevision,
}: QuotationHistoryModalProps) {
  const [revisions, setRevisions] = React.useState<QuotationRevision[]>([])

  React.useEffect(() => {
    if (isOpen && customerName) {
      const history = getQuotationHistory(customerName)
      setRevisions(history)
    }
  }, [isOpen, customerName])

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
              {revisions.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-tertiary)' }}>
                  <p>No quotation history for this customer.</p>
                </div>
              ) : (
                <AnimatePresence>
                  {revisions.map((rev, i) => (
                    <motion.button
                      key={rev.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2, delay: i * 0.05 }}
                      onClick={() => {
                        onSelectRevision?.(rev)
                        onClose()
                      }}
                      style={{
                        width: '100%',
                        padding: 12,
                        marginBottom: 8,
                        borderRadius: 8,
                        border: '1px solid var(--border-default)',
                        background: 'white',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 150ms',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-tint)'
                        ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)'
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'white'
                        ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-default)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                            Rev #{rev.revisionNumber}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                            {format(rev.createdAt, 'MMM d, yyyy · h:mm a')}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}>
                            {formatINR(rev.grandTotal, false)}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                            {rev.status}
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
