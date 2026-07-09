import { Button } from '../../../shared/ui/Button'
import { Input } from '../../../shared/ui/Input'
import { Table } from '../../../shared/ui/Table'
import { Textarea } from '../../../shared/ui/Textarea'

export function PagosPanel({
  contrato,
  puedeRegistrarPago,
  contratoCompletado,
  pagoContrato,
  setPagoContrato,
  registrandoPago,
  registrarPago,
  formatearPesos,
}) {
  return (
    <section className="space-y-4">
      <h4 className="m-0 text-base font-semibold text-text">Pagos y penalidades</h4>
      {puedeRegistrarPago ? (
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              label="Fecha de pago"
              type="date"
              value={pagoContrato.fechaPago}
              onChange={(event) => setPagoContrato((prev) => ({ ...prev, fechaPago: event.target.value }))}
              disabled={registrandoPago}
            />
            <Input
              label="Monto pagado"
              type="number"
              min="0"
              step="0.01"
              value={pagoContrato.montoPago}
              onChange={(event) => setPagoContrato((prev) => ({ ...prev, montoPago: event.target.value }))}
              placeholder="0"
              disabled={registrandoPago}
            />
            <Input
              label="Penalidad por demora"
              type="number"
              min="0"
              step="0.01"
              value={pagoContrato.montoPenalidad}
              onChange={(event) => setPagoContrato((prev) => ({ ...prev, montoPenalidad: event.target.value }))}
              placeholder="0"
              disabled={registrandoPago}
            />
            <Input
              label="Dias de demora"
              type="number"
              min="0"
              step="1"
              value={pagoContrato.diasDemora}
              onChange={(event) => setPagoContrato((prev) => ({ ...prev, diasDemora: event.target.value }))}
              placeholder="0"
              disabled={registrandoPago}
            />
          </div>

          <Textarea
            label="Observaciones del pago"
            rows={3}
            value={pagoContrato.notas}
            onChange={(event) => setPagoContrato((prev) => ({ ...prev, notas: event.target.value }))}
            placeholder="Comprobante, liquidacion, retenciones o detalle de penalidad."
            disabled={registrandoPago}
          />

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              onClick={() => registrarPago(contrato)}
              disabled={registrandoPago}
              loading={registrandoPago}
            >
              Registrar pago
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-text-muted">
          {contratoCompletado
            ? 'La ejecucion del contrato ya fue cerrada.'
            : 'El registro de pagos se habilita cuando la orden esta recibida.'}
        </p>
      )}

      {contrato.pagos && contrato.pagos.length > 0 && (
        <Table
          data={contrato.pagos}
          sortable={false}
          columns={[
            {
              header: 'Fecha',
              accessor: 'fechaPago',
              render: (value) => formatearFecha(value),
            },
            {
              header: 'Pago',
              accessor: 'montoPago',
              render: (value) => formatearPesos(Number(value) || 0),
            },
            {
              header: 'Penalidad',
              accessor: 'montoPenalidad',
              render: (value) => formatearPesos(Number(value) || 0),
            },
            {
              header: 'Demora',
              accessor: 'diasDemora',
              render: (value) => `${Number(value) || 0} dias`,
            },
            {
              header: 'Operador',
              accessor: 'operador',
              render: (value) => value ? String(value) : '---',
            },
            {
              header: 'Notas',
              accessor: 'notas',
              render: (_value, pago) => String(pago.notes || pago.notas || '---'),
            },
          ]}
        />
      )}
    </section>
  )
}

function formatearFecha(fecha) {
  if (!fecha) return '---'
  return new Date(String(fecha)).toLocaleDateString('es-AR')
}
