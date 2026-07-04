# 02-07 - Registro de cambios de la sesion

Implemente el primer corte de la Fase 1: Cerrar Deuda Critica De Frontend.

Quedo hecho:

- Migre las paginas prioritarias fuera de la raiz de feature hacia `pages/`:
  - `ProveedorSubastaLivePage`
  - `PortalPublicoPage`
  - `ProcesoPublicoPage`
  - `SubastaPublicaPage`
  - `UsuariosListPage`
  - `TenantFormPage`
  - `PerfilPage`
  - `SubastaPage`
- Actualice las rutas para apuntar a la nueva estructura `pages/`.
- Converti a TSX y modernice con Design System:
  - `ProveedorSubastaLivePage`
  - `ProveedorSubastaLiveSections`
  - `SubastaPage`
  - `PortalPublicoPage`
- Elimine uso directo de `className="btn..."`, `className="form..."`, `className="tabla..."` en las features priorizadas revisadas.
- Agregue declarations TS para componentes legacy compartidos que aun eran JSX:
  - `Input.d.ts`
  - `Select.d.ts`
  - `EmptyState.d.ts`
- Tipe `resetPassword` para evitar `unknown`.
- Tipe errores basicos de `TenantFormPage` y normalice errores de formulario en `PerfilPage`.

Todas las paginas `*Page.jsx` de `frontend/src/features` fueron migradas a `*.tsx`.
Las paginas priorizadas quedaron movidas a estructura `pages/` por feature.
Elimine referencias legacy a `.btn`, `.form`, `.tabla`, `form__`, `tabla__`, `btn--` y `public-form__` dentro de features.
`Checkbox` y `StateViews` pasaron a TSX con contratos tipados.
Ajuste contratos implicitos que aparecieron al migrar: `AuthContext`, `Button`, `Table`, `proveedoresApi`, `useProcesos`.
Reemplace UI vieja por `PageShell`, `PageHeader`, `FormSection`, `FormActions`, `Button`, `Modal`, estados y clases basadas en tokens del Design System.

Migre a TanStack Query/mutations las pantallas que todavia tenian carga manual fuerte:

- Auditoria detalle
- Adjudicacion
- Subasta en vivo proveedor
- Evaluacion de proveedores
- Registro proveedor
- Directorio de proveedores

Tambien deje centralizados los `data/*.ts` y mutations para:

- usuarios
- tenants
- configuracion
- evaluacion
- calificacion
- adjudicaciones
- publico
- perfil
- dashboard
- proveedores
- procesos
- subastas

---

# 04-07 - Cambios agregados

## Resumen

Se completaron ajustes de frontend, backend, rendimiento y seguridad orientados a cerrar la migracion enterprise del proyecto. Los cambios principales se enfocaron en consolidar el Design System, normalizar llamadas API versionadas, robustecer background jobs, mejorar observabilidad, reducir deuda del `ApplicationDbContext` y corregir warnings de Entity Framework por consultas con multiples colecciones.

## Frontend

### Design System

Se agregaron nuevos patrones reutilizables en `frontend/src/shared/ui`:

- `FiltersBar`
- `TableToolbar`
- `RowActions`
- `DetailPanel`

Tambien se actualizaron los exports de `shared/ui/index.ts` para que estos componentes queden disponibles desde el barrel principal del Design System.

### Storybook

Se agrego documentacion de patrones en:

- `frontend/src/shared/ui/DesignSystemPatterns.stories.tsx`

La historia documenta escenarios estandar para:

- listados con filtros y toolbar
- formularios con secciones y acciones
- paneles de detalle
- estados empty/error/loading

### Eliminacion de estilos legacy

Se reforzo `frontend/eslint.config.js` para bloquear nuevas clases legacy:

- `.btn`
- `.form`
- `.tabla`
- variantes `__`
- variantes `--`
- `tabla-contenedor`

Tambien se limpio `frontend/src/index.css` removiendo reglas legacy asociadas a botones, tablas y formularios que ya fueron reemplazadas por componentes del Design System.

### API client versionado

