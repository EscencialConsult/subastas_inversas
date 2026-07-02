import { lazy } from 'react'
import { puedeSupervisar } from '../../auth/permisos'
import type { AppRouteDefinition } from '../../app/routes/types'

const AuditoriaListPage = lazy(() => import('./AuditoriaListPage.jsx').then(m => ({ default: m.AuditoriaListPage })))
const AuditoriaDetailPage = lazy(() => import('./pages/AuditoriaDetailPage.tsx').then(m => ({ default: m.AuditoriaDetailPage })))

export const auditoriaRoutes: AppRouteDefinition[] = [
  { path: 'auditoria', element: <AuditoriaListPage />, permiso: puedeSupervisar },
  { path: 'auditoria/:id', element: <AuditoriaDetailPage />, permiso: puedeSupervisar }
]
