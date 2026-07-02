import { lazy } from 'react'
import { tienePanel } from '../../auth/permisos'
import type { AppRouteDefinition } from '../../app/routes/types'

const PanelPage = lazy(() => import('./PanelPage.jsx').then(m => ({ default: m.PanelPage })))

export const dashboardRoutes: AppRouteDefinition[] = [
  { path: 'panel', element: <PanelPage />, permiso: tienePanel }
]
