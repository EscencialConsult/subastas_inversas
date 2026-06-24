// Portal ciudadano: listado público de procesos de compra (transparencia).
// Cualquiera puede verlo sin iniciar sesión.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listarProcesosPublicos } from '../../api/publicoApi.js'
import { ESTADO_INFO, etiquetaEstado, claseEstado } from '../../domain/compras.js'

export function PortalPublicoPage() {
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
      const lista = await listarProcesosPublicos({ busqueda, estado })
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
  }, [busqueda, estado])

  return (
    <section>
      <div className="encabezado">
        <h1>Procesos de compra</h1>
      </div>
      <p className="proceso__descripcion">
        Información pública de los procesos de compra y sus subastas. No hace
        falta iniciar sesión.
      </p>

      <div className="filtros">
        <input
          className="filtros__busqueda"
          placeholder="Buscar por código, título o empresa…"
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
        <p className="estado-cargando">Cargando…</p>
      ) : procesos.length === 0 ? (
        <div className="estado-vacio">
          <p>No hay procesos públicos por ahora.</p>
        </div>
      ) : (
        <table className="tabla">
          <thead>
            <tr>
              <th>Código</th>
              <th>Título</th>
              <th>Empresa / Organismo</th>
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
                <td>{p.empresa}</td>
                <td>
                  <span className={`badge ${claseEstado(p.estado)}`}>
                    {etiquetaEstado(p.estado)}
                  </span>
                </td>
                <td className="tabla__acciones">
                  {p.tieneSubasta && (
                    <button
                      className="btn btn--texto"
                      onClick={() => navigate(`/portal/subasta/${p.id}`)}
                    >
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
