import { Badge } from '../../../shared/ui/Badge'
import { Card } from '../../../shared/ui/Card'
import { Table } from '../../../shared/ui/Table'

export function InvitacionesPanel({ invitaciones }) {
  return (
    <Card hover={false} padding="md">
      <h3 className="m-0 mb-3 border-b border-border pb-3 text-base font-semibold text-text">
        Invitaciones y respuestas ({invitaciones.length})
      </h3>
      {invitaciones.length === 0 ? (
        <p className="m-0 text-sm text-text-muted">No se enviaron invitaciones para este proceso.</p>
      ) : (
        <Table
          data={invitaciones}
          sortable={false}
          columns={[
            { header: 'Proveedor', accessor: 'proveedor' },
            {
              header: 'CUIT',
              accessor: 'cuit',
              render: (value) => <code>{String(value ?? '---')}</code>,
            },
            {
              header: 'Estado',
              accessor: 'estado',
              render: (value) => {
                const estado = estadoInvitacion(value)
                return <Badge variant={estado.variant}>{estado.texto}</Badge>
              },
            },
            {
              header: 'Detalle/Motivo',
              accessor: 'estado',
              render: (_value, invitacion) => detalleInvitacion(invitacion),
            },
          ]}
        />
      )}
    </Card>
  )
}

function estadoInvitacion(estado) {
  if (estado === 'pendiente') return { texto: 'Pendiente', variant: 'warning' as const }
  if (estado === 'aceptada') return { texto: 'Aceptada', variant: 'success' as const }
  return { texto: 'Rechazada', variant: 'error' as const }
}

function detalleInvitacion(inv) {
  if (inv.estado === 'rechazada' && inv.rejectionReason) return `Rechazado: ${inv.rejectionReason}`
  if (inv.estado === 'aceptada') return 'Confirmado'
  return 'Esperando respuesta'
}
