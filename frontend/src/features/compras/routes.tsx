import { lazy } from 'react'
import { puedeGestionarCompras } from '../../auth/permisos'
import type { AppRouteDefinition } from '../../app/routes/types'

const ProcesosListPage = lazy(() => import('./ProcesosListPage.jsx').then(m => ({ default: m.ProcesosListPage })))
const ProcesoFormPage = lazy(() => import('./ProcesoFormPage.jsx').then(m => ({ default: m.ProcesoFormPage })))
const AdjudicarPage = lazy(() => import('./AdjudicarPage.jsx').then(m => ({ default: m.AdjudicarPage })))
const ComprasRealizadasPage = lazy(() => import('./ComprasRealizadasPage.jsx').then(m => ({ default: m.ComprasRealizadasPage })))

export const comprasRoutes: AppRouteDefinition[] = [
  { path: 'compras', element: <ProcesosListPage />, permiso: puedeGestionarCompras },
  { path: 'compras/nuevo', element: <ProcesoFormPage />, permiso: puedeGestionarCompras },
  { path: 'compras/:id', element: <ProcesoFormPage />, permiso: puedeGestionarCompras },
  { path: 'compras/:id/adjudicar', element: <AdjudicarPage />, permiso: puedeGestionarCompras },
  { path: 'compras-realizadas', element: <ComprasRealizadasPage />, permiso: puedeGestionarCompras }
]
