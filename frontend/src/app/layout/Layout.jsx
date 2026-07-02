import { useState } from 'react'
import { NavLink, Outlet, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../auth/AuthContext'
import {
  puedeGestionarUsuarios,
  puedeGestionarConfiguracion,
  puedeGestionarTenants,
  esProveedor,
  puedeGestionarCompras,
  puedeAprobarAdjudicacion,
  puedeEvaluar,
  puedeSupervisar,
  puedeVerProveedores,
  tienePanel,
} from '../../auth/permisos'
import { etiquetaRol } from '../../domain/roles'
import {
  LayoutDashboard, Users, Settings, Building2,
  ShoppingCart, ClipboardCheck, Truck, Award,
  Hammer, ShieldCheck, UserCircle, LogOut, FileCheck2,
  Menu, X
} from 'lucide-react'
import { Button } from '../../shared/ui/Button'
import { Breadcrumbs } from '../../shared/ui/Breadcrumbs.jsx'

const iconos = {
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

function Icono({ item }) {
  const Icon = iconos[item.icono]
  if (!Icon) return null
  return <Icon className="layout__link-icono w-4 h-4 shrink-0" />
}

export function Layout() {
  const { usuario, tenant, rol, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const marcaTexto = tenant?.nombre || 'SICST'

  const items = [
    { to: '/panel', texto: 'Panel', icono: 'panel', visible: tienePanel(rol) },
    { to: '/usuarios', texto: 'Usuarios', icono: 'usuarios', visible: puedeGestionarUsuarios(rol) },
    { to: '/configuracion', texto: 'Configuracion', icono: 'configuracion', visible: puedeGestionarConfiguracion(rol) },
    { to: '/tenants', texto: 'Tenants', icono: 'tenants', visible: puedeGestionarTenants(rol) },
    { to: '/compras', texto: 'Compras', icono: 'compras', visible: puedeGestionarCompras(rol) },
    { to: '/compras-realizadas', texto: 'Compras realizadas', icono: 'compras-realizadas', visible: puedeGestionarCompras(rol) },
    { to: '/proveedores', texto: 'Proveedores', icono: 'proveedores', visible: puedeVerProveedores(rol) },
    { to: '/calificacion', texto: 'Calificación', icono: 'evaluacion', visible: puedeEvaluar(rol) },
    { to: '/evaluacion', texto: 'Evaluación de procesos', icono: 'evaluacion', visible: puedeEvaluar(rol) },
    { to: '/evaluacion-proveedores', texto: 'Evaluación documental', icono: 'evaluacion', visible: puedeEvaluar(rol) },
    { to: '/adjudicaciones', texto: 'Adjudicaciones', icono: 'adjudicaciones', visible: puedeAprobarAdjudicacion(rol) },
    { to: '/subastas', texto: 'Subastas', icono: 'subastas', visible: puedeSupervisar(rol) },
    { to: '/auditoria', texto: 'Auditoría', icono: 'auditoria', visible: puedeSupervisar(rol) },
    { to: '/proveedor', texto: 'Mi cuenta', icono: 'proveedor', visible: esProveedor(rol) },
    { to: '/proveedor/oportunidades', texto: 'Subastas / Invitaciones', icono: 'subastas', visible: esProveedor(rol) },
  ].filter((i) => i.visible)

  const menuLinks = (
    <>
      {items.length === 0 && (
        <p className="text-sm text-text-muted px-3 py-4">No tenés secciones asignadas.</p>
      )}
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={() => setSidebarOpen(false)}
          className={({ isActive }) =>
            [
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150',
              isActive
                ? 'bg-primary-light text-primary font-semibold'
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
    <div className="layout min-h-screen flex flex-col">
      {/* Skip to Main Content Link (A11y) */}
      <a href="#main-content" className="skip-link">
        Saltar al contenido principal
      </a>

      {/* Header */}
      <header className="layout__header flex items-center justify-between px-6 h-14 bg-surface border-b border-border shadow-sm z-30">
        <div className="flex items-center gap-3">
          {/* Hamburger Menu Toggle */}
          <button
            type="button"
            className="lg:hidden p-1.5 rounded hover:bg-background text-text-muted hover:text-text transition-colors"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menú de navegación"
            aria-expanded={sidebarOpen}
          >
            <Menu size={20} />
          </button>

          <div className="layout__marca flex items-center gap-2">
            {tenant?.logo ? (
              <img className="layout__logo-img max-h-8 object-contain" src={tenant.logo} alt={marcaTexto} />
            ) : (
              <span className="layout__logo font-bold text-lg text-primary">{marcaTexto}</span>
            )}
            {tenant && <span className="layout__tenant pl-2 border-l border-border text-sm text-text-muted font-medium">{tenant.nombre}</span>}
          </div>
        </div>

        <div className="layout__usuario flex items-center gap-4 text-sm">
          <Link to="/perfil" className="layout__perfil flex items-center gap-2 text-text hover:text-primary font-medium transition-colors">
            <UserCircle size={20} className="text-text-muted" />
            <span className="hidden sm:inline">
              {usuario.nombre} {usuario.apellido} ({etiquetaRol(rol)})
            </span>
          </Link>
          <Button variant="ghost" onClick={logout} title="Cerrar sesión" icon={<LogOut size={18} />} />
        </div>
      </header>

      <div className="layout__cuerpo flex-1 flex relative">
        {/* Desktop Sidebar (permanently visible on large screens) */}
        <nav className="hidden lg:flex flex-col w-56 bg-surface border-r border-border p-4 gap-1 shrink-0 overflow-y-auto">
          {menuLinks}
        </nav>

        {/* Mobile Slide-over Sidebar with Framer Motion */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/45 lg:hidden"
                onClick={() => setSidebarOpen(false)}
              />
              
              {/* Sidebar Panel */}
              <motion.nav
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'tween', duration: 0.25 }}
                className="fixed inset-y-0 left-0 z-50 w-64 bg-surface border-r border-border p-5 flex flex-col gap-1 shadow-xl lg:hidden"
                role="navigation"
                aria-label="Menú de navegación móvil"
              >
                <div className="flex items-center justify-between mb-6 pb-2 border-b border-border">
                  <span className="font-bold text-primary text-base">{marcaTexto}</span>
                  <button
                    type="button"
                    className="p-1 rounded hover:bg-background text-text-muted hover:text-text transition-colors"
                    onClick={() => setSidebarOpen(false)}
                    aria-label="Cerrar menú de navegación"
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <div className="flex-1 flex flex-col gap-1 overflow-y-auto">
                  {menuLinks}
                </div>
              </motion.nav>
            </>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <main id="main-content" className="layout__contenido flex-1 p-6 sm:p-8 bg-background overflow-x-hidden">
          <Breadcrumbs />
          <Outlet />
        </main>
      </div>
    </div>
  )
}
