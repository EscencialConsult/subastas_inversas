/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import type { ReactNode } from 'react'
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

  const toast = useMemo<ToastApi>(() => ({
    success: (msg: ReactNode, duration?: number) => addToast('success', msg, duration),
    error: (msg: ReactNode, duration?: number) => addToast('error', msg, duration),
    warning: (msg: ReactNode, duration?: number) => addToast('warning', msg, duration),
    info: (msg: ReactNode, duration?: number) => addToast('info', msg, duration),
  }), [addToast])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed top-4 right-4 z-[1100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto animate-slideIn">
            <Toast {...t} onDismiss={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
