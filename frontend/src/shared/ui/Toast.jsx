import { useEffect } from 'react'
import { X, CheckCircle, AlertTriangle, Info, AlertOctagon } from 'lucide-react'

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

export function Toast({ id, type = 'info', message, duration = 4000, onDismiss }) {
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
      <button
        onClick={() => onDismiss(id)}
        className="shrink-0 p-0.5 rounded hover:opacity-70 transition-opacity cursor-pointer"
        aria-label="Cerrar notificación"
      >
        <X size={14} />
      </button>
    </div>
  )
}
