import type { ComponentType, ReactNode } from 'react'
import { Alert } from './Alert'
import { EmptyState } from './EmptyState'
import { Spinner } from './Spinner'

interface LoadingStateProps {
  label?: ReactNode
}

interface ErrorStateProps {
  message?: ReactNode
  title?: string
}

interface EmptyResultsProps {
  icon?: ComponentType<{ size?: number | string; className?: string }>
  title?: string
  description?: ReactNode
  action?: ReactNode
}

export function LoadingState({ label = 'Cargando...' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-sm text-text-muted">
      <Spinner />
      <span>{label}</span>
    </div>
  )
}

export function ErrorState({ message, title = 'No pudimos cargar los datos' }: ErrorStateProps) {
  if (!message) return null
  return (
    <Alert variant="error" title={title}>
      {message}
    </Alert>
  )
}

export function EmptyResults({ icon, title = 'Sin datos', description, action }: EmptyResultsProps) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      action={action}
    />
  )
}
