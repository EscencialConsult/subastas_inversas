// Listado para el Evaluador: procesos que están en etapa de evaluación.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext.jsx'
import { listarProcesos } from '../../api/comprasApi.js'
import { ESTADO_PROCESO } from '../../domain/compras.js'

export function EvaluacionesListPage() {
  const { tenantId } = useAuth()
  const navigate = useNavigate()

  const [procesos, setProcesos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  async function cargar() {
    setCargando(true)
    setError('')
    try {
      const lista = await listarProcesos({
        tenantId,
        estado: ESTADO_PROCESO.EVALUACION,
      })
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
  }, [tenantId])

  return (
    <section>
      <div className="encabezado">
        <h1>Evaluaciones</h1>
      </div>

      {error && <div className="alerta alerta--error">{error}</div>}

      {cargando ? (
        <p className="estado-cargando">Cargando…</p>
      ) : procesos.length === 0 ? (
        <div className="estado-vacio">
          <p>No hay procesos para evaluar por ahora.</p>
        </div>
      ) : (
        <table className="tabla">
          <thead>
            <tr>
              <th>Código</th>
              <th>Título</th>
              <th>Evaluación</th>
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
                  <span className={p.evaluacion ? 'badge badge--ok' : 'badge badge--warn'}>
                    {p.evaluacion ? 'Evaluado' : 'Pendiente'}
                  </span>
                </td>
                <td className="tabla__acciones">
                  <button
                    className="btn btn--texto"
                    onClick={() => navigate(`/evaluaciones/${p.id}`)}
                  >
                    {p.evaluacion ? 'Ver' : 'Evaluar'}
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
