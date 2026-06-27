// Listado de procesos de compra del tenant. Entrada principal del comprador.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext.jsx'
import { listarProcesos, publicarProceso } from '../../api/comprasApi.js'
import { iniciarSubasta } from '../../api/subastasApi.js'
import {
  ESTADO_PROCESO,
  ESTADO_INFO,
  etiquetaEstado,
  claseEstado,
  esEditable,
} from '../../domain/compras.js'

export function ProcesosListPage() {
  const { tenantId } = useAuth()
  const navigate = useNavigate()

  const [procesos, setProcesos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState('')

  async function cargar() {
    setCargando(true)
    setError('')
    try {
      const lista = await listarProcesos({ tenantId, busqueda, estado })
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
  }, [tenantId, busqueda, estado])

  async function publicar(proceso) {
    try {
      await publicarProceso({ tenantId, id: proceso.id })
      cargar()
    } catch (err) {
      setError(err.message)
    }
  }

  async function iniciar(proceso) {
    try {
      await iniciarSubasta({ tenantId, procesoId: proceso.id })
      navigate(`/subasta/${proceso.id}`)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section>
      <div className="encabezado">
        <h1>Procesos de compra</h1>
        <button className="btn btn--primario" onClick={() => navigate('/compras/nuevo')}>
          + Nuevo proceso
        </button>
      </div>

      <div className="filtros">
        <input
          className="filtros__busqueda"
          placeholder="Buscar por código o título…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
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
        <p className="estado-cargando">Cargando procesos…</p>
      ) : procesos.length === 0 ? (
        <div className="estado-vacio">
          <p>No hay procesos de compra que coincidan con el filtro.</p>
        </div>
      ) : (
        <table className="tabla">
          <thead>
            <tr>
              <th>Código</th>
              <th>Título</th>
              <th>Presupuesto est.</th>
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
                <td>{formatearPesos(p.presupuestoEstimado)}</td>
                <td>
                  <span className={`badge ${claseEstado(p.estado)}`}>
                    {etiquetaEstado(p.estado)}
                  </span>
                </td>
                <td className="tabla__acciones">
                  <button
                    className="btn btn--texto"
                    onClick={() => navigate(`/compras/${p.id}`)}
                  >
                    {esEditable(p.estado) ? 'Editar' : 'Ver'}
                  </button>
                  {esEditable(p.estado) && (
                    <button className="btn btn--texto" onClick={() => publicar(p)}>
                      Publicar
                    </button>
                  )}
                  {p.estado === ESTADO_PROCESO.PUBLICADO && !p.tieneSubasta && (
                    <button className="btn btn--texto" onClick={() => iniciar(p)}>
                      Iniciar subasta
                    </button>
                  )}
                  {p.estado === ESTADO_PROCESO.EN_SUBASTA && p.tieneSubasta && (
                    <button
                      className="btn btn--texto"
                      onClick={() => navigate(`/subasta/${p.id}`)}
                    >
                      Ver subasta
                    </button>
                  )}
                  {p.estado === ESTADO_PROCESO.CERRADA && p.tieneSubasta && (
                    <button
                      className="btn btn--texto"
                      onClick={() => navigate(`/compras/${p.id}/adjudicar`)}
                    >
                      Adjudicar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
