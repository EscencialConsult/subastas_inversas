import { Button } from '../../../shared/ui/Button'
import { Card } from '../../../shared/ui/Card'
import { Input } from '../../../shared/ui/Input'
import { Select } from '../../../shared/ui/Select'
import { Table } from '../../../shared/ui/Table'
import { Textarea } from '../../../shared/ui/Textarea'
import { PagosPanel } from './PagosPanel'

export function ContratoPanel({
  proceso,
  ordenCompra,
  recepcionEstado,
  setRecepcionEstado,
  recepcionObservaciones,
  setRecepcionObservaciones,
  recepcionCantidades,
  setRecepcionCantidades,
  registrandoRecepcion,
  registrarRecepcion,
  pagoContrato,
  setPagoContrato,
  registrandoPago,
  registrarPago,
  formatearPesos,
}) {
  const pendientes = calcularPendientesRecepcion(proceso, ordenCompra)
  const puedeRecibir = ordenCompra.estado !== 'recibida' && ordenCompra.estado !== 'cancelada' &&
    pendientes.some((item) => item.pendiente > 0)
  const contrato = (proceso.contratos ?? []).find((c) => c.id === ordenCompra.contratoId)
  const contratoCompletado = contrato?.estado === 'Completed' || contrato?.estado === 2
  const puedeRegistrarPago = contrato && ordenCompra.estado === 'recibida' && !contratoCompletado
  const pendientesRows = pendientes.map((item) => ({
    ...item,
    id: item.purchaseItemId,
    inputKey: `${ordenCompra.id}:${item.purchaseItemId}`,
  }))

  return (
    <Card hover={false} padding="md" className="space-y-4">
      <h3 className="m-0 text-base font-semibold text-text">Recepcion, pagos y penalidades</h3>

      <dl className="grid gap-3 rounded-md border border-border bg-background p-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <ResumenDato label="Orden" value={<strong>{ordenCompra.numero}</strong>} />
        <ResumenDato label="Proveedor" value={<strong>{ordenCompra.proveedor}</strong>} />
        <ResumenDato label="Monto" value={<strong>{formatearPesos(Number(ordenCompra.monto) || 0)}</strong>} />
        <ResumenDato label="Estado" value={<strong>{etiquetaEstadoOrdenCompra(ordenCompra.estado)}</strong>} />
        {contrato && (
          <>
            <ResumenDato label="Pagado" value={<strong>{formatearPesos(Number(contrato.totalPagado) || 0)}</strong>} />
            <ResumenDato label="Penalidades" value={<strong>{formatearPesos(Number(contrato.totalPenalidades) || 0)}</strong>} />
            <ResumenDato label="Saldo" value={<strong>{formatearPesos(Number(contrato.saldoPendiente) || 0)}</strong>} />
          </>
        )}
        {ordenCompra.documentoUrl && (
          <ResumenDato
            label="Documento"
            value={<a href={ordenCompra.documentoUrl} target="_blank" rel="noreferrer">Ver orden PDF</a>}
          />
        )}
      </dl>

      <Table
        data={pendientesRows}
        sortable={false}
        columns={[
          { header: 'Item', accessor: 'descripcion' },
          {
            header: 'Ordenado',
            accessor: 'ordenado',
            render: (_value, item) => `${item.ordenado} ${item.unidad}`,
          },
          {
            header: 'Recibido',
            accessor: 'recibido',
            render: (_value, item) => `${item.recibido} ${item.unidad}`,
          },
          {
            header: 'Pendiente',
            accessor: 'pendiente',
            render: (_value, item) => `${item.pendiente} ${item.unidad}`,
          },
          ...(puedeRecibir ? [{
            header: 'Recibir ahora',
            accessor: 'inputKey',
            render: (_value, item) => (
              <Input
                type="number"
                min="0"
                max={item.pendiente}
                step="0.01"
                value={recepcionCantidades[item.inputKey] ?? ''}
                onChange={(event) => setRecepcionCantidades((prev) => ({
                  ...prev,
                  [item.inputKey]: event.target.value,
                }))}
                placeholder="0"
                disabled={item.pendiente <= 0 || registrandoRecepcion}
                fieldClassName="mb-0"
                className="max-w-[120px]"
                aria-label={`Cantidad a recibir de ${item.descripcion}`}
              />
            ),
            sortKey: false,
          }] : []),
        ]}
      />

      {puedeRecibir && (
        <div className="grid gap-3">
          <Select
            label="Conformidad"
            value={recepcionEstado}
            onChange={(event) => setRecepcionEstado(event.target.value)}
            disabled={registrandoRecepcion}
          >
            <option value="Accepted">Conforme</option>
            <option value="AcceptedWithObservations">Conforme con observaciones</option>
            <option value="Rejected">Rechazada</option>
          </Select>

          <Textarea
            label="Observaciones"
            rows={3}
            value={recepcionObservaciones}
            onChange={(event) => setRecepcionObservaciones(event.target.value)}
            placeholder="Detalle de entrega, remito, diferencias o comentarios de conformidad."
            disabled={registrandoRecepcion}
          />

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              onClick={() => registrarRecepcion(ordenCompra)}
              disabled={registrandoRecepcion}
              loading={registrandoRecepcion}
            >
              Registrar recepcion
            </Button>
          </div>
        </div>
      )}

      {ordenCompra.recepciones && ordenCompra.recepciones.length > 0 && (
        <section className="space-y-3">
          <h4 className="m-0 text-base font-semibold text-text">Recepciones registradas</h4>
          <Table
            data={ordenCompra.recepciones}
            sortable={false}
            columns={[
              {
                header: 'Fecha',
                accessor: 'recibidaEn',
                render: (value) => formatearFecha(value),
              },
              {
                header: 'Conformidad',
                accessor: 'estado',
                render: (value) => etiquetaEstadoRecepcion(value),
              },
              {
                header: 'Recibio',
                accessor: 'receptor',
                render: (value) => value || '---',
              },
              {
                header: 'Items',
                accessor: 'items',
                render: (value) => {
                  const items = Array.isArray(value) ? value : []
                  return items.map((item) => `${item.descripcion}: ${item.cantidadRecibida} ${item.unidad}`).join(', ')
                },
              },
              {
                header: 'Documento',
                accessor: 'documentoUrl',
                render: (value) => value ? <a href={String(value)} target="_blank" rel="noreferrer">PDF</a> : '---',
              },
            ]}
          />
        </section>
      )}

      {contrato && (
        <PagosPanel
          contrato={contrato}
          puedeRegistrarPago={puedeRegistrarPago}
          contratoCompletado={contratoCompletado}
          pagoContrato={pagoContrato}
          setPagoContrato={setPagoContrato}
          registrandoPago={registrandoPago}
          registrarPago={registrarPago}
          formatearPesos={formatearPesos}
        />
      )}
    </Card>
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

function calcularPendientesRecepcion(proceso, ordenCompra) {
  const itemsOrdenados = obtenerItemsOrdenados(proceso, ordenCompra)
  return itemsOrdenados.map((item) => {
    const recibido = (ordenCompra.recepciones ?? [])
      .filter((recepcion) => recepcion.estado !== 'rechazada')
      .flatMap((recepcion) => recepcion.items ?? [])
      .filter((recepcionItem) => recepcionItem.purchaseItemId === item.purchaseItemId)
      .reduce((total, recepcionItem) => total + Number(recepcionItem.cantidadRecibida || 0), 0)
    const pendiente = Math.max(0, Number(item.ordenado || 0) - recibido)

    return { ...item, recibido, pendiente }
  })
}

function obtenerItemsOrdenados(proceso, ordenCompra) {
  const itemsProceso = new Map<string, { unit?: string }>(
    (proceso.items ?? []).map((item) => [item.id, item]),
  )
  const adjudicacion = (proceso.adjudicaciones ?? []).find((award) => {
    const contrato = (proceso.contratos ?? []).find((c) => c.id === ordenCompra.contratoId)
    return contrato ? award.id === contrato.awardId : award.proveedorId === ordenCompra.proveedorId
  })
  const awardItems = (adjudicacion?.items ?? proceso.adjudicacion?.items ?? []) as Array<{
    purchaseItemId?: string
    description?: string
    quantity?: number | string
    unit?: string
  }>

  if (awardItems.length > 0) {
    return awardItems.map((item) => ({
      purchaseItemId: item.purchaseItemId,
      descripcion: item.description,
      ordenado: Number(item.quantity) || 0,
      unidad: item.unit || itemsProceso.get(item.purchaseItemId)?.unit || '',
    }))
  }

  return (proceso.items ?? []).map((item) => ({
    purchaseItemId: item.id,
    descripcion: item.description,
    ordenado: Number(item.quantity) || 0,
    unidad: item.unit || '',
  }))
}

function etiquetaEstadoOrdenCompra(estado) {
  return {
    emitida: 'Emitida',
    parcial: 'Recepcion parcial',
    recibida: 'Recibida',
    cancelada: 'Cancelada',
  }[estado] ?? estado
}

function etiquetaEstadoRecepcion(estado) {
  return {
    aceptada: 'Conforme',
    aceptada_observaciones: 'Conforme con observaciones',
    rechazada: 'Rechazada',
  }[estado] ?? estado
}

function formatearFecha(fecha) {
  if (!fecha) return '---'
  return new Date(String(fecha)).toLocaleDateString('es-AR')
}
