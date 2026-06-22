// Listado de procesos para el Aprobador.
// Por defecto muestra los que están Pendiente de aprobación (lo que requiere acción).

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext.jsx'
import { listarProcesos } from '../../api/comprasApi.js'
import {
  ESTADO_PROCESO,
  ESTADO_INFO,
  etiquetaEstado,
  claseEstado,
} from '../../domain/compras.js'

export function AprobacionesListPage() {
  const { tenantId } = useAuth()
  const navigate = useNavigate()

  const [procesos, setProcesos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  // Arranca filtrado en "pendiente de aprobación": es lo que el aprobador debe resolver.
  const [estado, setEstado] = useState(ESTADO_PROCESO.PENDIENTE_APROBACION)

  async function cargar() {
    setCargando(true)
    setError('')
    try {
      const lista = await listarProcesos({ tenantId, estado })
      setProcesos(lista)
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
  }, [tenantId, estado])

  return (
    <section>
      <div className="encabezado">
        <h1>Aprobaciones</h1>
      </div>

      <div className="filtros">
        <select value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {Object.entries(ESTADO_INFO).map(([clave, info]) => (
            <option key={clave} value={clave}>
              {info.label}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="alerta alerta--error">{error}</div>}

      {cargando ? (
        <p className="estado-cargando">Cargando…</p>
      ) : procesos.length === 0 ? (
        <div className="estado-vacio">
          <p>No hay procesos en este estado.</p>
        </div>
      ) : (
        <table className="tabla">
          <thead>
            <tr>
              <th>Código</th>
              <th>Título</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {procesos.map((p) => (
              <tr key={p.id}>
                <td>
                  <code>{p.codigo}</code>
                </td>
                <td>{p.titulo}</td>
                <td>
                  <span className={`badge ${claseEstado(p.estado)}`}>
                    {etiquetaEstado(p.estado)}
                  </span>
                </td>
                <td className="tabla__acciones">
                  <button
                    className="btn btn--texto"
                    onClick={() => navigate(`/aprobaciones/${p.id}`)}
                  >
                    {p.estado === ESTADO_PROCESO.PENDIENTE_APROBACION
                      ? 'Revisar'
                      : 'Ver'}
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
