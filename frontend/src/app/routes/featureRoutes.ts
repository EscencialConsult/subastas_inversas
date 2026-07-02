import type { AppRouteDefinition } from './types'
import { dashboardRoutes } from '../../features/dashboard/routes'
import { perfilRoutes } from '../../features/perfil/routes'
import { comprasRoutes } from '../../features/compras/routes'
import { proveedorRoutes } from '../../features/proveedor/routes'
import { evaluacionRoutes } from '../../features/evaluacion/routes'
import { calificacionRoutes } from '../../features/calificacion/routes'
import { subastaRoutes } from '../../features/subasta/routes'
import { adjudicacionesRoutes } from '../../features/adjudicaciones/routes'
import { auditoriaRoutes } from '../../features/auditoria/routes'
import { configuracionRoutes } from '../../features/configuracion/routes'
import { tenantsRoutes } from '../../features/tenants/routes'
import { usuariosRoutes } from '../../features/usuarios/routes'

export const protectedFeatureRoutes: AppRouteDefinition[] = [
  ...dashboardRoutes,
  ...perfilRoutes,
  ...comprasRoutes,
  ...proveedorRoutes,
  ...evaluacionRoutes,
  ...calificacionRoutes,
  ...subastaRoutes,
  ...adjudicacionesRoutes,
  ...auditoriaRoutes,
  ...configuracionRoutes,
  ...tenantsRoutes,
  ...usuariosRoutes
]
