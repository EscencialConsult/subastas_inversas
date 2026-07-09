import { lazy } from 'react'
import { puedeVerCalificacion } from '../../auth/permisos'
import type { AppRouteDefinition } from '../../app/routes/types'

const CalificacionListPage = lazy(() => import('./CalificacionListPage').then(m => ({ default: m.CalificacionListPage })))
const CalificacionProcesoPage = lazy(() => import('./CalificacionProcesoPage').then(m => ({ default: m.CalificacionProcesoPage })))
const CalificacionProveedorPage = lazy(() => import('./CalificacionProveedorPage').then(m => ({ default: m.CalificacionProveedorPage })))

export const calificacionRoutes: AppRouteDefinition[] = [
  { path: 'calificacion', element: <CalificacionListPage />, permiso: puedeVerCalificacion },
  { path: 'calificacion/:id', element: <CalificacionProcesoPage />, permiso: puedeVerCalificacion },
  { path: 'calificacion/:id/:invitationId', element: <CalificacionProveedorPage />, permiso: puedeVerCalificacion }
]
