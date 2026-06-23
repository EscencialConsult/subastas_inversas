// ProcesoContrato.jsx
// Gestión de contrato, orden de compra y recepciones para procesos adjudicados.

import { FileSignature, ClipboardList, PackageCheck, Award, Download } from 'lucide-react'
import { ESTADO_PROCESO } from '../../../domain/compras.js'
import { formatearPesos } from '../../../utils/formatear.js'

function cantidadRecibida(proceso, purchaseItemId) {
  return (proceso.ordenCompra?.recepciones ?? [])
    .flatMap((recepcion) => recepcion.items ?? [])
    .filter((item) => item.purchaseItemId === purchaseItemId)
    .reduce((total, item) => total + Number(item.quantityReceived || 0), 0)
}

export function ProcesoContrato({
  proceso,
  tenantId,
  guardando,
  terminosContrato,
  setTerminosContrato,
  fechaEntrega,
  setFechaEntrega,
  observacionesOrden,
  setObservacionesOrden,
  observacionesRecepcion,
  setObservacionesRecepcion,
  itemsRecepcion,
  setItemsRecepcion,
  onGenerarContrato,
  onEmitirOrden,
  onConfirmarRecepcion,
  onDescargarContrato,
  onDescargarOrden,
  onDescargarRecepcion,
}) {
  if (!proceso?.adjudicacion) return null

  const tieneMultiplesAdjudicaciones = (proceso.adjudicaciones?.length ?? 0) > 1

  return (
    <section className="perfil__seccion" style={{ marginBottom: 20 }}>
      <div className="perfil__seccion-header">
        <div className="perfil__seccion-icon">
          <FileSignature size={18} />
        </div>
        <div>
          <h2>Contratación y recepción</h2>
          <p>Gestión de contrato, orden de compra y recepción de bienes</p>
        </div>
      </div>

      <div className="perfil__cuerpo">

        {/* Tabla de múltiples adjudicaciones */}
        {tieneMultiplesAdjudicaciones && (
          <fieldset className="form__seccion">
            <legend>
              <div className="perfil__seccion-header" style={{ border: 'none', background: 'none', padding: 0 }}>
                <div className="perfil__seccion-icon">
                  <Award size={16} />
                </div>
                <h3>Adjudicaciones por proveedor</h3>
              </div>
            </legend>
            <table className="tabla">
              <thead>
                <tr>
                  <th>Proveedor</th>
                  <th>Monto</th>
                  <th>Items</th>
                  <th>Orden</th>
                </tr>
              </thead>
              <tbody>
                {proceso.adjudicaciones.map((award) => {
                  const contrato = proceso.contratos?.find((c) => c.awardId === award.id)
                  return (
                    <tr key={award.id}>
                      <td>{award.proveedor}</td>
                      <td>{formatearPesos(award.monto)}</td>
                      <td>{award.items?.map((item) => item.description).join(', ') || '-'}</td>
                      <td>
                        {!contrato ? (
                          <button
                            type="button"
                            className="btn btn--texto"
                            onClick={() => onGenerarContrato(award.id)}
                            disabled={guardando}
                          >
                            <FileSignature size={14} />
                            Generar contrato
                          </button>
                        ) : proceso.ordenesCompra?.some((o) => o.contractId === contrato.id) ? (
                          <span className="badge badge--ok">
                            {proceso.ordenesCompra.find((o) => o.contractId === contrato.id)?.number}
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="btn btn--texto"
                            onClick={() => onEmitirOrden(contrato.id)}
                            disabled={guardando}
                          >
                            <ClipboardList size={14} />
                            Emitir OC
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </fieldset>
        )}

        {/* Contrato (adjudicación única) */}
        {!tieneMultiplesAdjudicaciones && (
          !proceso.contrato ? (
            <fieldset className="form__seccion">
              <legend>
                <div className="perfil__seccion-header" style={{ border: 'none', background: 'none', padding: 0 }}>
                  <div className="perfil__seccion-icon"><FileSignature size={16} /></div>
                  <h3>Contrato</h3>
                </div>
              </legend>
              <p className="form__seccion-ayuda">
                Genera el contrato a partir de la adjudicacion aprobada.
              </p>
              <label className="campo">
                <span>Condiciones</span>
                <textarea
                  rows={3}
                  value={terminosContrato}
                  onChange={(e) => setTerminosContrato(e.target.value)}
                  placeholder="Plazos, condiciones de entrega, garantias..."
                />
              </label>
              <button
                type="button"
                className="btn btn--primario"
                onClick={() => onGenerarContrato(proceso.adjudicacion?.id)}
                disabled={guardando}
              >
                <FileSignature size={16} />
                Generar contrato
              </button>
            </fieldset>
          ) : (
            <fieldset className="form__seccion">
              <legend>
                <div className="perfil__seccion-header" style={{ border: 'none', background: 'none', padding: 0 }}>
                  <div className="perfil__seccion-icon"><FileSignature size={16} /></div>
                  <h3>Contrato</h3>
                </div>
              </legend>
              <div className="perfil__solo-lectura">
                <span>Nro: {proceso.contrato.number}</span>
                <span>Proveedor: {proceso.contrato.supplierName}</span>
                <span>Monto: {formatearPesos(proceso.contrato.amount)}</span>
                <span>Firmado: {proceso.contrato.signedAt}</span>
              </div>
              <button
                type="button"
                className="btn btn--secundario"
                onClick={onDescargarContrato}
              >
                <Download size={16} />
                Descargar contrato
              </button>
            </fieldset>
          )
        )}

        {/* Orden de compra — pendiente */}
        {proceso.contrato && !proceso.ordenCompra && (
          <fieldset className="form__seccion">
            <legend>
              <div className="perfil__seccion-header" style={{ border: 'none', background: 'none', padding: 0 }}>
                <div className="perfil__seccion-icon"><ClipboardList size={16} /></div>
                <h3>Orden de compra</h3>
              </div>
            </legend>
            <label className="campo">
              <span>Fecha prevista de entrega</span>
              <input
                type="date"
                value={fechaEntrega}
                onChange={(e) => setFechaEntrega(e.target.value)}
              />
            </label>
            <label className="campo">
              <span>Observaciones</span>
              <textarea
                rows={3}
                value={observacionesOrden}
                onChange={(e) => setObservacionesOrden(e.target.value)}
                placeholder="Indicaciones para la entrega..."
              />
            </label>
            <button
              type="button"
              className="btn btn--primario"
              onClick={() => onEmitirOrden()}
              disabled={guardando}
            >
              <ClipboardList size={16} />
              Emitir orden de compra
            </button>
          </fieldset>
        )}

        {/* Orden de compra — emitida */}
        {proceso.ordenCompra && (
          <fieldset className="form__seccion">
            <legend>
              <div className="perfil__seccion-header" style={{ border: 'none', background: 'none', padding: 0 }}>
                <div className="perfil__seccion-icon"><ClipboardList size={16} /></div>
                <h3>Orden de compra</h3>
              </div>
            </legend>
            <div className="perfil__solo-lectura">
              <span>Nro: {proceso.ordenCompra.number}</span>
              <span>Proveedor: {proceso.ordenCompra.supplierName}</span>
              <span>Monto: {formatearPesos(proceso.ordenCompra.amount)}</span>
              <span>Emitida: {proceso.ordenCompra.issuedAt}</span>
              {proceso.ordenCompra.expectedDeliveryDate && (
                <span>Entrega prevista: {proceso.ordenCompra.expectedDeliveryDate}</span>
              )}
            </div>
            <button
              type="button"
              className="btn btn--secundario"
              onClick={onDescargarOrden}
            >
              <Download size={16} />
              Descargar orden
            </button>
          </fieldset>
        )}

        {/* Registrar recepción parcial */}
        {proceso.ordenCompra && proceso.estado !== ESTADO_PROCESO.RECIBIDO && (
          <fieldset className="form__seccion">
            <legend>
              <div className="perfil__seccion-header" style={{ border: 'none', background: 'none', padding: 0 }}>
                <div className="perfil__seccion-icon"><PackageCheck size={16} /></div>
                <h3>Confirmar recepción parcial</h3>
              </div>
            </legend>
            {proceso.items.map((item) => {
              const recibido = cantidadRecibida(proceso, item.id)
              const pendiente = Math.max(Number(item.quantity ?? item.Quantity ?? 0) - recibido, 0)
              return (
                <div className="item-linea" key={item.id}>
                  <input value={item.description ?? item.Description ?? ''} disabled />
                  <input value={`Pendiente: ${pendiente} ${item.unit ?? item.Unit ?? ''}`} disabled />
                  <input
                    type="number"
                    min="0"
                    max={pendiente}
                    step="0.01"
                    placeholder="Cantidad recibida"
                    value={itemsRecepcion.find((r) => r.purchaseItemId === item.id)?.quantityReceived ?? ''}
                    onChange={(e) =>
                      setItemsRecepcion((prev) =>
                        prev.map((r) =>
                          r.purchaseItemId === item.id
                            ? { ...r, quantityReceived: e.target.value }
                            : r
                        )
                      )
                    }
                  />
                </div>
              )
            })}
            <label className="campo">
              <span>Observaciones de recepcion</span>
              <textarea
                rows={3}
                value={observacionesRecepcion}
                onChange={(e) => setObservacionesRecepcion(e.target.value)}
                placeholder="Detalle de entrega parcial, faltantes o conformidad..."
              />
            </label>
            <button
              type="button"
              className="btn btn--primario"
              onClick={onConfirmarRecepcion}
              disabled={guardando}
            >
              <PackageCheck size={16} />
              Registrar recepción
            </button>
          </fieldset>
        )}

        {/* Recepciones registradas */}
        {proceso.ordenCompra?.recepciones?.length > 0 && (
          <fieldset className="form__seccion">
            <legend>
              <div className="perfil__seccion-header" style={{ border: 'none', background: 'none', padding: 0 }}>
                <div className="perfil__seccion-icon"><PackageCheck size={16} /></div>
                <h3>Recepciones registradas</h3>
              </div>
            </legend>
            <table className="tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Recibido por</th>
                  <th>Items</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {proceso.ordenCompra.recepciones.map((recepcion) => (
                  <tr key={recepcion.id}>
                    <td>{recepcion.fecha}</td>
                    <td>{recepcion.receivedByName}</td>
                    <td>
                      {recepcion.items.map((item) => (
                        <div key={item.id}>
                          {item.description}: {item.quantityReceived} {item.unit}
                        </div>
                      ))}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn--texto"
                        onClick={() => onDescargarRecepcion(recepcion)}
                      >
                        <Download size={14} />
                        PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </fieldset>
        )}

      </div>
    </section>
  )
}
