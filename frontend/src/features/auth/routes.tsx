import { lazy } from 'react'
import type { AppRouteDefinition } from '../../app/routes/types'

const LoginPage = lazy(() => import('./LoginPage.jsx').then(m => ({ default: m.LoginPage })))

export const authPublicRoutes: AppRouteDefinition[] = [
  { path: '/login', element: <LoginPage /> }
]
