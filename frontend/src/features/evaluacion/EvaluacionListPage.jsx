import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext.jsx'
import { listarProcesosParaEvaluacion } from '../../api/comprasApi.js'
import { ESTADO_PROCESO, etiquetaEstado, claseEstado } from '../../domain/compras.js'

export function EvaluacionListPage() {
  const { tenantId } = useAuth()
  const navigate = useNavigate()

  const [procesos, setProcesos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')

  async function cargar() {
    setCargando(true)
    setError('')
    try {
      const lista = await listarProcesosParaEvaluacion({ tenantId, busqueda })
      setProcesos(lista.filter(p => p.estado === ESTADO_PROCESO.CERRADA))
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(cargar, 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, busqueda])

  return (
    <section className="form-pagina">
      <div className="encabezado">
        <h1>Evaluación de Procesos</h1>
      </div>

      {error && <div className="alerta alerta--error">{error}</div>}

      <div className="barra-busqueda">
        <input
          placeholder="Buscar por código o título..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
      </div>

      {cargando ? (
        <p className="estado-cargando">Cargando...</p>
      ) : procesos.length === 0 ? (
        <div className="estado-vacio">
          <p>No hay procesos pendientes de evaluación.</p>
        </div>
      ) : (
        <table className="tabla">
          <thead>
            <tr>
              <th>Código</th>
              <th>Título</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {procesos.map(p => (
              <tr key={p.id}>
                <td><code>{p.codigo}</code></td>
                <td>{p.titulo}</td>
                <td>
                  <span className={`badge ${claseEstado(p.estado)}`}>
                    {etiquetaEstado(p.estado)}
                  </span>
                </td>
                <td>
                  <button
                    className="btn btn--primario btn--chico"
                    onClick={() => navigate(`/evaluacion/${p.id}`)}
                  >
                    Evaluar
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
