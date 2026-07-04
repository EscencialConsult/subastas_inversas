import { lazy } from 'react'
import { puedeGestionarUsuarios } from '../../auth/permisos'
import type { AppRouteDefinition } from '../../app/routes/types'

const UsuariosListPage = lazy(() => import('./pages/UsuariosListPage').then(m => ({ default: m.UsuariosListPage })))
const UsuarioFormPage = lazy(() => import('./UsuarioFormPage').then(m => ({ default: m.UsuarioFormPage })))

export const usuariosRoutes: AppRouteDefinition[] = [
  { path: 'usuarios', element: <UsuariosListPage />, permiso: puedeGestionarUsuarios },
  { path: 'usuarios/nuevo', element: <UsuarioFormPage />, permiso: puedeGestionarUsuarios },
  { path: 'usuarios/:id', element: <UsuarioFormPage />, permiso: puedeGestionarUsuarios }
]
