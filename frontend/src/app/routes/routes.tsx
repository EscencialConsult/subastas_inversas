import { Routes, Route, Navigate } from 'react-router-dom'
import { RutaProtegida } from '../../auth/RutaProtegida'
import { useAuth } from '../../auth/AuthContext'
import { esProveedor } from '../../auth/permisos'
import { Layout } from '../layout/Layout'
import { protectedFeatureRoutes } from './featureRoutes'
import { publicRoutes } from './publicRoutes'
import { publicRouteLayout, publicoRoutes } from '../../features/publico/routes'

function Inicio() {
  const { rol } = useAuth()
  if (esProveedor(rol)) return <Navigate to="/proveedor" replace />
  return <Navigate to="/panel" replace />
}

export function AppRoutes() {
  return (
    <Routes>
      {publicRoutes.map((route) => (
        <Route key={route.path} path={route.path} element={route.element} />
      ))}

      {/* Citizen portal */}
      <Route element={publicRouteLayout}>
        {publicoRoutes.map((route) => (
          <Route key={route.path} path={route.path} element={route.element} />
        ))}
      </Route>

      {/* Internal pages with Layout */}
      <Route
        element={
          <RutaProtegida>
            <Layout />
          </RutaProtegida>
        }
      >
        <Route index element={<Inicio />} />

        {protectedFeatureRoutes.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={
              route.permiso ? (
                <RutaProtegida permiso={route.permiso}>
                  {route.element}
                </RutaProtegida>
              ) : (
                route.element
              )
            }
          />
        ))}
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