Se corrigio el error de login `404 Not Found` causado por llamadas del frontend a rutas sin versionar.

Archivo actualizado:

- `frontend/src/shared/api/client.ts`

Ahora `apiFetch` normaliza automaticamente:

- `/api/auth/login` -> `/api/v1/auth/login`
- `/api/companies/...` -> `/api/v1/companies/...`
- `/api/v1/...` queda sin cambios

Esto evita tener que corregir endpoint por endpoint y alinea el frontend con `ApiVersionRouteConvention` del backend.

## Backend

### Rate limiting de autenticacion

Se agregaron politicas de rate limiting para endpoints sensibles:

- login
- verificacion MFA
- refresh token

Archivos actualizados:

- `backend/src/SICST.Api/Program.cs`
- `backend/src/SICST.Api/Controllers/AuthController.cs`
- `backend/src/SICST.Api/Security/RateLimitPolicies.cs`

Politicas agregadas:

- `auth-login`
- `auth-mfa`
- `auth-refresh`

### ApplicationDbContext reducido

Se movieron los filtros globales multi-tenant fuera de `ApplicationDbContext`.

Archivos actualizados:

- `backend/src/SICST.Persistence/Contexts/ApplicationDbContext.cs`
- `backend/src/SICST.Persistence/Contexts/TenantQueryFilters.cs`

El contexto queda mas enfocado en `DbSet` y configuracion minima, mientras que los filtros multiempresa quedan encapsulados en una extension especifica.

### Outbox y background jobs

Se agregaron metricas operativas al dispatcher de outbox.

Archivo actualizado:

- `backend/src/SICST.Api/Services/OutboxDispatcherService.cs`

Metricas agregadas:

- mensajes reclamados
- mensajes procesados
- mensajes fallidos
- duracion del dispatch

Esto mejora la observabilidad de jobs en segundo plano y deja preparada la base para dashboards y alertas.

### Rendimiento EF en scheduler de subastas

Se corrigio el warning de EF Core `MultipleCollectionIncludeWarning` detectado en logs.

Archivo actualizado:

- `backend/src/SICST.Api/Services/AuctionSchedulerService.cs`

Cambios:

- se agrego `AsSplitQuery()` a las consultas que cargan `Participants` y `Bids`
- se evito el riesgo de cartesian explosion al abrir/cerrar subastas
- se elimino una query adicional por proceso usando la navegacion `auction.PurchaseProcess` ya incluida

## Seguridad y observabilidad

Se confirmo que el backend ya cuenta con:

- `SecurityHeadersMiddleware`
- CSP
- `X-Content-Type-Options`
- `Referrer-Policy`
- HSTS en entorno no development
- health checks para database, Redis, storage y antivirus
- validacion de magic bytes PDF
- refresh token rotativo y revocacion
- trazabilidad por `X-Trace-Id`
- metricas HTTP por endpoint

Se reforzo la seguridad agregando rate limiting a endpoints de autenticacion.

## Validaciones ejecutadas

Frontend:

- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run build`

Resultado:

- typecheck correcto
- lint correcto con 0 errores
- build correcto
- quedan warnings preexistentes de lint
- build mantiene warnings conocidos de SignalR en `node_modules`

Backend:

- `dotnet test backend/tests/SICST.Tests/SICST.Tests.csproj -p:UseAppHost=false`

Resultado:

- 104 tests superados
- 4 tests omitidos
- 0 errores

Nota: se uso `UseAppHost=false` porque habia una instancia local de `SICST.Api.exe` ejecutandose y bloqueando la copia del binario durante `dotnet test`.

## Pendientes observados

- Actualizar `SQLitePCLRaw.lib_e_sqlite3` o dependencia relacionada, porque `dotnet test` reporta una vulnerabilidad alta conocida.
- Reducir warnings de lint pendientes: `any`, `setState` sincronico en efectos y `react-refresh/only-export-components`.
- Revisar advertencias de SignalR/Rolldown en build para decidir si se ignoran, se documentan o se mitigan con configuracion de bundler.
