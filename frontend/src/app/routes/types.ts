import type { ReactElement } from 'react'
import type { PermisoVisual } from '../../auth/permisos'

export interface AppRouteDefinition {
  path: string
  element: ReactElement
  permiso?: PermisoVisual
}
