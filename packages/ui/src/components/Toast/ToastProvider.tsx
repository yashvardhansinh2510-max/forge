'use client'

import * as React from 'react'
import * as ToastPrimitive from '@radix-ui/react-toast'
import { Toast, type ToastProps } from './Toast'

interface ToastMessage extends ToastProps {
  id: string
  open: boolean
}

interface ToastContextType {
  toasts: ToastMessage[]
  addToast: (toast: Omit<ToastMessage, 'id' | 'open'>) => void
  removeToast: (id: string) => void
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([])

  const addToast = React.useCallback((toast: Omit<ToastMessage, 'id' | 'open'>) => {
    const id = Math.random().toString(36).slice(2)
    const newToast: ToastMessage = { ...toast, id, open: true }

    setToasts((prev) => [...prev, newToast])

    const timer = setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, open: false } : t)))
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 300)
    }, 4000)

    return () => clearTimeout(timer)
  }, [])

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, open: false } : t)))
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 300)
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      <ToastPrimitive.Provider>
        {children}
        <ToastPrimitive.Viewport className="fixed bottom-0 right-0 flex flex-col gap-2 p-4 w-full md:w-96 pointer-events-none z-50" />
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            {...toast}
            onOpenChange={(open) => {
              if (!open) removeToast(toast.id)
            }}
          />
        ))}
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}
