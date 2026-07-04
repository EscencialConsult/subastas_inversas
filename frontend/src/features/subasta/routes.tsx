import { lazy } from 'react'
import { puedeGestionarCompras, puedeSupervisar } from '../../auth/permisos'
import type { AppRouteDefinition } from '../../app/routes/types'

const SubastaPage = lazy(() => import('./pages/SubastaPage').then(m => ({ default: m.SubastaPage })))
const SubastasRealizadasPage = lazy(() => import('./SubastasRealizadasPage').then(m => ({ default: m.SubastasRealizadasPage })))

export const subastaRoutes: AppRouteDefinition[] = [
  { path: 'subasta/:procesoId', element: <SubastaPage />, permiso: puedeGestionarCompras },
  { path: 'subastas', element: <SubastasRealizadasPage />, permiso: puedeSupervisar }
]
