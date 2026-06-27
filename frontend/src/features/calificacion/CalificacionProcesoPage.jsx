import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext.jsx'
import { obtenerProcesoParaEvaluacion, obtenerProveedoresDeProceso } from '../../api/comprasApi.js'
import { etiquetaEstado } from '../../domain/compras.js'

const CLASE_CALIFICACION = {
  pendiente: 'badge--info',
  aprobado: 'badge--ok',
  observado: 'badge--advertencia',
  rechazado: 'badge--error',
}

const ETIQUETA_CALIFICACION = {
  pendiente: 'Pendiente',
  aprobado: 'Aprobado',
  observado: 'Observado',
  rechazado: 'Rechazado',
}

export function CalificacionProcesoPage() {
  const { tenantId } = useAuth()
  const { id } = useParams()
  const navigate = useNavigate()

  const [proceso, setProceso] = useState(null)
  const [proveedores, setProveedores] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  async function cargar() {
    setCargando(true)
    setError('')
    try {
      const [p, proveedoresData] = await Promise.all([
        obtenerProcesoParaEvaluacion({ tenantId, id }),
        obtenerProveedoresDeProceso({ tenantId, procesoId: id }),
      ])
      setProceso(p)
      setProveedores(proveedoresData)
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

  if (cargando) return <p className="estado-cargando">Cargando...</p>
  if (error) return <div className="alerta alerta--error">{error}</div>
  if (!proceso) return <div className="estado-vacio"><p>Proceso no encontrado.</p></div>

  const pendientes = proveedores.filter(s => !s.calificacion || s.calificacion.estado === 'pendiente').length

  return (
    <section className="form-pagina">
      <div className="encabezado">
        <button className="btn btn--texto" onClick={() => navigate('/calificacion')}>
          &larr; Volver
        </button>
        <h1>{proceso.titulo}</h1>
        <p className="proceso__descripcion">
          <code>{proceso.codigo}</code> &middot; {etiquetaEstado(proceso.estado)}
          &middot; {proveedores.length} proveedor(es) aceptaron
          {pendientes > 0 && <span> &middot; <strong>{pendientes} pendiente(s)</strong></span>}
        </p>
      </div>

      {proveedores.length === 0 ? (
        <div className="estado-vacio">
          <p>No hay proveedores que hayan aceptado la invitación en este proceso.</p>
        </div>
      ) : (
        <table className="tabla">
          <thead>
            <tr>
              <th>Proveedor</th>
              <th>CUIT</th>
              <th>Calificación</th>
              <th>Evaluador</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {proveedores.map(s => (
              <tr key={s.invitationId}>
                <td>{s.businessName}</td>
                <td><code>{s.cuit}</code></td>
                <td>
                  {s.calificacion ? (
                    <span className={`badge ${CLASE_CALIFICACION[s.calificacion.estado] ?? 'badge--info'}`}>
                      {ETIQUETA_CALIFICACION[s.calificacion.estado] ?? 'Pendiente'}
                    </span>
                  ) : (
                    <span className="badge badge--info">Pendiente</span>
                  )}
                </td>
                <td>{s.calificacion?.evaluador ?? '-'}</td>
                <td>
                  <button
                    className="btn btn--primario btn--chico"
                    onClick={() => navigate(`/calificacion/${id}/${s.invitationId}`)}
                  >
                    {s.calificacion && s.calificacion.estado !== 'pendiente' ? 'Ver' : 'Calificar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
