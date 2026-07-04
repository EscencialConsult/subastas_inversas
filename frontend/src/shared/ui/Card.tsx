import type { ReactNode } from 'react'

type CardPadding = 'sm' | 'md' | 'lg'

interface CardProps {
  hover?: boolean
  padding?: CardPadding
  className?: string
  children: ReactNode
}

export function Card({ hover = true, padding = 'md', className = '', children }: CardProps) {
  const paddings = { sm: 'p-4', md: 'p-5', lg: 'p-6' }
  return (
    <article
      className={`bg-surface border border-border rounded-lg shadow-sm ${paddings[padding]} ${hover ? 'transition-all duration-200 hover:border-primary-light hover:shadow-md hover:-translate-y-0.5' : ''} ${className}`}
    >
      {children}
    </article>
  )
}

export function CardGrid({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`grid gap-4 grid-cols-[repeat(auto-fill,minmax(300px,1fr))] ${className}`}>
      {children}
    </div>
  )
}
