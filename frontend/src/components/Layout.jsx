// Layout principal: header con el tenant + menú lateral según rol + contenido.

import { NavLink, Outlet, Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import {
  puedeGestionarUsuarios,
  puedeGestionarTenants,
  esProveedor,
  puedeGestionarCompras,
  puedeAprobarCompras,
  puedeEvaluar,
  puedeAuditar,
} from '../auth/permisos.js'
import { etiquetaRol } from '../domain/roles.js'

export function Layout() {
  const { usuario, tenant, rol, logout } = useAuth()

  // El menú se arma según el rol: un Auditor no ve "Usuarios", etc.
  const items = [
    {
      to: '/usuarios',
      texto: 'Usuarios',
      visible: puedeGestionarUsuarios(rol),
    },
    {
      to: '/tenants',
      texto: 'Tenants',
      visible: puedeGestionarTenants(rol),
    },
    {
      to: '/compras',
      texto: 'Compras',
      visible: puedeGestionarCompras(rol),
    },
    {
      to: '/aprobaciones',
      texto: 'Aprobaciones',
      visible: puedeAprobarCompras(rol),
    },
    {
      to: '/adjudicaciones',
      texto: 'Adjudicaciones',
      visible: puedeAprobarCompras(rol),
    },
    {
      to: '/evaluaciones',
      texto: 'Evaluaciones',
      visible: puedeEvaluar(rol),
    },
    {
      to: '/auditoria',
      texto: 'Auditoría',
      visible: puedeAuditar(rol),
    },
    {
      to: '/proveedor',
      texto: 'Mi cuenta',
      visible: esProveedor(rol),
    },
  ].filter((i) => i.visible)

  return (
    <div className="layout">
      <header className="layout__header">
        <div className="layout__marca">
          {/* El nombre/logo del tenant es DATO (configuración), no código. */}
          <span className="layout__logo">SICST MAX</span>
          {tenant && <span className="layout__tenant">· {tenant.nombre}</span>}
        </div>
        <div className="layout__usuario">
          <Link to="/perfil" className="layout__perfil">
            {usuario.nombre} {usuario.apellido} ({etiquetaRol(rol)})
          </Link>
          <button className="btn btn--texto" onClick={logout}>
            Salir
          </button>
        </div>
      </header>

      <div className="layout__cuerpo">
        <nav className="layout__menu">
          {items.length === 0 && (
            <p className="layout__menu-vacio">No tenés secciones asignadas.</p>
          )}
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive ? 'layout__link layout__link--activo' : 'layout__link'
              }
            >
              {item.texto}
            </NavLink>
          ))}
        </nav>

        <main className="layout__contenido">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
