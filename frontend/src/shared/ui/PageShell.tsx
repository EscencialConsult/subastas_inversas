import { ElementType, ReactNode } from 'react'

export interface PageShellProps {
  children: ReactNode
  className?: string
  width?: 'default' | 'wide' | 'full'
  as?: ElementType
}

const widths = {
  default: 'max-w-6xl',
  wide: 'max-w-7xl',
  full: 'max-w-none',
}

export function PageShell({ children, className = '', width = 'default', as: Component = 'main' }: PageShellProps) {
  return (
    <Component className={['w-full px-4 py-6 sm:px-6 lg:px-8', className].filter(Boolean).join(' ')}>
      <div className={['mx-auto w-full space-y-6', widths[width]].join(' ')}>
        {children}
      </div>
    </Component>
  )
}
