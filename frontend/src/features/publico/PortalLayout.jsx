import { Link, Outlet } from 'react-router-dom'

export function PortalLayout() {
  return (
    <div className="public-page">
      <header className="page-header">
        <div className="contenedor page-header__inner">
          <Link to="/portal" className="page-header__brand">
            <span className="page-header__logo">SC</span>
            <span className="flex flex--col">
              <span className="page-header__title">SICST</span>
              <span className="page-header__subtitle">Portal de transparencia</span>
            </span>
          </Link>
          <nav className="page-header__nav" aria-label="Accesos publicos">
            <Link to="/registro-proveedor" className="btn btn--secundario">
              Registro proveedor
            </Link>
            <Link to="/login" className="btn btn--primario">
              Ingresar
            </Link>
          </nav>
        </div>
      </header>
      <main className="contenedor" style={{ paddingTop: 24, paddingBottom: 40 }}>
        <Outlet />
      </main>
    </div>
  )
}
