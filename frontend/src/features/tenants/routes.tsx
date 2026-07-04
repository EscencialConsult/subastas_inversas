import { lazy } from 'react'
import { puedeGestionarTenants } from '../../auth/permisos'
import type { AppRouteDefinition } from '../../app/routes/types'

const TenantsListPage = lazy(() => import('./TenantsListPage').then(m => ({ default: m.TenantsListPage })))
const TenantFormPage = lazy(() => import('./pages/TenantFormPage').then(m => ({ default: m.TenantFormPage })))
const EmpresaDetallePage = lazy(() => import('./EmpresaDetallePage').then(m => ({ default: m.EmpresaDetallePage })))

export const tenantsRoutes: AppRouteDefinition[] = [
  { path: 'tenants', element: <TenantsListPage />, permiso: puedeGestionarTenants },
  { path: 'tenants/nuevo', element: <TenantFormPage />, permiso: puedeGestionarTenants },
  { path: 'tenants/:id', element: <TenantFormPage />, permiso: puedeGestionarTenants },
  { path: 'tenants/:id/detalle', element: <EmpresaDetallePage />, permiso: puedeGestionarTenants }
]
