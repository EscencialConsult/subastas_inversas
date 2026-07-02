import { PagosPanel } from './PagosPanel.jsx'

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

  return (
    <div className="wizard-summary-section">
      <h3 className="wizard-summary-section__title">Recepcion, pagos y penalidades</h3>
      <div className="wizard-summary-section__content">
        <div className="perfil__solo-lectura" style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span>Orden: <strong>{ordenCompra.numero}</strong></span>
          <span>Proveedor: <strong>{ordenCompra.proveedor}</strong></span>
          <span>Monto: <strong>{formatearPesos(Number(ordenCompra.monto) || 0)}</strong></span>
          <span>Estado: <strong>{etiquetaEstadoOrdenCompra(ordenCompra.estado)}</strong></span>
          {contrato && (
            <>
              <span>Pagado: <strong>{formatearPesos(Number(contrato.totalPagado) || 0)}</strong></span>
              <span>Penalidades: <strong>{formatearPesos(Number(contrato.totalPenalidades) || 0)}</strong></span>
              <span>Saldo: <strong>{formatearPesos(Number(contrato.saldoPendiente) || 0)}</strong></span>
            </>
          )}
          {ordenCompra.documentoUrl && (
            <span>
              <a href={ordenCompra.documentoUrl} target="_blank" rel="noreferrer">Ver orden PDF</a>
            </span>
          )}
        </div>

        <div className="overflow-x-auto w-full border border-border rounded-lg shadow-sm">
          <table className="tabla min-w-full">
            <thead>
              <tr>
                <th>Item</th>
                <th>Ordenado</th>
                <th>Recibido</th>
                <th>Pendiente</th>
                {puedeRecibir && <th>Recibir ahora</th>}
              </tr>
            </thead>
            <tbody>
              {pendientes.map((item) => {
                const inputKey = `${ordenCompra.id}:${item.purchaseItemId}`
                return (
                  <tr key={item.purchaseItemId}>
                    <td>{item.descripcion}</td>
                    <td>{item.ordenado} {item.unidad}</td>
                    <td>{item.recibido} {item.unidad}</td>
                    <td>{item.pendiente} {item.unidad}</td>
                    {puedeRecibir && (
                      <td>
                        <input
                          type="number"
                          min="0"
                          max={item.pendiente}
                          step="0.01"
                          value={recepcionCantidades[inputKey] ?? ''}
                          onChange={(e) => setRecepcionCantidades((prev) => ({
                            ...prev,
                            [inputKey]: e.target.value,
                          }))}
                          placeholder="0"
                          style={{ maxWidth: '120px', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--color-borde)' }}
                          disabled={item.pendiente <= 0 || registrandoRecepcion}
                        />
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {puedeRecibir && (
          <div style={{ marginTop: '16px', display: 'grid', gap: '12px' }}>
            <label className="campo" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600' }}>Conformidad</span>
              <select
                value={recepcionEstado}
                onChange={(e) => setRecepcionEstado(e.target.value)}
                disabled={registrandoRecepcion}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--color-borde)' }}
              >
                <option value="Accepted">Conforme</option>
                <option value="AcceptedWithObservations">Conforme con observaciones</option>
                <option value="Rejected">Rechazada</option>
              </select>
            </label>

            <label className="campo" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600' }}>Observaciones</span>
              <textarea
                rows={3}
                value={recepcionObservaciones}
                onChange={(e) => setRecepcionObservaciones(e.target.value)}
                placeholder="Detalle de entrega, remito, diferencias o comentarios de conformidad."
                disabled={registrandoRecepcion}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--color-borde)' }}
              />
            </label>

            <div className="form__acciones">
              <button
                type="button"
                className="btn btn--primario"
                onClick={() => registrarRecepcion(ordenCompra)}
                disabled={registrandoRecepcion}
              >
                {registrandoRecepcion ? 'Registrando...' : 'Registrar recepcion'}
              </button>
            </div>
          </div>
        )}

        {ordenCompra.recepciones && ordenCompra.recepciones.length > 0 && (
          <>
            <h4 className="form__subtitulo" style={{ marginTop: '20px' }}>Recepciones registradas</h4>
            <div className="overflow-x-auto w-full border border-border rounded-lg shadow-sm">
              <table className="tabla min-w-full">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Conformidad</th>
                    <th>Recibio</th>
                    <th>Items</th>
                    <th>Documento</th>
                  </tr>
                </thead>
                <tbody>
                  {ordenCompra.recepciones.map((recepcion) => (
                    <tr key={recepcion.id}>
                      <td>{formatearFecha(recepcion.recibidaEn)}</td>
                      <td>{etiquetaEstadoRecepcion(recepcion.estado)}</td>
                      <td>{recepcion.receptor || '---'}</td>
                      <td>{recepcion.items.map((item) => `${item.descripcion}: ${item.cantidadRecibida} ${item.unidad}`).join(', ')}</td>
                      <td>{recepcion.documentoUrl ? <a href={recepcion.documentoUrl} target="_blank" rel="noreferrer">PDF</a> : '---'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
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
      </div>
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
  const itemsProceso = new Map((proceso.items ?? []).map((item) => [item.id, item]))
  const adjudicacion = (proceso.adjudicaciones ?? []).find((award) => {
    const contrato = (proceso.contratos ?? []).find((c) => c.id === ordenCompra.contratoId)
    return contrato ? award.id === contrato.awardId : award.proveedorId === ordenCompra.proveedorId
  })
  const awardItems = adjudicacion?.items ?? proceso.adjudicacion?.items ?? []

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
  return new Date(fecha).toLocaleDateString('es-AR')
}
