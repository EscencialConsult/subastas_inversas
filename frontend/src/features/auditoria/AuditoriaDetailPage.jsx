// Expediente de auditoría: todo el recorrido del proceso en SOLO LECTURA.
// Reúne en un solo lugar lo que fue pasando: datos, aprobación, subasta,
// evaluación y adjudicación, con quién hizo cada cosa.

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth.js'
import { obtenerProceso } from '../../api/comprasApi.js'
import { obtenerSubastaDeProceso } from '../../api/subastasApi.js'
import { nombresPorIds } from '../../api/usersApi.js'
import { etiquetaEstado, claseEstado } from '../../domain/compras.js'

export function AuditoriaDetailPage() {
  const { id } = useParams()
  const { tenantId } = useAuth()
  const navigate = useNavigate()

  const [proceso, setProceso] = useState(null)
  const [subasta, setSubasta] = useState(null) // puede no existir
  const [nombres, setNombres] = useState({})
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  async function cargar() {
    try {
      const p = await obtenerProceso({ tenantId, id })
      setProceso(p)

      // La subasta es opcional: si el proceso no llegó a esa etapa, no existe.
      try {
        setSubasta(await obtenerSubastaDeProceso({ tenantId, procesoId: id }))
      } catch {
        setSubasta(null)
      }

      const ids = [
        p.compradorId,
        p.aprobadorId,
        p.evaluacion?.evaluadorId,
        p.adjudicacion?.aprobadorId,
      ]
      setNombres(await nombresPorIds({ ids }))
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(cargar, 0)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, id])

  if (cargando) return <p className="estado-cargando">Cargando expediente…</p>
  if (!proceso) return <div className="alerta alerta--error">{error}</div>

  const nombre = (idUsuario) => nombres[idUsuario] ?? '—'

  return (
    <section className="form-pagina">
      <div className="encabezado">
        <h1>
          Expediente · <code>{proceso.codigo}</code>
        </h1>
        <button className="btn btn--texto" onClick={() => navigate('/auditoria')}>
          Volver
        </button>
      </div>

      <div className="alerta alerta--info">
        Vista de auditoría: solo lectura. No se puede modificar nada desde acá.
      </div>

      <div className="form">
        <h2 className="form__titulo">Datos del proceso</h2>
        <div className="perfil__solo-lectura">
          <span>Título: {proceso.titulo}</span>
          <span>Descripción: {proceso.descripcion || '—'}</span>
          <span>Presupuesto estimado: {formatearPesos(proceso.presupuestoEstimado)}</span>
          <span>Creado el: {proceso.creadoEn}</span>
          <span>Comprador: {nombre(proceso.compradorId)}</span>
          <span>
            Estado actual:{' '}
            <span className={`badge ${claseEstado(proceso.estado)}`}>
              {etiquetaEstado(proceso.estado)}
            </span>
          </span>
        </div>
      </div>

      {/* Aprobación / rechazo (si ya hubo decisión). */}
      {proceso.decididoEn && (
        <div className="form">
          <h2 className="form__titulo">Decisión de aprobación</h2>
          <div className="perfil__solo-lectura">
            <span>Decidido por: {nombre(proceso.aprobadorId)}</span>
            <span>Fecha: {proceso.decididoEn}</span>
            {proceso.motivoRechazo && <span>Motivo de rechazo: {proceso.motivoRechazo}</span>}
          </div>
        </div>
      )}

      {/* Subasta (si existió). */}
      {subasta && (
        <div className="form">
          <h2 className="form__titulo">Subasta — lances ({subasta.lances.length})</h2>
          <table className="tabla">
            <thead>
              <tr>
                <th>Proveedor</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              {[...subasta.lances]
                .sort((a, b) => a.monto - b.monto)
                .map((l) => (
                  <tr key={l.id}>
                    <td>{l.proveedor}</td>
                    <td>{formatearPesos(l.monto)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Evaluación (si existió). */}
      {proceso.evaluacion && (
        <div className="form">
          <h2 className="form__titulo">Evaluación</h2>
          <div className="perfil__solo-lectura">
            <span>Evaluado por: {nombre(proceso.evaluacion.evaluadorId)}</span>
            <span>Fecha: {proceso.evaluacion.fecha}</span>
            <span>Proveedor recomendado: {proceso.evaluacion.recomendadoProveedor}</span>
            {proceso.evaluacion.observaciones && (
              <span>Observaciones: {proceso.evaluacion.observaciones}</span>
            )}
          </div>
        </div>
      )}

      {/* Adjudicación (si existió). */}
      {proceso.adjudicacion && (
        <div className="form">
          <h2 className="form__titulo">Adjudicación</h2>
          <div className="perfil__solo-lectura">
            <span>Adjudicado a: {proceso.adjudicacion.proveedor}</span>
            <span>Adjudicado por: {nombre(proceso.adjudicacion.aprobadorId)}</span>
            <span>Fecha: {proceso.adjudicacion.fecha}</span>
          </div>
        </div>
      )}
    </section>
  )
}

function formatearPesos(monto) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(monto)
}
