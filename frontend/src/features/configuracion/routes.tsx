import { lazy } from 'react'
import { puedeGestionarConfiguracion } from '../../auth/permisos'
import type { AppRouteDefinition } from '../../app/routes/types'

const ConfiguracionPage = lazy(() => import('./pages/ConfiguracionPage.tsx').then(m => ({ default: m.ConfiguracionPage })))

export const configuracionRoutes: AppRouteDefinition[] = [
  { path: 'configuracion', element: <ConfiguracionPage />, permiso: puedeGestionarConfiguracion }
]
