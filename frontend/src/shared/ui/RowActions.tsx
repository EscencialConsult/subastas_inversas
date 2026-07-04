import type { ReactNode } from 'react'

export interface RowActionsProps {
  children: ReactNode
  align?: 'start' | 'end'
  className?: string
}

export function RowActions({ children, align = 'end', className = '' }: RowActionsProps) {
  return (
    <div
      className={[
        'flex flex-wrap items-center gap-2',
        align === 'end' ? 'justify-end' : 'justify-start',
        className,
      ].filter(Boolean).join(' ')}
    >
      {children}
    </div>
  )
}
