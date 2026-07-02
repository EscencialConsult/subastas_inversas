import { lazy } from 'react'
import { esProveedor, puedeVerProveedores, puedeEvaluar } from '../../auth/permisos'
import type { AppRouteDefinition } from '../../app/routes/types'

const ProveedorHomePage = lazy(() => import('./ProveedorHomePage.jsx').then(m => ({ default: m.ProveedorHomePage })))
const ProveedorOportunidadesPage = lazy(() => import('./ProveedorOportunidadesPage.jsx').then(m => ({ default: m.ProveedorOportunidadesPage })))
const ProveedorSubastaLivePage = lazy(() => import('./ProveedorSubastaLivePage.jsx').then(m => ({ default: m.ProveedorSubastaLivePage })))
const ProveedoresDirectorioPage = lazy(() => import('./ProveedoresDirectorioPage.jsx').then(m => ({ default: m.ProveedoresDirectorioPage })))
const EvaluacionProveedoresPage = lazy(() => import('./EvaluacionProveedoresPage.jsx').then(m => ({ default: m.EvaluacionProveedoresPage })))

const RegistroProveedorPage = lazy(() => import('./RegistroProveedorPage.jsx').then(m => ({ default: m.RegistroProveedorPage })))

export const proveedorPublicRoutes: AppRouteDefinition[] = [
  { path: '/registro-proveedor', element: <RegistroProveedorPage /> }
]

export const proveedorRoutes: AppRouteDefinition[] = [
  { path: 'proveedor', element: <ProveedorHomePage />, permiso: esProveedor },
  { path: 'proveedor/oportunidades', element: <ProveedorOportunidadesPage />, permiso: esProveedor },
  { path: 'proveedor/subastas/:auctionId', element: <ProveedorSubastaLivePage />, permiso: esProveedor },
  { path: 'proveedores', element: <ProveedoresDirectorioPage />, permiso: puedeVerProveedores },
  { path: 'evaluacion-proveedores', element: <EvaluacionProveedoresPage />, permiso: puedeEvaluar }
]
