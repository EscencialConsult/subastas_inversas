import { lazy } from 'react'
import type { ReactElement } from 'react'
import type { AppRouteDefinition } from '../../app/routes/types'

const PortalLayout = lazy(() => import('./PortalLayout').then(m => ({ default: m.PortalLayout })))
const PortalPublicoPage = lazy(() => import('./pages/PortalPublicoPage').then(m => ({ default: m.PortalPublicoPage })))
const ProcesoPublicoPage = lazy(() => import('./pages/ProcesoPublicoPage').then(m => ({ default: m.ProcesoPublicoPage })))
const SubastaPublicaPage = lazy(() => import('./pages/SubastaPublicaPage').then(m => ({ default: m.SubastaPublicaPage })))

export const publicRouteLayout: ReactElement = <PortalLayout />

export const publicoRoutes: AppRouteDefinition[] = [
  { path: '/portal', element: <PortalPublicoPage /> },
  { path: '/portal/procesos/:procesoId', element: <ProcesoPublicoPage /> },
  { path: '/portal/subasta/:procesoId', element: <SubastaPublicaPage /> }
]
