import { Inbox } from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ComponentType<{ size?: number | string; className?: string }>
  title?: string
  description?: ReactNode
  action?: ReactNode
}

export function EmptyState({ icon: Icon = Inbox, title = 'Sin datos', description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed border-border rounded-lg">
      <div className="w-12 h-12 rounded-md bg-surface border border-border flex items-center justify-center text-text-muted mb-4">
        <Icon size={20} />
      </div>
      <h3 className="text-base font-bold text-text m-0">{title}</h3>
      {description && (
        <p className="text-sm text-text-muted mt-2 max-w-md leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
