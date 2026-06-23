// Guard de rutas: exige sesión y, opcionalmente, un permiso.
//
// Si no hay sesión -> manda al login.
// Si hay sesión pero no tiene permiso -> muestra "sin acceso".

import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth.js'

export function RutaProtegida({ children, permiso }) {
  const { estaAutenticado, rol } = useAuth()
  const ubicacion = useLocation()

  if (!estaAutenticado) {
    return <Navigate to="/login" replace state={{ from: ubicacion }} />
  }

  // `permiso` es una función (rol) => boolean. Si no se pasa, sólo exige sesión.
  if (permiso && !permiso(rol)) {
    return (
      <div className="estado-vacio">
        <h2>Sin acceso</h2>
        <p>Tu rol no tiene permiso para ver esta sección.</p>
      </div>
    )
  }

  return children
}
