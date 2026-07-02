import { lazy } from 'react'
import type { AppRouteDefinition } from '../../app/routes/types'

const PerfilPage = lazy(() => import('./PerfilPage.jsx').then(m => ({ default: m.PerfilPage })))

export const perfilRoutes: AppRouteDefinition[] = [
  { path: 'perfil', element: <PerfilPage /> }
]
