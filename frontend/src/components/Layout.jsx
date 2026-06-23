// Layout principal: header con el tenant + menú lateral según rol + contenido.

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

export function Layout() {
  const { usuario, tenant, rol, logout } = useAuth()

  // El menú se arma según el rol: un Auditor no ve "Usuarios", etc.
  const items = [
    {
      to: '/usuarios',
      texto: 'Usuarios',
      visible: puedeGestionarUsuarios(rol),
      end: true,
    },
    {
      to: '/tenants',
      texto: 'Tenants',
      visible: puedeGestionarTenants(rol),
      end: true,
    },
    {
      to: '/proveedores',
      texto: 'Proveedores',
      visible: puedeGestionarCompras(rol),
      end: true,
    },
    {
      to: '/compras',
      texto: 'Compras',
      visible: puedeGestionarCompras(rol),
      end: true,
    },
    {
      to: '/configuracion',
      texto: 'Configuracion',
      visible: puedeConfigurarEmpresa(rol),
      end: true,
    },
    {
      to: '/aprobaciones',
      texto: 'Aprobaciones',
      visible: puedeAprobarCompras(rol),
      end: true,
    },
    {
      to: '/adjudicaciones',
      texto: 'Adjudicaciones',
      visible: puedeAprobarCompras(rol),
      end: true,
    },
    {
      to: '/evaluaciones',
      texto: 'Evaluaciones',
      visible: puedeEvaluar(rol),
      end: true,
    },
    {
      to: '/auditoria',
      texto: 'Auditoría',
      visible: puedeAuditar(rol),
      end: true,
    },
    {
      to: '/proveedor',
      texto: 'Mi cuenta',
      visible: esProveedor(rol),
      end: true,
    },
    {
      to: '/proveedor/subastas',
      texto: 'Subastas',
      visible: esProveedor(rol),
      end: true,
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
              end={item.end}
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
