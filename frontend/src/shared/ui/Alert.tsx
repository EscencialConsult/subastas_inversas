import { ReactNode } from 'react'
import { X, AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Button } from './Button'

const config = {
  error: {
    bg: 'bg-error-bg',
    text: 'text-error',
    Icon: AlertCircle,
  },
  success: {
    bg: 'bg-success-bg',
    text: 'text-success',
    Icon: CheckCircle2,
  },
  warning: {
    bg: 'bg-warning-bg',
    text: 'text-warning',
    Icon: TriangleAlert,
  },
  info: {
    bg: 'bg-info-bg',
    text: 'text-info',
    Icon: Info,
  },
}

export interface AlertProps {
  variant?: 'error' | 'success' | 'warning' | 'info'
  title?: string
  dismissible?: boolean
  onDismiss?: () => void
  children?: ReactNode
  className?: string
}

export function Alert({
  variant = 'info',
  title,
  dismissible = false,
  onDismiss,
  children,
  className = '',
}: AlertProps) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  const { bg, text, Icon } = config[variant]

  function handleDismiss() {
    setDismissed(true)
    onDismiss?.()
  }

  return (
    <div className={`${bg} ${text} p-3 px-4 rounded-md mb-4 text-sm leading-[1.5] flex gap-3 items-start ${className}`} role="alert">
      <Icon className="shrink-0 mt-0.5" size={16} />
      <div className="flex-1 min-w-0">
        {title && <div className="font-semibold mb-1">{title}</div>}
        {children}
      </div>
      {dismissible && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          icon={<X size={14} />}
          aria-label="Cerrar"
        />
      )}
    </div>
  )
}
