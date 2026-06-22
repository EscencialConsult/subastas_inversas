// Listado de usuarios del tenant, con buscador y filtros.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext.jsx'
import { listarUsuarios, cambiarEstadoUsuario } from '../../api/usersApi.js'
import { ROLE_INFO, etiquetaRol } from '../../domain/roles.js'

export function UsuariosListPage() {
  const { tenantId } = useAuth()
  const navigate = useNavigate()

  const [usuarios, setUsuarios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  // Filtros
  const [busqueda, setBusqueda] = useState('')
  const [rol, setRol] = useState('')
  const [estado, setEstado] = useState('') // '', 'activos', 'inactivos'

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

  // Recargamos cuando cambian los filtros (debounce simple para la búsqueda).
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

  return (
    <section>
      <div className="encabezado">
        <h1>Usuarios</h1>
        <button className="btn btn--primario" onClick={() => navigate('/usuarios/nuevo')}>
          + Nuevo usuario
        </button>
      </div>

      <div className="filtros">
        <input
          className="filtros__busqueda"
          placeholder="Buscar por nombre o email…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
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
      </div>

      {error && <div className="alerta alerta--error">{error}</div>}

      {cargando ? (
        <p className="estado-cargando">Cargando usuarios…</p>
      ) : usuarios.length === 0 ? (
        <div className="estado-vacio">
          <p>No hay usuarios que coincidan con el filtro.</p>
        </div>
      ) : (
        <table className="tabla">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Estado</th>
              <th></th>
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
                <td className="tabla__acciones">
                  <button
                    className="btn btn--texto"
                    onClick={() => navigate(`/usuarios/${u.id}`)}
                  >
                    Editar
                  </button>
                  <button className="btn btn--texto" onClick={() => alternarEstado(u)}>
                    {u.activo ? 'Desactivar' : 'Activar'}
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
