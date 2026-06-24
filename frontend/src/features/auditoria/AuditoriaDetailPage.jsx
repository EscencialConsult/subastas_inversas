// Expediente de auditoría: todo el recorrido del proceso en SOLO LECTURA.
// Reúne en un solo lugar lo que fue pasando: datos, aprobación, subasta,
// evaluación y adjudicación, con quién hizo cada cosa.

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext.jsx'
import { obtenerProceso } from '../../api/comprasApi.js'
import { obtenerSubastaDeProceso, analisisSubasta } from '../../api/subastasApi.js'
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
        p.adjudicacion?.compradorId,
        p.aprobacion?.autoridadId,
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

      <LineaDeTiempo proceso={proceso} subasta={subasta} />

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

      {/* Subasta (si existió): análisis + lances. */}
      {subasta && (
        <div className="form">
          <h2 className="form__titulo">Subasta</h2>
          {(() => {
            const a = analisisSubasta(subasta)
            return (
              <div className="perfil__solo-lectura">
                <span>Proveedores que ofertaron: {a.oferentes}</span>
                <span>Lances totales: {a.cantidadLances}</span>
                <span>Presupuesto base: {formatearPesos(a.base)}</span>
                <span>Mejor oferta: {formatearPesos(a.mejor)}</span>
                <span>
                  Baja lograda: {a.bajaPorcentaje.toFixed(1)}% (
                  {a.nivelBaja === 'alta'
                    ? 'baja alta'
                    : a.nivelBaja === 'moderada'
                      ? 'baja moderada'
                      : 'baja chica'}
                  )
                </span>
              </div>
            )
          })()}
          <h3 className="form__subtitulo">Lances ({subasta.lances.length})</h3>
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

      {/* Adjudicación propuesta por el comprador (si existió). */}
      {proceso.adjudicacion && (
        <div className="form">
          <h2 className="form__titulo">Adjudicación</h2>
          <div className="perfil__solo-lectura">
            <span>Adjudicado a: {proceso.adjudicacion.proveedor}</span>
            <span>Monto: {formatearPesos(proceso.adjudicacion.monto)}</span>
            <span>Propuesto por: {nombre(proceso.adjudicacion.compradorId)}</span>
            <span>Fecha: {proceso.adjudicacion.fecha}</span>
          </div>
        </div>
      )}

      {/* Aprobación de la autoridad (si ya decidió). */}
      {proceso.aprobacion && (
        <div className="form">
          <h2 className="form__titulo">Aprobación de la Autoridad</h2>
          <div className="perfil__solo-lectura">
            <span>
              Resultado: {proceso.aprobacion.estado === 'aprobada' ? 'Aprobada' : 'Rechazada'}
            </span>
            <span>Por: {nombre(proceso.aprobacion.autoridadId)}</span>
            <span>Fecha: {proceso.aprobacion.fecha}</span>
            {proceso.aprobacion.motivo && (
              <span>Motivo: {proceso.aprobacion.motivo}</span>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

// Cronología del expediente: arma los eventos a partir de las fechas guardadas
// y los muestra ordenados. Es la "traza" del proceso para el auditor.
function LineaDeTiempo({ proceso, subasta }) {
  const eventos = [{ fecha: proceso.creadoEn, texto: 'Proceso creado' }]

  if (subasta) {
    eventos.push({
      fecha: subasta.inicioISO.slice(0, 10),
      texto: `Subasta realizada (${subasta.lances.length} lances)`,
    })
  }
  if (proceso.adjudicacion) {
    eventos.push({
      fecha: proceso.adjudicacion.fecha,
      texto: `Adjudicado a ${proceso.adjudicacion.proveedor}`,
    })
  }
  if (proceso.aprobacion) {
    eventos.push({
      fecha: proceso.aprobacion.fecha,
      texto:
        proceso.aprobacion.estado === 'aprobada'
          ? 'Adjudicación aprobada por la Autoridad'
          : 'Adjudicación rechazada por la Autoridad',
    })
  }

  eventos.sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)))

  return (
    <div className="form">
      <h2 className="form__titulo">Línea de tiempo</h2>
      <ol className="timeline">
        {eventos.map((e, i) => (
          <li key={i} className="timeline__item">
            <span className="timeline__fecha">{e.fecha}</span>
            <span className="timeline__texto">{e.texto}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function formatearPesos(monto) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(monto)
}
