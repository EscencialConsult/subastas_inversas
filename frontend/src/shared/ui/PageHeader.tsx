import { ReactNode } from 'react'

export interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  eyebrow?: ReactNode
  actions?: ReactNode
  meta?: ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  meta,
  className = '',
}: PageHeaderProps) {
  return (
    <header className={['flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-start lg:justify-between', className].filter(Boolean).join(' ')}>
      <div className="min-w-0 space-y-2">
        {eyebrow && <div className="text-xs font-semibold uppercase tracking-wider text-text-muted">{eyebrow}</div>}
        <div className="space-y-1">
          <h1 className="m-0 text-2xl font-semibold leading-tight text-text sm:text-3xl">{title}</h1>
          {description && <p className="m-0 max-w-3xl text-sm leading-6 text-text-muted">{description}</p>}
        </div>
        {meta && <div className="flex flex-wrap items-center gap-2 pt-1">{meta}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
