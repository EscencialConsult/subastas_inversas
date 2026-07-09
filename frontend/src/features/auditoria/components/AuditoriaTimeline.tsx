import { ReactNode } from 'react'

interface TimelineEvent {
  id?: string
  fecha: string
  texto: string
  tipo: 'creado' | 'invitacion' | 'subasta' | 'evaluacion' | 'adjudicacion' | 'aprobacion'
}

interface AuditoriaTimelineProps {
  eventos: TimelineEvent[]
  renderItem?: (evento: TimelineEvent) => ReactNode
  emptyText?: string
}

const COLORES_TIPO: Record<string, string> = {
  creado: 'bg-info',
  invitacion: 'bg-primary',
  subasta: 'bg-warning',
  evaluacion: 'bg-info',
  adjudicacion: 'bg-success',
  aprobacion: 'bg-success',
}

export function AuditoriaTimeline({ eventos, renderItem, emptyText = 'No hay eventos para mostrar.' }: AuditoriaTimelineProps) {
  if (!eventos?.length) {
    return <p className="text-sm text-text-muted">{emptyText}</p>
  }

  return (
    <div className="relative pl-6">
      <div className="absolute left-[11px] top-2 h-[calc(100%-16px)] w-0.5 bg-border" aria-hidden="true" />
      <div className="space-y-4">
        {eventos.map((evento, index) => (
          <div key={evento.id ?? `evento-${index}`} className="relative">
            <div
              className={`absolute -left-[22px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-surface ${COLORES_TIPO[evento.tipo] ?? 'bg-text-muted'}`}
              aria-hidden="true"
            />
            <div className="text-sm">
              <span className="font-mono text-xs text-text-muted">{evento.fecha || '---'}</span>
              <p className="mt-0.5 text-text">{renderItem ? renderItem(evento) : evento.texto}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
