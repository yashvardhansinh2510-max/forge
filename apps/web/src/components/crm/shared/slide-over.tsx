'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

interface SlideOverProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: React.ReactNode
  width?: number
}

export function SlideOver({ open, onClose, title, subtitle, children, width = 480 }: SlideOverProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            {/* Overlay */}
            <DialogPrimitive.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 50,
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  backdropFilter: 'blur(2px)',
                }}
              />
            </DialogPrimitive.Overlay>

            {/* Panel */}
            <DialogPrimitive.Content asChild>
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  position: 'fixed',
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width,
                  zIndex: 51,
                  background: 'white',
                  borderLeft: '1px solid var(--border-default)',
                  boxShadow: '-8px 0 32px rgba(0,0,0,0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  overflowY: 'auto',
                }}
              >
                {/* Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    padding: '20px 24px',
                    borderBottom: '1px solid var(--border-subtle)',
                    flexShrink: 0,
                  }}
                >
                  <div>
                    <DialogPrimitive.Title
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 18,
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        letterSpacing: '-0.02em',
                        margin: 0,
                      }}
                    >
                      {title}
                    </DialogPrimitive.Title>
                    {subtitle && (
                      <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 }}>
                        {subtitle}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={onClose}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      border: '1px solid var(--border-default)',
                      background: 'white',
                      cursor: 'pointer',
                      color: 'var(--text-tertiary)',
                      transition: 'all 120ms',
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget
                      el.style.background = 'var(--surface-ground)'
                      el.style.color = 'var(--text-primary)'
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget
                      el.style.background = 'white'
                      el.style.color = 'var(--text-tertiary)'
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Body */}
                <div style={{ flex: 1, padding: '20px 24px' }}>
                  {children}
                </div>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  )
}

// ─── Detail Field ─────────────────────────────────────────────────────────────

export function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--text-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{value}</div>
    </div>
  )
}
