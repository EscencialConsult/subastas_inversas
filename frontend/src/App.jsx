// Ruteo principal de la app.

import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { RutaProtegida } from './auth/RutaProtegida'
import {
  puedeGestionarUsuarios,
  puedeGestionarConfiguracion,
  puedeGestionarTenants,
  esProveedor,
  puedeGestionarCompras,
  puedeAprobarAdjudicacion,
  puedeSupervisar,
  puedeVerProveedores,
  tienePanel,
  puedeEvaluar,
} from './auth/permisos'
import { Layout } from './components/Layout.jsx'
import { Spinner } from './components/ui/Spinner.jsx'

// Lazy loaded page components (named exports wrapped in lazy)
const LoginPage = lazy(() => import('./features/auth/LoginPage.jsx').then(m => ({ default: m.LoginPage })))
const UsuariosListPage = lazy(() => import('./features/usuarios/UsuariosListPage.jsx').then(m => ({ default: m.UsuariosListPage })))
const UsuarioFormPage = lazy(() => import('./features/usuarios/UsuarioFormPage.jsx').then(m => ({ default: m.UsuarioFormPage })))
const TenantsListPage = lazy(() => import('./features/tenants/TenantsListPage.jsx').then(m => ({ default: m.TenantsListPage })))
const TenantFormPage = lazy(() => import('./features/tenants/TenantFormPage.jsx').then(m => ({ default: m.TenantFormPage })))
const EmpresaDetallePage = lazy(() => import('./features/tenants/EmpresaDetallePage.jsx').then(m => ({ default: m.EmpresaDetallePage })))
const PerfilPage = lazy(() => import('./features/perfil/PerfilPage.jsx').then(m => ({ default: m.PerfilPage })))
const PanelPage = lazy(() => import('./features/dashboard/PanelPage.jsx').then(m => ({ default: m.PanelPage })))
const RegistroProveedorPage = lazy(() => import('./features/proveedor/RegistroProveedorPage.jsx').then(m => ({ default: m.RegistroProveedorPage })))
const ProveedorHomePage = lazy(() => import('./features/proveedor/ProveedorHomePage.jsx').then(m => ({ default: m.ProveedorHomePage })))
const ProveedorOportunidadesPage = lazy(() => import('./features/proveedor/ProveedorOportunidadesPage.jsx').then(m => ({ default: m.ProveedorOportunidadesPage })))
const ProveedorSubastaLivePage = lazy(() => import('./features/proveedor/ProveedorSubastaLivePage.jsx').then(m => ({ default: m.ProveedorSubastaLivePage })))
const PortalLayout = lazy(() => import('./features/publico/PortalLayout.jsx').then(m => ({ default: m.PortalLayout })))
const PortalPublicoPage = lazy(() => import('./features/publico/PortalPublicoPage.jsx').then(m => ({ default: m.PortalPublicoPage })))
const ProcesoPublicoPage = lazy(() => import('./features/publico/ProcesoPublicoPage.jsx').then(m => ({ default: m.ProcesoPublicoPage })))
const SubastaPublicaPage = lazy(() => import('./features/publico/SubastaPublicaPage.jsx').then(m => ({ default: m.SubastaPublicaPage })))
const ProcesosListPage = lazy(() => import('./features/compras/ProcesosListPage.jsx').then(m => ({ default: m.ProcesosListPage })))
const ProcesoFormPage = lazy(() => import('./features/compras/ProcesoFormPage.jsx').then(m => ({ default: m.ProcesoFormPage })))
const AdjudicarPage = lazy(() => import('./features/compras/AdjudicarPage.jsx').then(m => ({ default: m.AdjudicarPage })))
const ComprasRealizadasPage = lazy(() => import('./features/compras/ComprasRealizadasPage.jsx').then(m => ({ default: m.ComprasRealizadasPage })))
const ProveedoresDirectorioPage = lazy(() => import('./features/proveedor/ProveedoresDirectorioPage.jsx').then(m => ({ default: m.ProveedoresDirectorioPage })))
const EvaluacionProveedoresPage = lazy(() => import('./features/proveedor/EvaluacionProveedoresPage.jsx').then(m => ({ default: m.EvaluacionProveedoresPage })))
const EvaluacionListPage = lazy(() => import('./features/evaluacion/EvaluacionListPage.jsx').then(m => ({ default: m.EvaluacionListPage })))
const EvaluacionProcesoPage = lazy(() => import('./features/evaluacion/EvaluacionProcesoPage.jsx').then(m => ({ default: m.EvaluacionProcesoPage })))
const CalificacionListPage = lazy(() => import('./features/calificacion/CalificacionListPage.jsx').then(m => ({ default: m.CalificacionListPage })))
const CalificacionProcesoPage = lazy(() => import('./features/calificacion/CalificacionProcesoPage.jsx').then(m => ({ default: m.CalificacionProcesoPage })))
const CalificacionProveedorPage = lazy(() => import('./features/calificacion/CalificacionProveedorPage.jsx').then(m => ({ default: m.CalificacionProveedorPage })))
const SubastaPage = lazy(() => import('./features/subasta/SubastaPage.jsx').then(m => ({ default: m.SubastaPage })))
const SubastasRealizadasPage = lazy(() => import('./features/subasta/SubastasRealizadasPage.jsx').then(m => ({ default: m.SubastasRealizadasPage })))
const AdjudicacionesListPage = lazy(() => import('./features/adjudicaciones/AdjudicacionesListPage.jsx').then(m => ({ default: m.AdjudicacionesListPage })))
const AdjudicacionDetailPage = lazy(() => import('./features/adjudicaciones/AdjudicacionDetailPage.jsx').then(m => ({ default: m.AdjudicacionDetailPage })))
const AuditoriaListPage = lazy(() => import('./features/auditoria/AuditoriaListPage.jsx').then(m => ({ default: m.AuditoriaListPage })))
const AuditoriaDetailPage = lazy(() => import('./features/auditoria/AuditoriaDetailPage.jsx').then(m => ({ default: m.AuditoriaDetailPage })))
const ConfiguracionPage = lazy(() => import('./features/configuracion/ConfiguracionPage.jsx').then(m => ({ default: m.ConfiguracionPage })))

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<div className="flex justify-center py-12"><Spinner size="lg" /></div>}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            {/* Registro de proveedor: público, sin sesión. */}
            <Route path="/registro-proveedor" element={<RegistroProveedorPage />} />

            {/* Portal ciudadano: público, sin sesión. */}
            <Route element={<PortalLayout />}>
              <Route path="/portal" element={<PortalPublicoPage />} />
              <Route path="/portal/procesos/:procesoId" element={<ProcesoPublicoPage />} />
              <Route path="/portal/subasta/:procesoId" element={<SubastaPublicaPage />} />
            </Route>

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
                path="configuracion"
                element={
                  <RutaProtegida permiso={puedeGestionarConfiguracion}>
                    <ConfiguracionPage />
                  </RutaProtegida>
                }
              />

              <Route
                path="proveedor"
                element={
                  <RutaProtegida permiso={esProveedor}>
                    <ProveedorHomePage />
                  </RutaProtegida>
                }
              />
              <Route
                path="proveedor/oportunidades"
                element={
                  <RutaProtegida permiso={esProveedor}>
                    <ProveedorOportunidadesPage />
                  </RutaProtegida>
                }
              />
              <Route
                path="proveedor/subastas/:auctionId"
                element={
                  <RutaProtegida permiso={esProveedor}>
                    <ProveedorSubastaLivePage />
                  </RutaProtegida>
                }
              />

              {/* --- Evaluación de proveedores (Evaluador) --- */}
              <Route
                path="evaluacion-proveedores"
                element={
                  <RutaProtegida permiso={puedeEvaluar}>
                    <EvaluacionProveedoresPage />
                  </RutaProtegida>
                }
              />

              {/* --- Evaluación de procesos con criterios (Evaluador) --- */}
              <Route
                path="evaluacion"
                element={
                  <RutaProtegida permiso={puedeEvaluar}>
                    <EvaluacionListPage />
                  </RutaProtegida>
                }
              />
              <Route
                path="evaluacion/:id"
                element={
                  <RutaProtegida permiso={puedeEvaluar}>
                    <EvaluacionProcesoPage />
                  </RutaProtegida>
                }
              />

              {/* --- Calificación de proveedores (Evaluador) --- */}
              <Route
                path="calificacion"
                element={
                  <RutaProtegida permiso={puedeEvaluar}>
                    <CalificacionListPage />
                  </RutaProtegida>
                }
              />
              <Route
                path="calificacion/:id"
                element={
                  <RutaProtegida permiso={puedeEvaluar}>
                    <CalificacionProcesoPage />
                  </RutaProtegida>
                }
              />
              <Route
                path="calificacion/:id/:invitationId"
                element={
                  <RutaProtegida permiso={puedeEvaluar}>
                    <CalificacionProveedorPage />
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
        </Suspense>
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
