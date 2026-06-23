import { NavLink, Outlet, Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import {
  puedeGestionarUsuarios,
  puedeGestionarTenants,
  esProveedor,
  puedeGestionarCompras,
  puedeConfigurarEmpresa,
  puedeAprobarCompras,
  puedeEvaluar,
  puedeAuditar,
} from '../auth/permisos.js'
import { etiquetaRol } from '../domain/roles.js'
import { iniciales } from '../utils/iniciales.js'

/**
 * @typedef {{ to: string, texto: string, visible: (rol: string) => boolean }} NavItem
 * @typedef {{ label: string, items: NavItem[] }} GrupoNav
 */

/**
 * @param {string} rol
 * @returns {GrupoNav[]}
 */
function getGrupos(rol) {
  const grupos = [
    {
      label: 'Administración',
      items: [
        { to: '/usuarios', texto: 'Usuarios', visible: puedeGestionarUsuarios },
        { to: '/tenants', texto: 'Tenants', visible: puedeGestionarTenants },
        { to: '/configuracion', texto: 'Configuración', visible: puedeConfigurarEmpresa },
      ].filter((i) => i.visible(rol)),
    },
    {
      label: 'Compras',
      items: [
        { to: '/compras', texto: 'Compras', visible: puedeGestionarCompras },
        { to: '/proveedores', texto: 'Proveedores', visible: puedeGestionarCompras },
      ].filter((i) => i.visible(rol)),
    },
    {
      label: 'Aprobaciones',
      items: [
        { to: '/aprobaciones', texto: 'Aprobaciones', visible: puedeAprobarCompras },
        { to: '/adjudicaciones', texto: 'Adjudicaciones', visible: puedeAprobarCompras },
      ].filter((i) => i.visible(rol)),
    },
    {
      label: 'Evaluación',
      items: [
        { to: '/evaluaciones', texto: 'Evaluaciones', visible: puedeEvaluar },
        { to: '/auditoria', texto: 'Auditoría', visible: puedeAuditar },
      ].filter((i) => i.visible(rol)),
    },
    {
      label: 'Proveedor',
      items: [
        { to: '/proveedor', texto: 'Mi cuenta', visible: esProveedor },
        { to: '/proveedor/invitaciones', texto: 'Invitaciones', visible: esProveedor },
        { to: '/proveedor/subastas', texto: 'Subastas', visible: esProveedor },
      ].filter((i) => i.visible(rol)),
    },
  ]

  return grupos.filter((g) => g.items.length > 0)
}

function HeaderMarca({ tenant }) {
  return (
    <div className="layout__marca">
      <span className="layout__logo">SICST MAX</span>
      {tenant && <span className="layout__tenant">· {tenant.nombre}</span>}
    </div>
  )
}

function HeaderUsuario({ usuario, rol, onLogout }) {
  return (
    <div className="layout__usuario">
      <Link to="/perfil" className="layout__perfil">
        <span className="layout__avatar">
          {iniciales(usuario.nombre, usuario.apellido)}
        </span>
        <span className="layout__usuario-nombre">
          {usuario.nombre} {usuario.apellido} ({etiquetaRol(rol)})
        </span>
      </Link>
      <button className="btn btn--texto" onClick={onLogout}>
        Salir
      </button>
    </div>
  )
}

export function Layout() {
  const { usuario, tenant, rol, logout } = useAuth()

  if (!usuario) return null

  const gruposFiltrados = getGrupos(rol)

  return (
    <div className="layout">
      <header className="layout__header">
        <HeaderMarca tenant={tenant} />
        <HeaderUsuario usuario={usuario} rol={rol} onLogout={logout} />
      </header>

      <div className="layout__cuerpo">
        <nav className="layout__menu" aria-label="Menú principal">
          {gruposFiltrados.map((grupo) => (
            <div key={grupo.label} className="layout__grupo">
              <span className="layout__grupo-label">{grupo.label}</span>
              {grupo.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/compras' || item.to === '/tenants' || item.to === '/proveedor'}
                  className={({ isActive }) =>
                    isActive ? 'layout__link layout__link--activo' : 'layout__link'
                  }
                >
                  {item.texto}
                </NavLink>
              ))}
            </div>
          ))}
          {gruposFiltrados.length === 0 && (
            <p className="layout__menu-vacio">No tenés secciones asignadas.</p>
          )}
        </nav>

        <main className="layout__contenido">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
