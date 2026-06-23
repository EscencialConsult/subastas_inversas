// Auditoria global: el auditor ve eventos inmutables encadenados por hash.

import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/useAuth.js'
import { listarEventosAuditoria } from '../../api/auditApi.js'
import { formatearFecha } from '../../utils/formatear.js'

export function AuditoriaListPage() {
  const { tenantId } = useAuth()

  const [eventos, setEventos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [entidad, setEntidad] = useState('')

  async function cargar() {
    setCargando(true)
    setError('')
    try {
      const lista = await listarEventosAuditoria({ tenantId, entityName: entidad })
      setEventos(lista)
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
  }, [tenantId, entidad])

  return (
    <section>
      <div className="encabezado">
        <h1>Auditoria global</h1>
      </div>

      <div className="filtros">
        <input
          className="filtros__busqueda"
          placeholder="Filtrar por entidad: PurchaseProcess, Bid, Contract..."
          value={entidad}
          onChange={(e) => setEntidad(e.target.value)}
        />
      </div>

      {error && <div className="alerta alerta--error">{error}</div>}

      {cargando ? (
        <p className="estado-cargando">Cargando...</p>
      ) : eventos.length === 0 ? (
        <div className="estado-vacio">
          <p>No hay eventos de auditoria que coincidan con el filtro.</p>
        </div>
      ) : (
        <table className="tabla">
          <thead>
            <tr>
              <th>#</th>
              <th>Fecha</th>
              <th>Entidad</th>
              <th>Accion</th>
              <th>Hash</th>
              <th>Hash previo</th>
            </tr>
          </thead>
          <tbody>
            {eventos.map((evento) => (
              <tr key={evento.id}>
                <td>
                  <code>{evento.sequence}</code>
                </td>
                <td>{formatearFecha(evento.createdAt)}</td>
                <td>
                  {evento.entityName}
                  <br />
                  <code>{evento.entityId}</code>
                </td>
                <td>
                  <span className={`badge ${claseAccion(evento.action)}`}>
                    {etiquetaAccion(evento.action)}
                  </span>
                </td>
                <td>
                  <code title={evento.hash}>{evento.hash.slice(0, 12)}...</code>
                </td>
                <td>
                  <code title={evento.previousHash}>
                    {evento.previousHash ? `${evento.previousHash.slice(0, 12)}...` : 'GENESIS'}
                  </code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

function etiquetaAccion(action) {
  if (action === 'Created' || action === 0) return 'Creado'
  if (action === 'Updated' || action === 1) return 'Actualizado'
  if (action === 'Deleted' || action === 2) return 'Eliminado'
  return action
}

function claseAccion(action) {
  if (action === 'Deleted' || action === 2) return 'badge--error'
  if (action === 'Updated' || action === 1) return 'badge--info'
  return 'badge--ok'
}
