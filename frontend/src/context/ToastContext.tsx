/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Toast } from '../shared/ui/Toast'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastItem {
  id: number
  type: ToastType
  message: ReactNode
  duration?: number
}

interface ToastApi {
  success: (msg: ReactNode, duration?: number) => number
  error: (msg: ReactNode, duration?: number) => number
  warning: (msg: ReactNode, duration?: number) => number
  info: (msg: ReactNode, duration?: number) => number
}

const ToastContext = createContext<ToastApi | null>(null)

let toastId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const addToast = useCallback((type: ToastType, message: ReactNode, duration?: number) => {
    const id = ++toastId
    setToasts((prev) => [...prev, { id, type, message, duration }])
    return id
  }, [])

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = {
    success: (msg: ReactNode, duration?: number) => addToast('success', msg, duration),
    error: (msg: ReactNode, duration?: number) => addToast('error', msg, duration),
    warning: (msg: ReactNode, duration?: number) => addToast('warning', msg, duration),
    info: (msg: ReactNode, duration?: number) => addToast('info', msg, duration),
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed top-4 right-4 z-[1100] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 80, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="pointer-events-auto"
            >
              <Toast {...t} onDismiss={removeToast} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
