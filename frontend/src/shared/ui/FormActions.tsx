import { ReactNode } from 'react'

export interface FormActionsProps {
  children: ReactNode
  align?: 'start' | 'end' | 'between'
  sticky?: boolean
  className?: string
}

const alignments = {
  start: 'justify-start',
  end: 'justify-end',
  between: 'justify-between',
}

export function FormActions({
  children,
  align = 'end',
  sticky = false,
  className = '',
}: FormActionsProps) {
  return (
    <div
      className={[
        'flex flex-wrap items-center gap-2 border-t border-border bg-surface px-5 py-4',
        alignments[align],
        sticky ? 'sticky bottom-0 z-10 shadow-[0_-6px_16px_rgba(15,23,42,0.06)]' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  )
}
