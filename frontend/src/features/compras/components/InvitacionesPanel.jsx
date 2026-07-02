export function InvitacionesPanel({ invitaciones }) {
  return (
    <div className="wizard-summary-section">
      <h3 className="wizard-summary-section__title">Invitaciones y Respuestas ({invitaciones.length})</h3>
      <div className="wizard-summary-section__content">
        {invitaciones.length === 0 ? (
          <p>No se enviaron invitaciones para este proceso.</p>
        ) : (
          <div className="overflow-x-auto w-full border border-border rounded-lg shadow-sm">
            <table className="tabla min-w-full">
              <thead>
                <tr>
                  <th>Proveedor</th>
                  <th>CUIT</th>
                  <th>Estado</th>
                  <th>Detalle/Motivo</th>
                </tr>
              </thead>
              <tbody>
                {invitaciones.map((inv) => {
                  const est = estadoInvitacion(inv.estado)
                  return (
                    <tr key={inv.id}>
                      <td>{inv.proveedor}</td>
                      <td><code>{inv.cuit}</code></td>
                      <td>
                        <span className={`badge ${est.clase}`}>{est.texto}</span>
                      </td>
                      <td>{detalleInvitacion(inv)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function estadoInvitacion(estado) {
  if (estado === 'pendiente') return { texto: 'Pendiente', clase: 'badge--warn' }
  if (estado === 'aceptada') return { texto: 'Aceptada', clase: 'badge--ok' }
  return { texto: 'Rechazada', clase: 'badge--error' }
}

function detalleInvitacion(inv) {
  if (inv.estado === 'rechazada' && inv.rejectionReason) return `Rechazado: ${inv.rejectionReason}`
  if (inv.estado === 'aceptada') return 'Confirmado'
  return 'Esperando respuesta'
}
