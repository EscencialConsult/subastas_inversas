import { useState } from 'react'
import { NavLink, Outlet, Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import {
  puedeGestionarUsuarios,
  puedeGestionarConfiguracion,
  puedeGestionarTenants,
  esProveedor,
  puedeGestionarCompras,
  puedeAprobarAdjudicacion,
  puedeEvaluar,
  puedeVerCalificacion,
  puedeSupervisar,
  puedeVerProveedores,
  tienePanel,
} from '../../auth/permisos'
import { etiquetaRol } from '../../domain/roles'
import {
  LayoutDashboard, Users, Settings, Building2,
  ShoppingCart, ClipboardCheck, Truck, Award,
  Hammer, ShieldCheck, UserCircle, LogOut, FileCheck2,
  Menu, X, type LucideIcon,
} from 'lucide-react'
import { Button } from '../../shared/ui/Button'
import { Breadcrumbs } from '../../shared/ui/Breadcrumbs'

const iconos: Record<string, LucideIcon> = {
  panel: LayoutDashboard,
  usuarios: Users,
  configuracion: Settings,
  tenants: Building2,
  compras: ShoppingCart,
  'compras-realizadas': ClipboardCheck,
  proveedores: Truck,
  evaluacion: FileCheck2,
  adjudicaciones: Award,
  subastas: Hammer,
  auditoria: ShieldCheck,
  proveedor: UserCircle,
}

interface NavItem {
  to: string
  texto: string
  icono: string
  visible: boolean
}

function Icono({ item }: { item: NavItem }) {
  const Icon = iconos[item.icono]
  if (!Icon) return null
  return <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
}

export function Layout() {
  const { usuario, tenant, rol, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const marcaTexto = tenant?.nombre || 'SICST'

  const items: NavItem[] = [
    { to: '/panel', texto: 'Panel', icono: 'panel', visible: tienePanel(rol) },
    { to: '/usuarios', texto: 'Usuarios', icono: 'usuarios', visible: puedeGestionarUsuarios(rol) },
    { to: '/configuracion', texto: 'Configuracion', icono: 'configuracion', visible: puedeGestionarConfiguracion(rol) },
    { to: '/tenants', texto: 'Tenants', icono: 'tenants', visible: puedeGestionarTenants(rol) },
    { to: '/compras', texto: 'Compras', icono: 'compras', visible: puedeGestionarCompras(rol) },
    { to: '/compras-realizadas', texto: 'Compras realizadas', icono: 'compras-realizadas', visible: puedeGestionarCompras(rol) },
    { to: '/proveedores', texto: 'Proveedores', icono: 'proveedores', visible: puedeVerProveedores(rol) },
    { to: '/calificacion', texto: 'Calificacion', icono: 'evaluacion', visible: puedeVerCalificacion(rol) },
    { to: '/evaluacion', texto: 'Evaluacion de procesos', icono: 'evaluacion', visible: puedeEvaluar(rol) },
    { to: '/evaluacion-proveedores', texto: 'Evaluacion documental', icono: 'evaluacion', visible: puedeEvaluar(rol) },
    { to: '/adjudicaciones', texto: 'Adjudicaciones', icono: 'adjudicaciones', visible: puedeAprobarAdjudicacion(rol) },
    { to: '/subastas', texto: 'Subastas', icono: 'subastas', visible: puedeSupervisar(rol) },
    { to: '/auditoria', texto: 'Auditoria', icono: 'auditoria', visible: puedeSupervisar(rol) },
    { to: '/proveedor', texto: 'Mi cuenta', icono: 'proveedor', visible: esProveedor(rol) },
    { to: '/proveedor/arca', texto: 'ARCA', icono: 'auditoria', visible: esProveedor(rol) },
    { to: '/proveedor/documentacion', texto: 'Documentacion', icono: 'proveedor', visible: esProveedor(rol) },
    { to: '/proveedor/oportunidades', texto: 'Subastas / Invitaciones', icono: 'subastas', visible: esProveedor(rol) },
  ].filter((i) => i.visible)

  const menuLinks = (
    <>
      {items.length === 0 && (
        <p className="px-3 py-4 text-sm text-text-muted">No tenes secciones asignadas.</p>
      )}
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={() => setSidebarOpen(false)}
          className={({ isActive }) =>
            [
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
              isActive
                ? 'bg-primary-soft text-primary font-semibold'
                : 'text-text-muted hover:bg-background hover:text-text',
            ].join(' ')
          }
        >
          <Icono item={item} />
          <span>{item.texto}</span>
        </NavLink>
      ))}
    </>
  )

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main-content" className="skip-link">
        Saltar al contenido principal
      </a>

      <header className="z-30 flex h-14 items-center justify-between border-b border-border bg-surface px-4 shadow-sm sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menu de navegacion"
            aria-expanded={sidebarOpen}
            icon={<Menu size={20} />}
          />

          <div className="flex min-w-0 items-center gap-2">
            {tenant?.logo ? (
              <img className="max-h-8 object-contain" src={tenant.logo} alt={marcaTexto} />
            ) : (
              <span className="truncate text-lg font-bold text-primary">{marcaTexto}</span>
            )}
            {tenant && (
              <span className="hidden border-l border-border pl-2 text-sm font-medium text-text-muted sm:inline">
                {tenant.nombre}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm sm:gap-4">
          <Link
            to="/perfil"
            className="flex items-center gap-2 font-medium text-text transition-colors hover:text-primary"
          >
            <UserCircle size={20} className="text-text-muted" aria-hidden="true" />
            <span className="hidden sm:inline">
              {usuario.nombre} {usuario.apellido} ({etiquetaRol(rol)})
            </span>
          </Link>
          <Button
            variant="ghost"
            onClick={logout}
            title="Cerrar sesion"
            aria-label="Cerrar sesion"
            icon={<LogOut size={18} />}
          />
        </div>
      </header>

      <div className="relative flex flex-1">
        <nav
          className="hidden w-56 shrink-0 flex-col gap-1 overflow-y-auto border-r border-border bg-surface p-4 lg:flex"
          aria-label="Navegacion principal"
        >
          {menuLinks}
        </nav>

        {sidebarOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/45 animate-fadeIn lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />

            <nav
              className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col gap-1 border-r border-border bg-surface p-5 shadow-xl lg:hidden animate-slideIn"
              role="navigation"
              aria-label="Menu de navegacion movil"
            >
              <div className="mb-6 flex items-center justify-between border-b border-border pb-2">
                <span className="truncate text-base font-bold text-primary">{marcaTexto}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Cerrar menu de navegacion"
                  icon={<X size={20} />}
                />
              </div>

              <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
                {menuLinks}
              </div>
            </nav>
          </>
        )}

        <main id="main-content" className="flex-1 overflow-x-hidden bg-background p-6 sm:p-8">
          <Breadcrumbs />
          <Outlet />
        </main>
      </div>
    </div>
  )
}
