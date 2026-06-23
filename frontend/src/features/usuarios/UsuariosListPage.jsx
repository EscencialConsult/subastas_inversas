// Listado de usuarios del tenant, con buscador y filtros.

import { useEffect, useMemo, useState } from 'react'
import {
  Edit3,
  Plus,
  Power,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UserCheck,
  UserRound,
  Users,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth.js'
import { cambiarEstadoUsuario, listarUsuarios } from '../../api/usersApi.js'
import { ROLE_INFO, etiquetaRol } from '../../domain/roles.js'
import { iniciales } from '../../utils/iniciales.js'

export function UsuariosListPage() {
  const { tenantId } = useAuth()
  const navigate = useNavigate()

  const [usuarios, setUsuarios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [rol, setRol] = useState('')
  const [estado, setEstado] = useState('')

  async function cargar() {
    setCargando(true)
    setError('')
    try {
      const soloActivos = estado === '' ? null : estado === 'activos'
      const lista = await listarUsuarios({ tenantId, busqueda, rol, soloActivos })
      setUsuarios(lista)
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
  }, [tenantId, busqueda, rol, estado])

  async function alternarEstado(usuario) {
    try {
      await cambiarEstadoUsuario({ tenantId, id: usuario.id, activo: !usuario.activo })
      cargar()
    } catch (err) {
      setError(err.message)
    }
  }

  function limpiarFiltros() {
    setBusqueda('')
    setRol('')
    setEstado('')
  }

  const metricas = useMemo(() => {
    const activos = usuarios.filter((u) => u.activo).length
    const inactivos = usuarios.length - activos
    const roles = new Set(usuarios.map((u) => u.rol).filter(Boolean)).size
    return { total: usuarios.length, activos, inactivos, roles }
  }, [usuarios])

  const hayFiltros = Boolean(busqueda || rol || estado)

  return (
    <section className="usuarios-page">
      <div className="usuarios-hero">
        <div>
          <span className="pagina-eyebrow">Administracion</span>
          <h1>Usuarios</h1>
          <p className="pagina-descripcion">
            Gestiona accesos, roles y estados de los usuarios habilitados para operar en la organizacion.
          </p>
        </div>
        <button className="btn btn--primario" onClick={() => navigate('/usuarios/nuevo')}>
          <Plus size={18} />
          Nuevo usuario
        </button>
      </div>

      <div className="usuarios-metricas">
        <MetricCard icon={Users} label="Usuarios visibles" value={metricas.total} />
        <MetricCard icon={UserCheck} label="Activos" value={metricas.activos} variant="ok" />
        <MetricCard icon={Power} label="Inactivos" value={metricas.inactivos} />
        <MetricCard icon={ShieldCheck} label="Roles en uso" value={metricas.roles} variant="info" />
      </div>

      <section className="usuarios-panel">
        <div className="usuarios-toolbar">
          <label className="usuarios-search">
            <Search size={18} />
            <input
              placeholder="Buscar por nombre, apellido o email"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </label>

          <div className="usuarios-filtros" aria-label="Filtros de usuarios">
            <span>
              <SlidersHorizontal size={17} />
              Filtros
            </span>
            <select value={rol} onChange={(e) => setRol(e.target.value)}>
              <option value="">Todos los roles</option>
              {Object.entries(ROLE_INFO).map(([clave, info]) => (
                <option key={clave} value={clave}>
                  {info.label}
                </option>
              ))}
            </select>
            <select value={estado} onChange={(e) => setEstado(e.target.value)}>
              <option value="">Todos los estados</option>
              <option value="activos">Activos</option>
              <option value="inactivos">Inactivos</option>
            </select>
            {hayFiltros && (
              <button type="button" className="btn btn--texto" onClick={limpiarFiltros}>
                Limpiar
              </button>
            )}
          </div>
        </div>

        {error && <div className="alerta alerta--error">{error}</div>}

        {cargando ? (
          <p className="estado-cargando">Cargando usuarios...</p>
        ) : usuarios.length === 0 ? (
          <div className="usuarios-empty">
            <span><UserRound size={26} /></span>
            <h2>No hay usuarios para mostrar</h2>
            <p>
              {hayFiltros
                ? 'No encontramos coincidencias con los filtros aplicados.'
                : 'Todavia no hay usuarios cargados para esta organizacion.'}
            </p>
            <div className="usuarios-empty__acciones">
              {hayFiltros && (
                <button type="button" className="btn btn--secundario" onClick={limpiarFiltros}>
                  Limpiar filtros
                </button>
              )}
              <button type="button" className="btn btn--primario" onClick={() => navigate('/usuarios/nuevo')}>
                <Plus size={17} />
                Nuevo usuario
              </button>
            </div>
          </div>
        ) : (
          <div className="usuarios-table-wrap">
            <table className="tabla usuarios-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="usuario-cell">
                        <span className="usuario-cell__avatar">
                          {iniciales(u.nombre, u.apellido)}
                        </span>
                        <div>
                          <strong>{u.nombre} {u.apellido}</strong>
                          <small>ID: {u.id}</small>
                        </div>
                      </div>
                    </td>
                    <td className="usuarios-table__email">{u.email}</td>
                    <td>
                      <span className="badge badge--info">{etiquetaRol(u.rol)}</span>
                    </td>
                    <td>
                      <span className={u.activo ? 'badge badge--ok' : 'badge badge--off'}>
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="tabla__acciones">
                      <button
                        className="btn btn--texto"
                        onClick={() => navigate(`/usuarios/${u.id}`)}
                      >
                        <Edit3 size={16} />
                        Editar
                      </button>
                      <button className="btn btn--texto" onClick={() => alternarEstado(u)}>
                        <Power size={16} />
                        {u.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  )
}

function MetricCard({ icon: Icon, label, value, variant = '' }) {
  return (
    <article className={`usuarios-metrica ${variant ? `usuarios-metrica--${variant}` : ''}`}>
      <span><Icon size={19} /></span>
      <small>{label}</small>
      <strong>{value}</strong>
    </article>
  )
}


