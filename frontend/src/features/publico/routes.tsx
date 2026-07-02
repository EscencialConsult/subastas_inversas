import { lazy } from 'react'
import type { ReactElement } from 'react'
import type { AppRouteDefinition } from '../../app/routes/types'

const PortalLayout = lazy(() => import('./PortalLayout.jsx').then(m => ({ default: m.PortalLayout })))
const PortalPublicoPage = lazy(() => import('./PortalPublicoPage.jsx').then(m => ({ default: m.PortalPublicoPage })))
const ProcesoPublicoPage = lazy(() => import('./ProcesoPublicoPage.jsx').then(m => ({ default: m.ProcesoPublicoPage })))
const SubastaPublicaPage = lazy(() => import('./SubastaPublicaPage.jsx').then(m => ({ default: m.SubastaPublicaPage })))

export const publicRouteLayout: ReactElement = <PortalLayout />

export const publicoRoutes: AppRouteDefinition[] = [
  { path: '/portal', element: <PortalPublicoPage /> },
  { path: '/portal/procesos/:procesoId', element: <ProcesoPublicoPage /> },
  { path: '/portal/subasta/:procesoId', element: <SubastaPublicaPage /> }
]
