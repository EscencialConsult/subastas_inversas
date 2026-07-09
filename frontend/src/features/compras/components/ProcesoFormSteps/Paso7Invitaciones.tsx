import { Users } from 'lucide-react'
import { Checkbox } from '../../../../shared/ui/Checkbox'
import { EmptyState } from '../../../../shared/ui/EmptyState'
import { Spinner } from '../../../../shared/ui/Spinner'
import { Table } from '../../../../shared/ui/Table'

export function Paso7Invitaciones({ cargandoProveedores, proveedores, invitadosIds, manejarInvitacion }) {
  const rows = proveedores.map((proveedor) => ({
    ...proveedor,
    invitado: invitadosIds.includes(proveedor.id),
  }))

  return (
    <div>
      <h2 className="wizard-card__title">Etapa 7: Invitar proveedores verificados</h2>
      <p className="wizard-card__sub">
        Elige los proveedores de la red oficial a los que deseas enviar la invitacion de participacion.
      </p>

      {cargandoProveedores ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : proveedores.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Sin proveedores"
          description="No se encontraron proveedores activos y verificados en el directorio global."
        />
      ) : (
        <Table
          data={rows}
          sortable={false}
          columns={[
            {
              header: 'Invitar',
              accessor: 'invitado',
              render: (_value, proveedor) => (
                <Checkbox
                  checked={Boolean(proveedor.invitado)}
                  disabled={Boolean(proveedor.invitado)}
                  onChange={(event) => manejarInvitacion(proveedor.id, event.target.checked)}
                  aria-label={`Invitar a ${proveedor.razonSocial}`}
                  className="mb-0"
                />
              ),
            },
            { header: 'Razon social', accessor: 'razonSocial' },
            {
              header: 'CUIT',
              accessor: 'cuit',
              render: (value) => <code>{String(value ?? '---')}</code>,
            },
            { header: 'Rubro', accessor: 'rubro' },
          ]}
        />
      )}
    </div>
  )
}
