import { lazy } from 'react'
import { puedeEvaluar } from '../../auth/permisos'
import type { AppRouteDefinition } from '../../app/routes/types'

const EvaluacionListPage = lazy(() => import('./EvaluacionListPage.jsx').then(m => ({ default: m.EvaluacionListPage })))
const EvaluacionProcesoPage = lazy(() => import('./pages/EvaluacionProcesoPage.tsx').then(m => ({ default: m.EvaluacionProcesoPage })))

export const evaluacionRoutes: AppRouteDefinition[] = [
  { path: 'evaluacion', element: <EvaluacionListPage />, permiso: puedeEvaluar },
  { path: 'evaluacion/:id', element: <EvaluacionProcesoPage />, permiso: puedeEvaluar }
]
