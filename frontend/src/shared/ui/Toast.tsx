import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { X, CheckCircle, AlertTriangle, Info, AlertOctagon } from 'lucide-react'
import { Button } from './Button'

type ToastType = 'success' | 'error' | 'warning' | 'info'

const icons = {
  success: CheckCircle,
  error: AlertOctagon,
  warning: AlertTriangle,
  info: Info,
}

const styles = {
  success: 'bg-success-bg text-success border-l-4 border-success',
  error: 'bg-error-bg text-error border-l-4 border-error',
  warning: 'bg-warning-bg text-warning border-l-4 border-warning',
  info: 'bg-info-bg text-info border-l-4 border-info',
}

interface ToastProps {
  id: number
  type?: ToastType
  message: ReactNode
  duration?: number
  onDismiss: (id: number) => void
}

export function Toast({ id, type = 'info', message, duration = 4000, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(id)
    }, duration)
    return () => clearTimeout(timer)
  }, [id, duration, onDismiss])

  const Icon = icons[type]

  return (
    <div
      role="alert"
      className={[
        'flex items-start gap-3 px-4 py-3 rounded-md shadow-lg min-w-[320px] max-w-[480px] pointer-events-auto',
        styles[type],
      ].join(' ')}
    >
      <Icon size={18} className="mt-0.5 shrink-0" />
      <p className="text-sm flex-1 leading-snug">{message}</p>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDismiss(id)}
        icon={<X size={14} />}
        aria-label="Cerrar notificacion"
      />
    </div>
  )
}
