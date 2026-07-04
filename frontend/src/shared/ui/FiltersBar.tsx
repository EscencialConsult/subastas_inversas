import type { ReactNode } from 'react'

export interface FiltersBarProps {
  children: ReactNode
  actions?: ReactNode
  className?: string
}

export function FiltersBar({ children, actions, className = '' }: FiltersBarProps) {
  return (
    <section
      className={[
        'flex flex-col gap-3 rounded-md border border-border bg-surface p-4 shadow-sm lg:flex-row lg:items-end lg:justify-between',
        className,
      ].filter(Boolean).join(' ')}
      aria-label="Filtros"
    >
      <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
        {children}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{actions}</div>}
    </section>
  )
}
