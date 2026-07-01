import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { esProveedor, puedeEvaluar, type PermisoVisual } from './permisos'

interface RutaProtegidaProps {
  children: ReactNode
  permiso?: PermisoVisual
}

export function RutaProtegida({ children, permiso }: RutaProtegidaProps) {
  const { estaAutenticado, rol } = useAuth()
  const ubicacion = useLocation()

  if (!estaAutenticado) {
    return <Navigate to="/login" replace state={{ from: ubicacion }} />
  }

  if (permiso && !permiso(rol)) {
    return <Navigate to={rutaInicialPorRol(rol)} replace />
  }

  return children
}

function rutaInicialPorRol(rol: string | null) {
  if (esProveedor(rol)) return '/proveedor'
  if (puedeEvaluar(rol)) return '/evaluacion'
  return '/'
}
