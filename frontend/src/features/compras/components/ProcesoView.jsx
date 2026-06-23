// ProcesoView.jsx
// Vista de solo lectura del detalle del proceso: metadatos, estado, items y sección de rechazado.

import { X, Send, Award, Download } from 'lucide-react'
import {
  ESTADO_PROCESO,
  etiquetaEstado,
  claseEstado,
} from '../../../domain/compras.js'
import { formatearPesos } from '../../../utils/formatear.js'

export function ProcesoView({
  proceso,
  guardando,
  descargandoActa,
  onCorregir,
  onDescargarActa,
}) {
  return (
    <div>
      {/* Encabezado de estado */}
      <div className="perfil__solo-lectura" style={{ marginBottom: 16 }}>
        <span>Código: {proceso.codigo}</span>
        <span>Creado el: {proceso.creadoEn}</span>
        <span className={`badge ${claseEstado(proceso.estado)}`}>
          {etiquetaEstado(proceso.estado)}
        </span>
      </div>

      {/* Metadatos del proceso */}
      <div className="perfil__solo-lectura" style={{ marginBottom: 16 }}>
        <span><strong>Título:</strong> {proceso.titulo}</span>
        <span><strong>Descripción:</strong> {proceso.descripcion}</span>
        <span><strong>Presupuesto estimado:</strong> {formatearPesos(proceso.presupuestoEstimado)}</span>
      </div>

      {/* Items del proceso */}
      {proceso.items?.length > 0 && (
        <fieldset className="form__seccion" style={{ marginBottom: 16 }}>
          <legend>
            <div className="perfil__seccion-header" style={{ border: 'none', background: 'none', padding: 0 }}>
              <h3>Items del proceso</h3>
            </div>
          </legend>
          <table className="tabla">
            <thead>
              <tr>
                <th>Descripción</th>
                <th>Cantidad</th>
                <th>Unidad</th>
                <th>Precio unitario estimado</th>
              </tr>
            </thead>
            <tbody>
              {proceso.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.description ?? item.Description}</td>
                  <td>{item.quantity ?? item.Quantity}</td>
                  <td>{item.unit ?? item.Unit}</td>
                  <td>{formatearPesos(item.estimatedUnitPrice ?? item.EstimatedUnitPrice ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </fieldset>
      )}

      {/* Adjudicación */}
      {proceso.estado === ESTADO_PROCESO.ADJUDICADO && proceso.adjudicacion && (
        <div
          className="alerta alerta--ok"
          style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Award size={16} />
            Adjudicado a <strong>{proceso.adjudicacion.proveedor}</strong> el {proceso.adjudicacion.fecha}.
          </span>
          <button
            type="button"
            className="btn btn--secundario"
            onClick={onDescargarActa}
            disabled={descargandoActa}
            style={{ padding: '6px 12px', fontSize: 13 }}
          >
            {descargandoActa
              ? 'Descargando…'
              : <><Download size={16} /> Descargar Acta de Adjudicación (PDF)</>}
          </button>
        </div>
      )}

      {/* Rechazado */}
      {proceso.estado === ESTADO_PROCESO.RECHAZADO && (
        <div className="alerta alerta--error">
          {proceso.motivoRechazo && (
            <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <X size={16} />
              Rechazado por el aprobador. Motivo: {proceso.motivoRechazo}
            </p>
          )}
          <button
            className="btn btn--primario"
            onClick={onCorregir}
            disabled={guardando}
            style={{ marginTop: 8 }}
          >
            <Send size={16} />
            Corregir y reenviar
          </button>
        </div>
      )}
    </div>
  )
}
