import type { ReactNode } from 'react'

export interface TableToolbarProps {
  title?: ReactNode
  description?: ReactNode
  meta?: ReactNode
  actions?: ReactNode
  className?: string
}

export function TableToolbar({ title, description, meta, actions, className = '' }: TableToolbarProps) {
  return (
    <div
      className={[
        'flex flex-col gap-3 rounded-t-md border border-border bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
        className,
      ].filter(Boolean).join(' ')}
    >
      <div className="min-w-0">
        {title && <h2 className="m-0 text-base font-semibold text-text">{title}</h2>}
        {description && <p className="m-0 mt-1 text-sm text-text-muted">{description}</p>}
        {meta && <div className="mt-2 flex flex-wrap items-center gap-2">{meta}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{actions}</div>}
    </div>
  )
}
