const statusConfig: Record<string, { dot: string; pulse: boolean; label: string }> = {
  'En vivo': { dot: 'bg-success', pulse: false, label: 'En vivo' },
  'Conectando': { dot: 'bg-warning', pulse: true, label: 'Conectando\u2026' },
  'Reconectando': { dot: 'bg-warning', pulse: true, label: 'Reconectando\u2026' },
  'Desconectada': { dot: 'bg-error', pulse: false, label: 'Desconectada' },
  'Sin conexion': { dot: 'bg-error', pulse: false, label: 'Sin conexi\u00f3n' },
}

export interface ConnectionStatusProps {
  status: string
  className?: string
}

export function ConnectionStatus({ status, className = '' }: ConnectionStatusProps) {
  const config = statusConfig[status] ?? { dot: 'bg-text-muted', pulse: false, label: status }

  return (
    <article className={`rounded-md border border-border bg-surface px-4 py-4 shadow-sm ${className}`}>
      <div className="flex items-center gap-2 text-sm font-medium text-text-muted">
        <span className="relative flex h-2.5 w-2.5 items-center justify-center">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${config.dot}`} />
          {config.pulse && (
            <span className={`absolute inline-block h-full w-full animate-ping rounded-full ${config.dot} opacity-40`} />
          )}
        </span>
        <span>Conexi&oacute;n</span>
      </div>
      <p className="mt-2 text-xl font-semibold text-text">{config.label}</p>
    </article>
  )
}
