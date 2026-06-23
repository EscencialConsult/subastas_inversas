// Listado de procesos de compra del tenant. Entrada principal del comprador.

import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Pencil, Eye, Send, Gavel, FileText } from 'lucide-react'
import { useAuth } from '../../auth/useAuth.js'
import { listarProcesos, enviarAAprobacion } from '../../api/comprasApi.js'
import { ApiError } from '../../api/client.js'
import { iniciarSubasta, obtenerSubastaDeProceso } from '../../api/subastasApi.js'
import {
  ESTADO_PROCESO,
  ESTADO_INFO,
  etiquetaEstado,
  claseEstado,
  esEditable,
} from '../../domain/compras.js'
import { formatearPesos } from '../../utils/formatear.js'

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

  async function enviar(proceso) {
    try {
      await enviarAAprobacion({ tenantId, id: proceso.id })
      cargar()
    } catch (err) {
      setError(err.message)
    }
  }

  async function iniciar(proceso) {
    try {
      try {
        await obtenerSubastaDeProceso({ tenantId, procesoId: proceso.id })
      } catch (err) {
        if (!(err instanceof ApiError) || err.status !== 404) {
          throw err
        }
        await iniciarSubasta({ tenantId, procesoId: proceso.id })
      }
      navigate(`/subasta/${proceso.id}`)
    } catch (err) {
      setError(err.message)
    }
  }

  const stats = useMemo(() => {
    const total = procesos.length
    const pendientes = procesos.filter((p) => p.estado === ESTADO_PROCESO.PENDIENTE_APROBACION).length
    const aprobados = procesos.filter((p) => p.estado === ESTADO_PROCESO.APROBADO).length
    const borradores = procesos.filter((p) => p.estado === ESTADO_PROCESO.BORRADOR).length
    return { total, pendientes, aprobados, borradores }
  }, [procesos])

  return (
    <section>
      <div className="encabezado">
        <div>
          <h1>Procesos de compra</h1>
        </div>
        <button className="btn btn--primario" onClick={() => navigate('/compras/nuevo')}>
          <Plus size={16} />
          Nuevo proceso
        </button>
      </div>

      {!cargando && procesos.length > 0 && (
        <div className="stats">
          <div className="stats__card">
            <div className="stats__numero">{stats.total}</div>
            <div className="stats__etiqueta">Total</div>
          </div>
          <div className="stats__card">
            <div className="stats__numero">{stats.borradores}</div>
            <div className="stats__etiqueta">Borradores</div>
          </div>
          <div className="stats__card">
            <div className="stats__numero">{stats.pendientes}</div>
            <div className="stats__etiqueta">Pendientes</div>
          </div>
          <div className="stats__card">
            <div className="stats__numero">{stats.aprobados}</div>
            <div className="stats__etiqueta">Aprobados</div>
          </div>
        </div>
      )}

      <div className="filtros">
        <div className="filtros__icono">
          <Search size={16} />
          <input
            className="filtros__busqueda"
            placeholder="Buscar por código o título…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
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
          <FileText size={40} />
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
                    {esEditable(p.estado) ? <Pencil size={14} /> : <Eye size={14} />}
                    {esEditable(p.estado) ? 'Editar' : 'Ver'}
                  </button>
                  {esEditable(p.estado) && (
                    <button className="btn btn--texto" onClick={() => enviar(p)}>
                      <Send size={14} />
                      Enviar
                    </button>
                  )}
                  {p.estado === ESTADO_PROCESO.APROBADO && (
                    <button className="btn btn--primario" onClick={() => iniciar(p)}>
                      <Gavel size={14} />
                      Abrir subasta
                    </button>
                  )}
                  {p.estado === ESTADO_PROCESO.EN_SUBASTA && (
                    <button
                      className="btn btn--texto"
                      onClick={() => navigate(`/subasta/${p.id}`)}
                    >
                      <Eye size={14} />
                      Ver subasta
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
