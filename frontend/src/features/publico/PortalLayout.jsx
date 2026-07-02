import { Link, Outlet } from 'react-router-dom'
import { Button } from '../../shared/ui/Button'

export function PortalLayout() {
  return (
    <div className="public-page">
      <header className="page-header">
        <div className="contenedor page-header__inner">
          <Link to="/portal" className="page-header__brand">
            <span className="page-header__logo">SC</span>
            <span className="flex flex-col">
              <span className="page-header__title">SICST</span>
              <span className="page-header__subtitle">Portal de transparencia</span>
            </span>
          </Link>
          <nav className="page-header__nav" aria-label="Accesos publicos">
            <Button as={Link} to="/registro-proveedor" variant="secondary">
              Registro proveedor
            </Button>
            <Button as={Link} to="/login">
              Ingresar
            </Button>
          </nav>
        </div>
      </header>
      <main className="contenedor pt-6 pb-10">
        <Outlet />
      </main>
    </div>
  )
}
