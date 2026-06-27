import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext.jsx'
import { listarProcesosParaCalificacion } from '../../api/comprasApi.js'
import { etiquetaEstado, claseEstado } from '../../domain/compras.js'

export function CalificacionListPage() {
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
      const lista = await listarProcesosParaCalificacion({ tenantId, busqueda })
      setProcesos(lista)
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
        <h1>Calificación de Proveedores</h1>
        <p className="form__seccion-ayuda">
          Califique los proveedores que aceptaron la invitación. Solo los <strong>Aprobados</strong> podrán participar en la subasta.
        </p>
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
          <p>No hay procesos con proveedores pendientes de calificación.</p>
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
                    onClick={() => navigate(`/calificacion/${p.id}`)}
                  >
                    Calificar proveedores
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
