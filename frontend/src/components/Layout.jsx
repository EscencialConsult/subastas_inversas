import { NavLink, Outlet, Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import {
  puedeGestionarUsuarios,
  puedeGestionarConfiguracion,
  puedeGestionarTenants,
  esProveedor,
  puedeGestionarCompras,
  puedeAprobarAdjudicacion,
  puedeSupervisar,
  puedeVerProveedores,
  tienePanel,
} from '../auth/permisos.js'
import { etiquetaRol } from '../domain/roles.js'
import {
  LayoutDashboard, Users, Settings, Building2,
  ShoppingCart, ClipboardCheck, Truck, Award,
  Hammer, ShieldCheck, UserCircle, LogOut,
} from 'lucide-react'

const iconos = {
  panel: LayoutDashboard,
  usuarios: Users,
  configuracion: Settings,
  tenants: Building2,
  compras: ShoppingCart,
  'compras-realizadas': ClipboardCheck,
  proveedores: Truck,
  adjudicaciones: Award,
  subastas: Hammer,
  auditoria: ShieldCheck,
  proveedor: UserCircle,
}

function Icono({ item }) {
  const Icon = iconos[item.icono]
  if (!Icon) return null
  return <Icon className="layout__link-icono" />
}

export function Layout() {
  const { usuario, tenant, rol, logout } = useAuth()
  const marcaTexto = tenant?.nombre || 'SICST'

  const items = [
    { to: '/panel', texto: 'Panel', icono: 'panel', visible: tienePanel(rol) },
    { to: '/usuarios', texto: 'Usuarios', icono: 'usuarios', visible: puedeGestionarUsuarios(rol) },
    { to: '/configuracion', texto: 'Configuracion', icono: 'configuracion', visible: puedeGestionarConfiguracion(rol) },
    { to: '/tenants', texto: 'Tenants', icono: 'tenants', visible: puedeGestionarTenants(rol) },
    { to: '/compras', texto: 'Compras', icono: 'compras', visible: puedeGestionarCompras(rol) },
    { to: '/compras-realizadas', texto: 'Compras realizadas', icono: 'compras-realizadas', visible: puedeGestionarCompras(rol) },
    { to: '/proveedores', texto: 'Proveedores', icono: 'proveedores', visible: puedeVerProveedores(rol) },
    { to: '/adjudicaciones', texto: 'Adjudicaciones', icono: 'adjudicaciones', visible: puedeAprobarAdjudicacion(rol) },
    { to: '/subastas', texto: 'Subastas', icono: 'subastas', visible: puedeSupervisar(rol) },
    { to: '/auditoria', texto: 'Auditoría', icono: 'auditoria', visible: puedeSupervisar(rol) },
    { to: '/proveedor', texto: 'Mi cuenta', icono: 'proveedor', visible: esProveedor(rol) },
  ].filter((i) => i.visible)

  return (
    <div className="layout">
      <header className="layout__header">
        <div className="layout__marca">
          {tenant?.logo ? (
            <img className="layout__logo-img" src={tenant.logo} alt={marcaTexto} />
          ) : (
            <span className="layout__logo">{marcaTexto}</span>
          )}
          {tenant && <span className="layout__tenant">{tenant.nombre}</span>}
        </div>
        <div className="layout__usuario">
          <Link to="/perfil" className="layout__perfil">
            <UserCircle size={20} />
            {usuario.nombre} {usuario.apellido} ({etiquetaRol(rol)})
          </Link>
          <button className="btn btn--texto" onClick={logout} title="Cerrar sesión">
            <LogOut size={18} />
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
              <Icono item={item} />
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