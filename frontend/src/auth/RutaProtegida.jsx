import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'
import { esProveedor, puedeEvaluar } from './permisos.js'

export function RutaProtegida({ children, permiso }) {
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

function rutaInicialPorRol(rol) {
  if (esProveedor(rol)) return '/proveedor'
  if (puedeEvaluar(rol)) return '/evaluacion'
  return '/'
}
