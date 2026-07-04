export function AuditoriaTimeline({ eventos, renderItem, emptyText = 'No hay eventos para mostrar.' }) {
  if (!eventos?.length) {
    return <p className="text-sm text-text-muted">{emptyText}</p>
  }

  return (
    <div className="auditoria-timeline">
      {eventos.map((evento, index) => (
        <div className="auditoria-timeline__item" key={evento.id ?? `${evento.codigo ?? 'evento'}:${index}`}>
          <div className="auditoria-timeline__marker" />
          <div className="auditoria-timeline__content">
            {renderItem(evento)}
          </div>
        </div>
      ))}
    </div>
  )
}
