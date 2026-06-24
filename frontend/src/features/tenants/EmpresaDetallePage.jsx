// Detalle de una empresa (solo super-admin): datos + actividad + sus usuarios.
// Es una vista de supervisión de la plataforma, en solo lectura.

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { obtenerDetalleEmpresa } from '../../api/tenantsApi.js'
import { etiquetaRol } from '../../domain/roles.js'

export function EmpresaDetallePage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [data, setData] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const t = setTimeout(() => {
      obtenerDetalleEmpresa({ id })
        .then(setData)
        .catch((err) => setError(err.message))
        .finally(() => setCargando(false))
    }, 0)
    return () => clearTimeout(t)
  }, [id])

  if (cargando) return <p className="estado-cargando">Cargando…</p>
  if (!data) return <div className="alerta alerta--error">{error}</div>

  const { tenant, stats, usuarios } = data

  return (
    <section>
      <div className="encabezado">
        <h1>{tenant.nombre}</h1>
        <div className="tabla__acciones">
          <button className="btn btn--texto" onClick={() => navigate('/tenants')}>
            Volver
          </button>
          <button
            className="btn btn--primario"
            onClick={() => navigate(`/tenants/${tenant.id}`)}
          >
            Editar empresa
          </button>
        </div>
      </div>

      <div className="perfil__solo-lectura" style={{ maxWidth: 420 }}>
        <span>
          Subdominio: <code>{tenant.subdominio}</code>.sicst.gob.ar
        </span>
        <span>
          Estado:{' '}
          <span className={tenant.activo ? 'badge badge--ok' : 'badge badge--off'}>
            {tenant.activo ? 'Activa' : 'Inactiva'}
          </span>
        </span>
      </div>

      <div className="panel-cards">
        <div className="panel-card panel-card--info">
          <span className="panel-card__valor">{stats.usuarios}</span>
          <span className="panel-card__label">Usuarios</span>
        </div>
        <div className="panel-card panel-card--ok">
          <span className="panel-card__valor">{stats.activos}</span>
          <span className="panel-card__label">Activos</span>
        </div>
        <div className="panel-card panel-card--info">
          <span className="panel-card__valor">{stats.procesos}</span>
          <span className="panel-card__label">Procesos de compra</span>
        </div>
        <div className="panel-card panel-card--warn">
          <span className="panel-card__valor">{stats.subastas}</span>
          <span className="panel-card__label">Subastas</span>
        </div>
        <div className="panel-card panel-card--ok">
          <span className="panel-card__valor">
            {stats.ahorroProm === null ? '—' : `${stats.ahorroProm}%`}
          </span>
          <span className="panel-card__label">Ahorro promedio</span>
        </div>
      </div>

      <h2 className="form__titulo">Usuarios de la empresa</h2>
      {usuarios.length === 0 ? (
        <div className="estado-vacio">
          <p>Esta empresa todavía no tiene usuarios.</p>
        </div>
      ) : (
        <table className="tabla">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id}>
                <td>
                  {u.nombre} {u.apellido}
                </td>
                <td>{u.email}</td>
                <td>{etiquetaRol(u.rol)}</td>
                <td>
                  <span className={u.activo ? 'badge badge--ok' : 'badge badge--off'}>
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
