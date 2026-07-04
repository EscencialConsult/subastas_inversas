import { Alert } from '../../../../shared/ui/Alert'
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
    <div className="rounded-md border border-border bg-surface p-5 shadow-sm">
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
        <Alert variant="success" className="mt-4">
          {proceso.estado === ESTADO_PROCESO.APROBADA
            ? `Adjudicado y aprobado: ${proceso.adjudicacion.proveedor} (${proceso.adjudicacion.fecha}).`
            : `Adjudicado a ${proceso.adjudicacion.proveedor}, pendiente de aprobacion de la Autoridad.`}
        </Alert>
      )}

      {proceso?.aprobacion?.estado === 'rechazada' && (
        <Alert variant="error" className="mt-4">
          La Autoridad rechazo la adjudicacion. Motivo: {proceso.aprobacion.motivo}
        </Alert>
      )}

      <div className="flex flex-wrap justify-end gap-2" style={{ marginTop: '24px' }}>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60"
          onClick={() => navigate('/compras')}
        >
          Volver
        </button>
      </div>

      {subasta && <ResumenSubasta subasta={subasta} formatearPesos={formatearPesos} />}
    </div>
  )
}

function ResumenSubasta({ subasta, formatearPesos }) {
  const lances = [...(subasta.lances ?? [])].sort((x, y) => x.monto - y.monto)
  const oferentes = new Set(lances.map((l) => l.proveedorId ?? l.proveedor)).size
  const mejor = lances[0]?.monto ?? 0
  const base = subasta.precioBase ?? 0
  const ahorro = base - mejor
  const bajaPorcentaje = base > 0 ? (ahorro / base) * 100 : 0

  return (
    <div className="rounded-md border border-border bg-surface p-5 shadow-sm" style={{ marginTop: '24px' }}>
      <h2 className="text-lg font-semibold text-text">Resultado de la subasta</h2>
      <div className="perfil__solo-lectura" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
        <span>Proveedores que ofertaron: {oferentes}</span>
        <span>Lances totales: {lances.length}</span>
        <span>Presupuesto base: {formatearPesos(base)}</span>
        <span>Mejor oferta: {formatearPesos(mejor)}</span>
        <span>Baja lograda: {bajaPorcentaje.toFixed(1)}%</span>
      </div>

      <h3 className="text-base font-semibold text-text" style={{ marginTop: '16px' }}>Lances ({lances.length})</h3>
      {lances.length === 0 ? (
        <p className="text-sm text-text-muted">No hay lances registrados en esta subasta.</p>
      ) : (
        <div className="overflow-x-auto w-full border border-border rounded-lg shadow-sm">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead>
              <tr>
                <th>Proveedor</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              {lances.map((l) => (
                <tr key={l.id}>
                  <td>{l.proveedor}</td>
                  <td>{formatearPesos(l.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
