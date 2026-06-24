// Layout del portal ciudadano (zona pública, sin login).
// Header simple con la marca y un acceso a "Ingresar".

import { Link, Outlet } from 'react-router-dom'

export function PortalLayout() {
  return (
    <div className="portal">
      <header className="portal__header">
        <Link to="/portal" className="portal__marca">
          <span className="layout__logo">SICST</span>
          <span className="portal__sub">Portal de transparencia</span>
        </Link>
        <Link to="/login" className="btn btn--primario">
          Ingresar
        </Link>
      </header>
      <main className="portal__main">
        <Outlet />
      </main>
    </div>
  )
}
