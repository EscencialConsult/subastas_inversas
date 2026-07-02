import type { AppRouteDefinition } from './types'
import { authPublicRoutes } from '../../features/auth/routes'
import { proveedorPublicRoutes } from '../../features/proveedor/routes'

export const publicRoutes: AppRouteDefinition[] = [
  ...authPublicRoutes,
  ...proveedorPublicRoutes
]
