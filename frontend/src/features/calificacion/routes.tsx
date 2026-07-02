import { lazy } from 'react'
import { puedeEvaluar } from '../../auth/permisos'
import type { AppRouteDefinition } from '../../app/routes/types'

const CalificacionListPage = lazy(() => import('./CalificacionListPage.jsx').then(m => ({ default: m.CalificacionListPage })))
const CalificacionProcesoPage = lazy(() => import('./CalificacionProcesoPage.jsx').then(m => ({ default: m.CalificacionProcesoPage })))
const CalificacionProveedorPage = lazy(() => import('./CalificacionProveedorPage.jsx').then(m => ({ default: m.CalificacionProveedorPage })))

export const calificacionRoutes: AppRouteDefinition[] = [
  { path: 'calificacion', element: <CalificacionListPage />, permiso: puedeEvaluar },
  { path: 'calificacion/:id', element: <CalificacionProcesoPage />, permiso: puedeEvaluar },
  { path: 'calificacion/:id/:invitationId', element: <CalificacionProveedorPage />, permiso: puedeEvaluar }
]
