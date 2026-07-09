import { Alert } from '../../../../shared/ui/Alert'
import { Button } from '../../../../shared/ui/Button'
import { Card } from '../../../../shared/ui/Card'
import { Table } from '../../../../shared/ui/Table'
import { ESTADO_PROCESO } from '../../../../domain/compras'
import { ContratoPanel } from '../ContratoPanel'
import { InvitacionesPanel } from '../InvitacionesPanel'
import { ProcesoResumen } from '../ProcesoResumen'

export function ProcesoSoloLectura({
  proceso,
  datos,
  modalidadActual,
  formatearPesos,
  invitaciones,
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
  subasta,
  navigate,
}) {
  return (
    <Card hover={false} padding="lg" className="space-y-6">
      <ProcesoResumen
        proceso={proceso}
        datos={datos}
        modalidadActual={modalidadActual}
        formatearPesos={formatearPesos}
      />

      <InvitacionesPanel invitaciones={invitaciones} />

      {(proceso?.ordenesCompra ?? []).map((orden) => (
        <ContratoPanel
          key={orden.id}
          proceso={proceso}
          ordenCompra={orden}
          recepcionEstado={recepcionEstado}
          setRecepcionEstado={setRecepcionEstado}
          recepcionObservaciones={recepcionObservaciones}
          setRecepcionObservaciones={setRecepcionObservaciones}
          recepcionCantidades={recepcionCantidades}
          setRecepcionCantidades={setRecepcionCantidades}
          registrandoRecepcion={registrandoRecepcion}
          registrarRecepcion={registrarRecepcion}
          pagoContrato={pagoContrato}
          setPagoContrato={setPagoContrato}
          registrandoPago={registrandoPago}
          registrarPago={registrarPago}
          formatearPesos={formatearPesos}
        />
      ))}

      {proceso?.adjudicacion && (
        <Alert variant="success">
          {proceso.estado === ESTADO_PROCESO.APROBADA
            ? `Adjudicado y aprobado: ${proceso.adjudicacion.proveedor} (${proceso.adjudicacion.fecha}).`
            : `Adjudicado a ${proceso.adjudicacion.proveedor}, pendiente de aprobacion de la Autoridad.`}
        </Alert>
      )}

      {proceso?.aprobacion?.estado === 'rechazada' && (
        <Alert variant="error">
          La Autoridad rechazo la adjudicacion. Motivo: {proceso.aprobacion.motivo}
        </Alert>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => navigate('/compras')}>
          Volver
        </Button>
      </div>

      {subasta && <ResumenSubasta subasta={subasta} formatearPesos={formatearPesos} />}
    </Card>
  )
}

function ResumenSubasta({ subasta, formatearPesos }) {
  const lances = [...(subasta.lances ?? [])].sort((x, y) => x.monto - y.monto)
  const oferentes = new Set(lances.map((lance) => lance.proveedorId ?? lance.proveedor)).size
  const mejor = lances[0]?.monto ?? 0
  const base = subasta.precioBase ?? 0
  const ahorro = base - mejor
  const bajaPorcentaje = base > 0 ? (ahorro / base) * 100 : 0

  return (
    <Card hover={false} padding="md">
      <h2 className="m-0 text-lg font-semibold text-text">Resultado de la subasta</h2>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
        <ResumenDato label="Proveedores" value={oferentes} />
        <ResumenDato label="Lances" value={lances.length} />
        <ResumenDato label="Presupuesto base" value={formatearPesos(base)} />
        <ResumenDato label="Mejor oferta" value={formatearPesos(mejor)} />
        <ResumenDato label="Baja lograda" value={`${bajaPorcentaje.toFixed(1)}%`} />
      </dl>

      <h3 className="mt-5 text-base font-semibold text-text">Lances ({lances.length})</h3>
      {lances.length === 0 ? (
        <p className="text-sm text-text-muted">No hay lances registrados en esta subasta.</p>
      ) : (
        <Table
          data={lances}
          sortable={false}
          columns={[
            { header: 'Proveedor', accessor: 'proveedor' },
            {
              header: 'Monto',
              accessor: 'monto',
              render: (value) => formatearPesos(Number(value) || 0),
            },
          ]}
        />
      )}
    </Card>
  )
}

function ResumenDato({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-text-muted">{label}</dt>
      <dd className="m-0 mt-1 text-sm font-semibold text-text">{value}</dd>
    </div>
  )
}
