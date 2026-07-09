import { Badge } from '../../../shared/ui/Badge'
import { Card } from '../../../shared/ui/Card'
import { Table } from '../../../shared/ui/Table'

export function ProcesoResumen({ proceso, datos, modalidadActual, formatearPesos }) {
  const itemRows = datos.items.map((item, index) => ({ ...item, id: index }))

  return (
    <div className="space-y-4">
      {proceso && (
        <Card hover={false} padding="sm">
          <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <ResumenDato label="Codigo del proceso" value={<strong>{proceso.codigo}</strong>} />
            <ResumenDato label="Fecha de creacion" value={proceso.creadoEn} />
            <ResumenDato label="Estado" value={<Badge variant="info">{proceso.estado}</Badge>} />
            {proceso.specificationsHash && (
              <ResumenDato label="Hash de especificaciones" value={<code>{proceso.specificationsHash}</code>} />
            )}
          </dl>
        </Card>
      )}

      <ResumenSeccion title="Informacion general">
        <p><strong>Titulo:</strong> {datos.titulo}</p>
        <p className="whitespace-pre-wrap"><strong>Descripcion:</strong> {datos.descripcion}</p>
      </ResumenSeccion>

      <ResumenSeccion title="Presupuesto y modalidad">
        <p><strong>Presupuesto estimado:</strong> {formatearPesos(Number(datos.presupuestoEstimado))}</p>
        <p><strong>Modalidad:</strong> {modalidadActual?.name ?? 'No especificada'}</p>
      </ResumenSeccion>

      <ResumenSeccion title={`Items adquiridos (${datos.items.length})`}>
        <Table
          data={itemRows}
          sortable={false}
          columns={[
            { header: 'Descripcion', accessor: 'description' },
            { header: 'Cantidad', accessor: 'quantity' },
            { header: 'Unidad', accessor: 'unit' },
            {
              header: 'Precio unitario est.',
              accessor: 'estimatedUnitPrice',
              render: (value) => value ? formatearPesos(Number(value)) : '---',
            },
          ]}
        />
      </ResumenSeccion>
    </div>
  )
}

function ResumenSeccion({ title, children }) {
  return (
    <section className="rounded-md border border-border bg-surface p-4 shadow-sm">
      <h3 className="m-0 mb-3 border-b border-border pb-3 text-base font-semibold text-text">{title}</h3>
      <div className="space-y-2 text-sm text-text">{children}</div>
    </section>
  )
}

function ResumenDato({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-text-muted">{label}</dt>
      <dd className="m-0 mt-1 text-sm text-text">{value}</dd>
    </div>
  )
}
