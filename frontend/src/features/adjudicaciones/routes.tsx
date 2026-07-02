import { lazy } from 'react'
import { puedeAprobarAdjudicacion } from '../../auth/permisos'
import type { AppRouteDefinition } from '../../app/routes/types'

const AdjudicacionesListPage = lazy(() => import('./AdjudicacionesListPage.jsx').then(m => ({ default: m.AdjudicacionesListPage })))
const AdjudicacionDetailPage = lazy(() => import('./AdjudicacionDetailPage.jsx').then(m => ({ default: m.AdjudicacionDetailPage })))

export const adjudicacionesRoutes: AppRouteDefinition[] = [
  { path: 'adjudicaciones', element: <AdjudicacionesListPage />, permiso: puedeAprobarAdjudicacion },
  { path: 'adjudicaciones/:id', element: <AdjudicacionDetailPage />, permiso: puedeAprobarAdjudicacion }
]
