import type { ComponentType, ReactNode } from 'react'

export interface EmptyStateProps {
  icon?: ComponentType<{ size?: number }>
  title?: string
  description?: ReactNode
  action?: ReactNode
}

export function EmptyState(props: EmptyStateProps): ReactNode
