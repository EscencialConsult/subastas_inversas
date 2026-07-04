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
    <>
      <h4 className="text-base font-semibold text-text" style={{ marginTop: '20px' }}>Pagos y penalidades</h4>
      {puedeRegistrarPago ? (
        <div style={{ display: 'grid', gap: '12px' }}>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
            <CampoPago label="Fecha de pago">
              <input
                type="date"
                value={pagoContrato.fechaPago}
                onChange={(e) => setPagoContrato((prev) => ({ ...prev, fechaPago: e.target.value }))}
                disabled={registrandoPago}
                style={inputStyle}
              />
            </CampoPago>
            <CampoPago label="Monto pagado">
              <input
                type="number"
                min="0"
                step="0.01"
                value={pagoContrato.montoPago}
                onChange={(e) => setPagoContrato((prev) => ({ ...prev, montoPago: e.target.value }))}
                placeholder="0"
                disabled={registrandoPago}
                style={inputStyle}
              />
            </CampoPago>
            <CampoPago label="Penalidad por demora">
              <input
                type="number"
                min="0"
                step="0.01"
                value={pagoContrato.montoPenalidad}
                onChange={(e) => setPagoContrato((prev) => ({ ...prev, montoPenalidad: e.target.value }))}
                placeholder="0"
                disabled={registrandoPago}
                style={inputStyle}
              />
            </CampoPago>
            <CampoPago label="Dias de demora">
              <input
                type="number"
                min="0"
                step="1"
                value={pagoContrato.diasDemora}
                onChange={(e) => setPagoContrato((prev) => ({ ...prev, diasDemora: e.target.value }))}
                placeholder="0"
                disabled={registrandoPago}
                style={inputStyle}
              />
            </CampoPago>
          </div>

          <CampoPago label="Observaciones del pago">
            <textarea
              rows={3}
              value={pagoContrato.notas}
              onChange={(e) => setPagoContrato((prev) => ({ ...prev, notas: e.target.value }))}
              placeholder="Comprobante, liquidacion, retenciones o detalle de penalidad."
              disabled={registrandoPago}
              style={inputStyle}
            />
          </CampoPago>

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
              onClick={() => registrarPago(contrato)}
              disabled={registrandoPago}
            >
              {registrandoPago ? 'Registrando...' : 'Registrar pago'}
            </button>
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
        <div className="overflow-x-auto w-full border border-border rounded-lg shadow-sm" style={{ marginTop: '12px' }}>
          <table className="min-w-full divide-y divide-border text-sm">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Pago</th>
                <th>Penalidad</th>
                <th>Demora</th>
                <th>Operador</th>
                <th>Notas</th>
              </tr>
            </thead>
            <tbody>
              {contrato.pagos.map((pago) => (
                <tr key={pago.id}>
                  <td>{formatearFecha(pago.fechaPago)}</td>
                  <td>{formatearPesos(Number(pago.montoPago) || 0)}</td>
                  <td>{formatearPesos(Number(pago.montoPenalidad) || 0)}</td>
                  <td>{Number(pago.diasDemora) || 0} dias</td>
                  <td>{pago.operador || '---'}</td>
                  <td>{pago.notes || pago.notas || '---'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

function CampoPago({ label, children }) {
  return (
    <label className="campo" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <span style={{ fontSize: '13px', fontWeight: '600' }}>{label}</span>
      {children}
    </label>
  )
}

const inputStyle = { padding: '8px', borderRadius: '4px', border: '1px solid var(--color-borde)' }

function formatearFecha(fecha) {
  if (!fecha) return '---'
  return new Date(fecha).toLocaleDateString('es-AR')
}
