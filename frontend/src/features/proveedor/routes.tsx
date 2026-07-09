import { lazy } from 'react'
import { esProveedor, puedeVerProveedores, puedeEvaluar } from '../../auth/permisos'
import type { AppRouteDefinition } from '../../app/routes/types'

const ProveedorHomePage = lazy(() => import('./ProveedorHomePage').then(m => ({ default: m.ProveedorHomePage })))
const ProveedorDocumentacionPage = lazy(() => import('./ProveedorDocumentacionPage').then(m => ({ default: m.ProveedorDocumentacionPage })))
const ProveedorArcaPage = lazy(() => import('./ProveedorArcaPage').then(m => ({ default: m.ProveedorArcaPage })))
const ProveedorOportunidadesPage = lazy(() => import('./ProveedorOportunidadesPage').then(m => ({ default: m.ProveedorOportunidadesPage })))
const ProveedorSubastaLivePage = lazy(() => import('./pages/ProveedorSubastaLivePage').then(m => ({ default: m.ProveedorSubastaLivePage })))
const ProveedoresDirectorioPage = lazy(() => import('./ProveedoresDirectorioPage').then(m => ({ default: m.ProveedoresDirectorioPage })))
const EvaluacionProveedoresPage = lazy(() => import('./EvaluacionProveedoresPage').then(m => ({ default: m.EvaluacionProveedoresPage })))

const RegistroProveedorPage = lazy(() => import('./RegistroProveedorPage').then(m => ({ default: m.RegistroProveedorPage })))

export const proveedorPublicRoutes: AppRouteDefinition[] = [
  { path: '/registro-proveedor', element: <RegistroProveedorPage /> }
]

export const proveedorRoutes: AppRouteDefinition[] = [
  { path: 'proveedor', element: <ProveedorHomePage />, permiso: esProveedor },
  { path: 'proveedor/arca', element: <ProveedorArcaPage />, permiso: esProveedor },
  { path: 'proveedor/documentacion', element: <ProveedorDocumentacionPage />, permiso: esProveedor },
  { path: 'proveedor/oportunidades', element: <ProveedorOportunidadesPage />, permiso: esProveedor },
  { path: 'proveedor/subastas/:auctionId', element: <ProveedorSubastaLivePage />, permiso: esProveedor },
  { path: 'proveedores', element: <ProveedoresDirectorioPage />, permiso: puedeVerProveedores },
  { path: 'evaluacion-proveedores', element: <EvaluacionProveedoresPage />, permiso: puedeEvaluar }
]
