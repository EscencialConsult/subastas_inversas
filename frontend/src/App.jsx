// Ruteo principal de la app.

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext.jsx'
import { RutaProtegida } from './auth/RutaProtegida.jsx'
import {
  puedeGestionarUsuarios,
  puedeGestionarTenants,
  esProveedor,
  puedeGestionarCompras,
  puedeAprobarAdjudicacion,
  puedeSupervisar,
  puedeVerProveedores,
  tienePanel,
} from './auth/permisos.js'
import { Layout } from './components/Layout.jsx'
import { LoginPage } from './features/auth/LoginPage.jsx'
import { UsuariosListPage } from './features/usuarios/UsuariosListPage.jsx'
import { UsuarioFormPage } from './features/usuarios/UsuarioFormPage.jsx'
import { TenantsListPage } from './features/tenants/TenantsListPage.jsx'
import { TenantFormPage } from './features/tenants/TenantFormPage.jsx'
import { EmpresaDetallePage } from './features/tenants/EmpresaDetallePage.jsx'
import { PerfilPage } from './features/perfil/PerfilPage.jsx'
import { PanelPage } from './features/dashboard/PanelPage.jsx'
import { RegistroProveedorPage } from './features/proveedor/RegistroProveedorPage.jsx'
import { ProveedorHomePage } from './features/proveedor/ProveedorHomePage.jsx'
import { ProcesosListPage } from './features/compras/ProcesosListPage.jsx'
import { ProcesoFormPage } from './features/compras/ProcesoFormPage.jsx'
import { AdjudicarPage } from './features/compras/AdjudicarPage.jsx'
import { ComprasRealizadasPage } from './features/compras/ComprasRealizadasPage.jsx'
import { ProveedoresDirectorioPage } from './features/proveedor/ProveedoresDirectorioPage.jsx'
import { SubastaPage } from './features/subasta/SubastaPage.jsx'
import { SubastasRealizadasPage } from './features/subasta/SubastasRealizadasPage.jsx'
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

            {/* Panel de inicio (dashboard) para roles internos. */}
            <Route
              path="panel"
              element={
                <RutaProtegida permiso={tienePanel}>
                  <PanelPage />
                </RutaProtegida>
              }
            />

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

            {/* --- Compras (Comprador) --- */}
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
              path="compras/:id/adjudicar"
              element={
                <RutaProtegida permiso={puedeGestionarCompras}>
                  <AdjudicarPage />
                </RutaProtegida>
              }
            />

            <Route
              path="compras-realizadas"
              element={
                <RutaProtegida permiso={puedeGestionarCompras}>
                  <ComprasRealizadasPage />
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

            {/* --- Directorio de proveedores (comprador / supervisión) --- */}
            <Route
              path="proveedores"
              element={
                <RutaProtegida permiso={puedeVerProveedores}>
                  <ProveedoresDirectorioPage />
                </RutaProtegida>
              }
            />

            {/* --- Aprobación de adjudicaciones (Autoridad) --- */}
            <Route
              path="adjudicaciones"
              element={
                <RutaProtegida permiso={puedeAprobarAdjudicacion}>
                  <AdjudicacionesListPage />
                </RutaProtegida>
              }
            />
            <Route
              path="adjudicaciones/:id"
              element={
                <RutaProtegida permiso={puedeAprobarAdjudicacion}>
                  <AdjudicacionDetailPage />
                </RutaProtegida>
              }
            />

            {/* --- Subastas realizadas (supervisión) --- */}
            <Route
              path="subastas"
              element={
                <RutaProtegida permiso={puedeSupervisar}>
                  <SubastasRealizadasPage />
                </RutaProtegida>
              }
            />

            {/* --- Auditoría (Auditor) --- */}
            <Route
              path="auditoria"
              element={
                <RutaProtegida permiso={puedeSupervisar}>
                  <AuditoriaListPage />
                </RutaProtegida>
              }
            />
            <Route
              path="auditoria/:id"
              element={
                <RutaProtegida permiso={puedeSupervisar}>
                  <AuditoriaDetailPage />
                </RutaProtegida>
              }
            />

            {/* --- Empresas (Super-admin) --- */}
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
              path="tenants/:id/detalle"
              element={
                <RutaProtegida permiso={puedeGestionarTenants}>
                  <EmpresaDetallePage />
                </RutaProtegida>
              }
            />

            {/* --- Usuarios (Administrador de empresa) --- */}
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

// Pantalla de inicio: el proveedor va a su cuenta; el resto, al panel.
function Inicio() {
  const { rol } = useAuth()
  if (esProveedor(rol)) return <Navigate to="/proveedor" replace />
  return <Navigate to="/panel" replace />
}
