// Listado para la Autoridad: permite revisar adjudicaciones pendientes y consultar las resueltas.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext.jsx'
import { listarProcesosParaAprobacion } from '../../api/comprasApi.js'
import { ESTADO_PROCESO, claseEstado, etiquetaEstado } from '../../domain/compras.js'

const FILTROS = {
  pendientes: ESTADO_PROCESO.ADJUDICADA,
  aprobadas: ESTADO_PROCESO.APROBADA,
  todas: '',
}

export function AdjudicacionesListPage() {
  const { tenantId } = useAuth()
  const navigate = useNavigate()

  const [procesos, setProcesos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [filtro, setFiltro] = useState('pendientes')

  async function cargar() {
    setCargando(true)
    setError('')
    try {
      const lista = await listarProcesosParaAprobacion({
        tenantId,
        estado: FILTROS[filtro],
      })
      setProcesos(lista.filter((p) => p.estado === ESTADO_PROCESO.ADJUDICADA || p.estado === ESTADO_PROCESO.APROBADA))
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
  }, [tenantId, filtro])

  return (
    <section>
      <div className="encabezado">
        <h1>Adjudicaciones</h1>
      </div>

      <div className="filtros">
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="pendientes">Pendientes</option>
          <option value="aprobadas">Aprobadas</option>
          <option value="todas">Todas</option>
        </select>
      </div>

      {error && <div className="alerta alerta--error">{error}</div>}

      {cargando ? (
        <p className="estado-cargando">Cargando...</p>
      ) : procesos.length === 0 ? (
        <div className="estado-vacio">
          <p>No hay adjudicaciones para el filtro seleccionado.</p>
        </div>
      ) : (
        <table className="tabla">
          <thead>
            <tr>
              <th>Codigo</th>
              <th>Titulo</th>
              <th>Proveedor adjudicado</th>
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
                <td>{p.adjudicacion?.proveedor ?? '-'}</td>
                <td>
                  <span className={`badge ${claseEstado(p.estado)}`}>
                    {etiquetaEstado(p.estado)}
                  </span>
                </td>
                <td className="tabla__acciones">
                  <button
                    className="btn btn--texto"
                    onClick={() => navigate(`/adjudicaciones/${p.id}`)}
                  >
                    {p.estado === ESTADO_PROCESO.ADJUDICADA ? 'Revisar' : 'Ver'}
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
