import { Alert } from './Alert'
import { EmptyState } from './EmptyState.jsx'
import { Spinner } from './Spinner.jsx'

export function LoadingState({ label = 'Cargando...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-sm text-text-muted">
      <Spinner />
      <span>{label}</span>
    </div>
  )
}

export function ErrorState({ message, title = 'No pudimos cargar los datos' }) {
  if (!message) return null
  return (
    <Alert variant="error" title={title}>
      {message}
    </Alert>
  )
}

export function EmptyResults({ icon, title = 'Sin datos', description, action }) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      action={action}
    />
  )
}
