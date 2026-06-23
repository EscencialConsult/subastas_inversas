// Ruteo principal de la app.

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext.jsx'
import { useAuth } from './auth/useAuth.js'
import { RutaProtegida } from './auth/RutaProtegida.jsx'
import {
  puedeGestionarUsuarios,
  puedeGestionarTenants,
  esProveedor,
  puedeGestionarCompras,
  puedeConfigurarEmpresa,
  puedeAprobarCompras,
  puedeEvaluar,
  puedeAuditar,
} from './auth/permisos.js'
import { Layout } from './components/Layout.jsx'
import { LoginPage } from './features/auth/LoginPage.jsx'
import { UsuariosListPage } from './features/usuarios/UsuariosListPage.jsx'
import { UsuarioFormPage } from './features/usuarios/UsuarioFormPage.jsx'
import { TenantsListPage } from './features/tenants/TenantsListPage.jsx'
import { TenantFormPage } from './features/tenants/TenantFormPage.jsx'
import { PerfilPage } from './features/perfil/PerfilPage.jsx'
import { RegistroProveedorPage } from './features/proveedor/RegistroProveedorPage.jsx'
import { ProveedorHomePage } from './features/proveedor/ProveedorHomePage.jsx'
import { SubastaProveedorPage } from './features/proveedor/SubastaProveedorPage.jsx'
import { SubastasProveedorListPage } from './features/proveedor/SubastasProveedorListPage.jsx'
import { ProveedoresListPage } from './features/proveedores/ProveedoresListPage.jsx'
import { ProcesosListPage } from './features/compras/ProcesosListPage.jsx'
import { ProcesoFormPage } from './features/compras/ProcesoFormPage.jsx'
import { ConfiguracionPage } from './features/configuracion/ConfiguracionPage.jsx'
import { AprobacionesListPage } from './features/aprobaciones/AprobacionesListPage.jsx'
import { AprobacionDetailPage } from './features/aprobaciones/AprobacionDetailPage.jsx'
import { SubastaPage } from './features/subasta/SubastaPage.jsx'
import { EvaluacionesListPage } from './features/evaluaciones/EvaluacionesListPage.jsx'
import { EvaluacionDetailPage } from './features/evaluaciones/EvaluacionDetailPage.jsx'
import { AdjudicacionesListPage } from './features/adjudicaciones/AdjudicacionesListPage.jsx'
import { AdjudicacionDetailPage } from './features/adjudicaciones/AdjudicacionDetailPage.jsx'
import { AuditoriaListPage } from './features/auditoria/AuditoriaListPage.jsx'
import { AuditoriaDetailPage } from './features/auditoria/AuditoriaDetailPage.jsx'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          {/* Registro de proveedor: público, sin sesión. */}
          <Route path="/registro-proveedor" element={<RegistroProveedorPage />} />

          {/* Todo lo de adentro exige sesión y usa el layout. */}
          <Route
            element={
              <RutaProtegida>
                <Layout />
              </RutaProtegida>
            }
          >
            <Route index element={<Inicio />} />

            {/* Mi perfil: lo ve cualquier usuario logueado (sin guard de rol). */}
            <Route path="perfil" element={<PerfilPage />} />

            <Route
              path="proveedor"
              element={
                <RutaProtegida permiso={esProveedor}>
                  <ProveedorHomePage />
                </RutaProtegida>
              }
            />
            <Route
              path="proveedor/subastas"
              element={
                <RutaProtegida permiso={esProveedor}>
                  <SubastasProveedorListPage />
                </RutaProtegida>
              }
            />
            <Route
              path="proveedor/subasta/:procesoId"
              element={
                <RutaProtegida permiso={esProveedor}>
                  <SubastaProveedorPage />
                </RutaProtegida>
              }
            />

            <Route
              path="proveedores"
              element={
                <RutaProtegida permiso={puedeGestionarCompras}>
                  <ProveedoresListPage />
                </RutaProtegida>
              }
            />
            <Route
              path="compras"
              element={
                <RutaProtegida permiso={puedeGestionarCompras}>
                  <ProcesosListPage />
                </RutaProtegida>
              }
            />
            <Route
              path="compras/nuevo"
              element={
                <RutaProtegida permiso={puedeGestionarCompras}>
                  <ProcesoFormPage />
                </RutaProtegida>
              }
            />
            <Route
              path="compras/:id"
              element={
                <RutaProtegida permiso={puedeGestionarCompras}>
                  <ProcesoFormPage />
                </RutaProtegida>
              }
            />

            <Route
              path="configuracion"
              element={
                <RutaProtegida permiso={puedeConfigurarEmpresa}>
                  <ConfiguracionPage />
                </RutaProtegida>
              }
            />

            <Route
              path="aprobaciones"
              element={
                <RutaProtegida permiso={puedeAprobarCompras}>
                  <AprobacionesListPage />
                </RutaProtegida>
              }
            />
            <Route
              path="aprobaciones/:id"
              element={
                <RutaProtegida permiso={puedeAprobarCompras}>
                  <AprobacionDetailPage />
                </RutaProtegida>
              }
            />

            <Route
              path="subasta/:procesoId"
              element={
                <RutaProtegida permiso={puedeGestionarCompras}>
                  <SubastaPage />
                </RutaProtegida>
              }
            />

            <Route
              path="evaluaciones"
              element={
                <RutaProtegida permiso={puedeEvaluar}>
                  <EvaluacionesListPage />
                </RutaProtegida>
              }
            />
            <Route
              path="evaluaciones/:id"
              element={
                <RutaProtegida permiso={puedeEvaluar}>
                  <EvaluacionDetailPage />
                </RutaProtegida>
              }
            />

            <Route
              path="adjudicaciones"
              element={
                <RutaProtegida permiso={puedeAprobarCompras}>
                  <AdjudicacionesListPage />
                </RutaProtegida>
              }
            />
            <Route
              path="adjudicaciones/:id"
              element={
                <RutaProtegida permiso={puedeAprobarCompras}>
                  <AdjudicacionDetailPage />
                </RutaProtegida>
              }
            />

            <Route
              path="auditoria"
              element={
                <RutaProtegida permiso={puedeAuditar}>
                  <AuditoriaListPage />
                </RutaProtegida>
              }
            />
            <Route
              path="auditoria/:id"
              element={
                <RutaProtegida permiso={puedeAuditar}>
                  <AuditoriaDetailPage />
                </RutaProtegida>
              }
            />

            <Route
              path="tenants"
              element={
                <RutaProtegida permiso={puedeGestionarTenants}>
                  <TenantsListPage />
                </RutaProtegida>
              }
            />
            <Route
              path="tenants/nuevo"
              element={
                <RutaProtegida permiso={puedeGestionarTenants}>
                  <TenantFormPage />
                </RutaProtegida>
              }
            />
            <Route
              path="tenants/:id"
              element={
                <RutaProtegida permiso={puedeGestionarTenants}>
                  <TenantFormPage />
                </RutaProtegida>
              }
            />

            <Route
              path="usuarios"
              element={
                <RutaProtegida permiso={puedeGestionarUsuarios}>
                  <UsuariosListPage />
                </RutaProtegida>
              }
            />
            <Route
              path="usuarios/nuevo"
              element={
                <RutaProtegida permiso={puedeGestionarUsuarios}>
                  <UsuarioFormPage />
                </RutaProtegida>
              }
            />
            <Route
              path="usuarios/:id"
              element={
                <RutaProtegida permiso={puedeGestionarUsuarios}>
                  <UsuarioFormPage />
                </RutaProtegida>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

// Pantalla de inicio: manda a cada rol a su sección principal.
function Inicio() {
  const { rol, usuario } = useAuth()

  if (puedeGestionarTenants(rol)) return <Navigate to="/tenants" replace />
  if (esProveedor(rol)) return <Navigate to="/proveedor" replace />
  if (puedeGestionarUsuarios(rol)) return <Navigate to="/usuarios" replace />
  if (puedeGestionarCompras(rol)) return <Navigate to="/compras" replace />
  if (puedeAprobarCompras(rol)) return <Navigate to="/aprobaciones" replace />
  if (puedeEvaluar(rol)) return <Navigate to="/evaluaciones" replace />
  if (puedeAuditar(rol)) return <Navigate to="/auditoria" replace />

  // Roles cuyo módulo todavía no está construido (comprador, evaluador, etc.):
  // en vez de mandarlos a una pantalla sin acceso, les damos una bienvenida.
  return (
    <div className="estado-vacio">
      <h2>Hola, {usuario.nombre}</h2>
      <p>Tu sección estará disponible próximamente.</p>
    </div>
  )
}
