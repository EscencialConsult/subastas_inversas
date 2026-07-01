import { Alert } from '../../../../components/ui/Alert'
import { ESTADO_PROCESO, etiquetaEstado } from '../../../../domain/compras'

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
    <div className="form">
      {proceso && (
        <div className="perfil__solo-lectura" style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span>Código del Proceso: <strong>{proceso.codigo}</strong></span>
          <span>Fecha de Creación: {proceso.creadoEn}</span>
          <span>Estado: <strong style={{ color: 'var(--color-primario)' }}>{etiquetaEstado(proceso.estado)}</strong></span>
          {proceso.specificationsHash && (
            <span>Hash de Especificaciones: <code>{proceso.specificationsHash}</code></span>
          )}
        </div>
      )}

      <div className="wizard-summary-section">
        <h3 className="wizard-summary-section__title">Información General</h3>
        <div className="wizard-summary-section__content">
          <p><strong>Título:</strong> {datos.titulo}</p>
          <p style={{ whiteSpace: 'pre-wrap' }}><strong>Descripción:</strong> {datos.descripcion}</p>
        </div>
      </div>

      <div className="wizard-summary-section">
        <h3 className="wizard-summary-section__title">Presupuesto y Modalidad</h3>
        <div className="wizard-summary-section__content">
          <p><strong>Presupuesto Estimado:</strong> {formatearPesos(Number(datos.presupuestoEstimado))}</p>
          <p><strong>Modalidad:</strong> {modalidadActual?.name ?? 'No especificada'}</p>
        </div>
      </div>

      <div className="wizard-summary-section">
        <h3 className="wizard-summary-section__title">Ítems Adquiridos ({datos.items.length})</h3>
        <div className="wizard-summary-section__content">
          <div className="overflow-x-auto w-full border border-border rounded-lg shadow-sm">
            <table className="tabla min-w-full">
              <thead>
                <tr>
                  <th>Descripción</th>
                  <th>Cantidad</th>
                  <th>Unidad</th>
                  <th>Precio Unitario Est.</th>
                </tr>
              </thead>
              <tbody>
                {datos.items.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.description}</td>
                    <td>{item.quantity}</td>
                    <td>{item.unit}</td>
                    <td>{item.estimatedUnitPrice ? formatearPesos(Number(item.estimatedUnitPrice)) : '---'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

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
                    const est = inv.estado === 'pendiente' ? { texto: 'Pendiente', clase: 'badge--warn' } :
                                inv.estado === 'aceptada' ? { texto: 'Aceptada', clase: 'badge--ok' } :
                                { texto: 'Rechazada', clase: 'badge--error' }
                    return (
                      <tr key={inv.id}>
                        <td>{inv.proveedor}</td>
                        <td><code>{inv.cuit}</code></td>
                        <td>
                          <span className={`badge ${est.clase}`}>{est.texto}</span>
                        </td>
                        <td>
                          {inv.estado === 'rechazada' && inv.rejectionReason ? (
                            <span>Rechazado: {inv.rejectionReason}</span>
                          ) : inv.estado === 'aceptada' ? (
                            <span>Confirmado</span>
                          ) : (
                            <span>Esperando respuesta</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {(proceso?.ordenesCompra ?? []).map((orden) => (
        <OrdenCompraRecepcion
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
            : `Adjudicado a ${proceso.adjudicacion.proveedor}, pendiente de aprobación de la Autoridad.`}
        </Alert>
      )}

      {proceso?.aprobacion?.estado === 'rechazada' && (
        <Alert variant="error" className="mt-4">La Autoridad rechazó la adjudicación. Motivo: {proceso.aprobacion.motivo}</Alert>
      )}

      <div className="form__acciones" style={{ marginTop: '24px' }}>
        <button
          type="button"
          className="btn btn--texto"
          onClick={() => navigate('/compras')}
        >
          Volver
        </button>
      </div>

      {subasta && <ResumenSubasta subasta={subasta} formatearPesos={formatearPesos} />}
    </div>
  )
}

function OrdenCompraRecepcion({
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
                      <td>
                        {recepcion.items.map((item) => `${item.descripcion}: ${item.cantidadRecibida} ${item.unidad}`).join(', ')}
                      </td>
                      <td>
                        {recepcion.documentoUrl ? (
                          <a href={recepcion.documentoUrl} target="_blank" rel="noreferrer">PDF</a>
                        ) : '---'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {contrato && (
          <>
            <h4 className="form__subtitulo" style={{ marginTop: '20px' }}>Pagos y penalidades</h4>
            {puedeRegistrarPago ? (
              <div style={{ display: 'grid', gap: '12px' }}>
                <div className="form__grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                  <label className="campo" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600' }}>Fecha de pago</span>
                    <input
                      type="date"
                      value={pagoContrato.fechaPago}
                      onChange={(e) => setPagoContrato((prev) => ({ ...prev, fechaPago: e.target.value }))}
                      disabled={registrandoPago}
                      style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--color-borde)' }}
                    />
                  </label>
                  <label className="campo" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600' }}>Monto pagado</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={pagoContrato.montoPago}
                      onChange={(e) => setPagoContrato((prev) => ({ ...prev, montoPago: e.target.value }))}
                      placeholder="0"
                      disabled={registrandoPago}
                      style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--color-borde)' }}
                    />
                  </label>
                  <label className="campo" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600' }}>Penalidad por demora</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={pagoContrato.montoPenalidad}
                      onChange={(e) => setPagoContrato((prev) => ({ ...prev, montoPenalidad: e.target.value }))}
                      placeholder="0"
                      disabled={registrandoPago}
                      style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--color-borde)' }}
                    />
                  </label>
                  <label className="campo" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600' }}>Dias de demora</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={pagoContrato.diasDemora}
                      onChange={(e) => setPagoContrato((prev) => ({ ...prev, diasDemora: e.target.value }))}
                      placeholder="0"
                      disabled={registrandoPago}
                      style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--color-borde)' }}
                    />
                  </label>
                </div>

                <label className="campo" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600' }}>Observaciones del pago</span>
                  <textarea
                    rows={3}
                    value={pagoContrato.notas}
                    onChange={(e) => setPagoContrato((prev) => ({ ...prev, notas: e.target.value }))}
                    placeholder="Comprobante, liquidacion, retenciones o detalle de penalidad."
                    disabled={registrandoPago}
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--color-borde)' }}
                  />
                </label>

                <div className="form__acciones">
                  <button
                    type="button"
                    className="btn btn--primario"
                    onClick={() => registrarPago(contrato)}
                    disabled={registrandoPago}
                  >
                    {registrandoPago ? 'Registrando...' : 'Registrar pago'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="form__seccion-ayuda">
                {contratoCompletado
                  ? 'La ejecucion del contrato ya fue cerrada.'
                  : 'El registro de pagos se habilita cuando la orden esta recibida.'}
              </p>
            )}

            {contrato.pagos && contrato.pagos.length > 0 && (
              <div className="overflow-x-auto w-full border border-border rounded-lg shadow-sm" style={{ marginTop: '12px' }}>
                <table className="tabla min-w-full">
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
        )}
      </div>
    </div>
  )
}

function ResumenSubasta({ subasta, formatearPesos }) {
  // Mock o simple wrapper del análisis
  const lances = [...(subasta.lances ?? [])].sort((x, y) => x.monto - y.monto)
  const oferentes = new Set(lances.map(l => l.proveedorId ?? l.proveedor)).size
  const mejor = lances[0]?.monto ?? 0
  const base = subasta.precioBase ?? 0
  const ahorro = base - mejor
  const bajaPorcentaje = base > 0 ? (ahorro / base) * 100 : 0

  return (
    <div className="form" style={{ marginTop: '24px' }}>
      <h2 className="form__titulo">Resultado de la subasta</h2>
      <div className="perfil__solo-lectura" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
        <span>Proveedores que ofertaron: {oferentes}</span>
        <span>Lances totales: {lances.length}</span>
        <span>Presupuesto base: {formatearPesos(base)}</span>
        <span>Mejor oferta: {formatearPesos(mejor)}</span>
        <span>Baja lograda: {bajaPorcentaje.toFixed(1)}%</span>
      </div>

      <h3 className="form__subtitulo" style={{ marginTop: '16px' }}>Lances ({lances.length})</h3>
      {lances.length === 0 ? (
        <p className="form__seccion-ayuda">No hay lances registrados en esta subasta.</p>
      ) : (
        <div className="overflow-x-auto w-full border border-border rounded-lg shadow-sm">
          <table className="tabla min-w-full">
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

// Helpers
function calcularPendientesRecepcion(proceso, ordenCompra) {
  const itemsOrdenados = obtenerItemsOrdenados(proceso, ordenCompra)
  return itemsOrdenados.map((item) => {
    const recibido = (ordenCompra.recepciones ?? [])
      .filter((recepcion) => recepcion.estado !== 'rechazada')
      .flatMap((recepcion) => recepcion.items ?? [])
      .filter((recepcionItem) => recepcionItem.purchaseItemId === item.purchaseItemId)
      .reduce((total, recepcionItem) => total + Number(recepcionItem.cantidadRecibida || 0), 0)
    const pendiente = Math.max(0, Number(item.ordenado || 0) - recibido)

    return {
      ...item,
      recibido,
      pendiente,
    }
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
