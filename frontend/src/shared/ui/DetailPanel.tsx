import type { ReactNode } from 'react'

export interface DetailPanelProps {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
}

export function DetailPanel({ title, description, actions, children, className = '' }: DetailPanelProps) {
  return (
    <section className={['rounded-md border border-border bg-surface shadow-sm', className].filter(Boolean).join(' ')}>
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="m-0 text-base font-semibold text-text">{title}</h2>
          {description && <p className="m-0 mt-1 text-sm leading-6 text-text-muted">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <div className="px-5 py-5">{children}</div>
    </section>
  )
}
