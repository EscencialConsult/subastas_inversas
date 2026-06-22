// Listado de tenants (empresas/municipios cliente). Solo super-admin.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listarTenants, cambiarEstadoTenant } from '../../api/tenantsApi.js'

export function TenantsListPage() {
  const navigate = useNavigate()

  const [tenants, setTenants] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState('')

  async function cargar() {
    setCargando(true)
    setError('')
    try {
      const lista = await listarTenants({ busqueda, estado })
      setTenants(lista)
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

  async function alternarEstado(tenant) {
    try {
      await cambiarEstadoTenant({ id: tenant.id, activo: !tenant.activo })
      cargar()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section>
      <div className="encabezado">
        <h1>Tenants</h1>
        <button className="btn btn--primario" onClick={() => navigate('/tenants/nuevo')}>
          + Nuevo tenant
        </button>
      </div>

      <div className="filtros">
        <input
          className="filtros__busqueda"
          placeholder="Buscar por nombre o subdominio…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="activos">Activos</option>
          <option value="inactivos">Inactivos</option>
        </select>
      </div>

      {error && <div className="alerta alerta--error">{error}</div>}

      {cargando ? (
        <p className="estado-cargando">Cargando tenants…</p>
      ) : tenants.length === 0 ? (
        <div className="estado-vacio">
          <p>No hay tenants que coincidan con el filtro.</p>
        </div>
      ) : (
        <table className="tabla">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Subdominio</th>
              <th>Usuarios</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id}>
                <td>{t.nombre}</td>
                <td>
                  <code>{t.subdominio}</code>
                </td>
                <td>{t.cantidadUsuarios}</td>
                <td>
                  <span className={t.activo ? 'badge badge--ok' : 'badge badge--off'}>
                    {t.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="tabla__acciones">
                  <button
                    className="btn btn--texto"
                    onClick={() => navigate(`/tenants/${t.id}`)}
                  >
                    Editar
                  </button>
                  <button className="btn btn--texto" onClick={() => alternarEstado(t)}>
                    {t.activo ? 'Desactivar' : 'Activar'}
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
