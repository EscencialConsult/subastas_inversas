import { ChevronRight, Home } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

const labels: Record<string, string> = {
  panel: 'Panel',
  perfil: 'Mi perfil',
  configuracion: 'Configuracion',
  proveedor: 'Mi cuenta',
  arca: 'ARCA',
  documentacion: 'Documentacion',
  oportunidades: 'Oportunidades',
  subastas: 'Subastas',
  'evaluacion-proveedores': 'Evaluacion documental',
  evaluacion: 'Evaluacion',
  calificacion: 'Calificacion',
  compras: 'Compras',
  nuevo: 'Nuevo',
  adjudicar: 'Adjudicar',
  'compras-realizadas': 'Compras realizadas',
  subasta: 'Subasta',
  proveedores: 'Proveedores',
  adjudicaciones: 'Adjudicaciones',
  auditoria: 'Auditoria',
  tenants: 'Tenants',
  detalle: 'Detalle',
  usuarios: 'Usuarios',
}

const hiddenRoots = new Set(['portal', 'login', 'registro-proveedor'])

function labelFor(segment: string, index: number, segments: string[]) {
  if (/^[0-9a-f-]{8,}$/i.test(segment) || /^\d+$/.test(segment)) {
    const previous = segments[index - 1]
    if (previous === 'tenants') return 'Editar'
    if (previous === 'usuarios') return 'Editar'
    return 'Detalle'
  }

  return labels[segment] ?? segment.replace(/-/g, ' ')
}

export function Breadcrumbs() {
  const { pathname } = useLocation()
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length === 0 || hiddenRoots.has(segments[0])) return null

  const crumbs = segments.map((segment, index) => ({
    label: labelFor(segment, index, segments),
    to: `/${segments.slice(0, index + 1).join('/')}`,
    current: index === segments.length - 1,
  }))

  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-sm text-text-muted">
      <ol className="flex flex-wrap items-center gap-1">
        <li>
          <Link to="/" className="inline-flex items-center gap-1 hover:text-primary">
            <Home size={14} />
            Inicio
          </Link>
        </li>
        {crumbs.map((crumb) => (
          <li key={crumb.to} className="inline-flex items-center gap-1">
            <ChevronRight size={14} aria-hidden="true" />
            {crumb.current ? (
              <span className="font-medium text-text" aria-current="page">{crumb.label}</span>
            ) : (
              <Link to={crumb.to} className="hover:text-primary">
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
