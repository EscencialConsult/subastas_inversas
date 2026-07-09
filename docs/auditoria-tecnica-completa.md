# Auditoria tecnica completa - SICST

Fecha: 2026-07-09  
Alcance: frontend React/TypeScript/Vite/Tailwind, backend .NET 10/ASP.NET Core, EF Core/PostgreSQL, integracion API, UI/UX, seguridad, rendimiento, testing y preparacion para produccion.

> Nota: el prompt original menciona SQL Server, pero el repositorio usa PostgreSQL con Npgsql. La auditoria evalua la base real.

## Resumen ejecutivo

SICST tiene una base arquitectonica superior a la media para un proyecto en evolucion: separa backend en capas tipo Clean Architecture, usa MediatR, EF Core, policies de autorizacion, JWT, rate limiting por endpoint, SignalR, health checks, tests backend y E2E frontend. El frontend fue migrado completamente a TypeScript (147 componentes `.tsx`, 0 `.jsx` restantes) con `tsconfig` estricto, y se implemento FSD (Feature-Sliced Design) en la organizacion de carpetas. Existe un design system con tokens Tailwind, 56 componentes en `shared/ui` y un Storybook de patrones que documenta paleta, spacing, typography y composicion de listados/formularios/detalles.

El riesgo principal no es falta de arquitectura, sino inconsistencia y deuda acumulada alrededor de produccion: secretos y claves de firma hardcodeadas (incluyendo password de base de datos Neon y 3 claves HMAC constantes), archivos de clientes API todavia grandes con uso de `any`, CSS global todavia extenso (aunque se redujo 270 lineas de legacy), estilos inline, servicios background configurados para ignorar excepciones y consultas que cargan grafos completos donde deberian proyectar.

Mi veredicto: **no lo aprobaria para produccion sin un hardening corto de seguridad/configuracion y sin estabilizar verificacion automatica**, pero si lo considero una base viable para llegar rapido a produccion con un plan disciplinado. Los avances recientes en TypeScript, rate limiting y design system muestran momentum positivo.

## Evidencia relevada

- `frontend/src/index.css` tiene 2220 lineas (se eliminaron 270 lineas de CSS legacy: `btn`, `btn--*`, `tabla`, `.tabla`, `.form`, `.tabla-contenedor`). Persisten duplicaciones de wizard/timeline, `!important` y colores hardcodeados.
- Frontend completamente en TypeScript: 147 `.tsx`, 0 `.jsx`. `tsconfig.json` con `strict: true`, `noUnusedLocals`, `noUnusedParameters`, `allowJs: false`.
- `shared/ui` tiene 56 componentes, incluyendo 5 nuevos: `FiltersBar`, `TableToolbar`, `RowActions`, `DetailPanel`, `ConnectionStatus`. `Table` fue reescrito como componente generico tipado con sorting, paginacion y aria-sort.
- `DesignSystemPatterns.stories.tsx` documenta paleta oficial, escala de espaciado, escala tipografica y patrones de composicion (listado con filtros, formulario estandar, panel de detalle).
- Archivos frontend grandes: `comprasApi.ts` 1031 LOC, `useProcesoForm.ts` 657 LOC.
- Archivos backend grandes: `PdfGenerator.cs` 651 LOC, `VerifyIntegrityQuery.cs` 410 LOC, controllers de procesos/proveedores cerca de 400 LOC.
- ESLint: regla `@typescript-eslint/no-explicit-any: warn` para `.ts/.tsx`, mas restricciones existentes de clases legacy `.btn`, `.form`, `.tabla` y colores arbitrarios en `className`.
- Backend: rate limiting implementado con politicas fijas por IP para Login (5/min), MFA (5/2min) y Refresh (20/min), aplicado via `[EnableRateLimiting]` en `AuthController`.
- Backend: `TenantQueryFilters` extraido a clase dedicada con filtros por 13 entidades.
- Backend: soporte SQLite eliminado del `DependencyInjection.cs`, solo PostgreSQL/Npgsql con retry on failure. `DATABASE_URL` soportado como alternativa al connection string.
- `appsettings.Development.json` contiene password de Neon PostgreSQL expuesta y JWT secret hardcodeado.
- 3 claves HMAC hardcodeadas: `VerifyIntegrityQuery.cs` (linea 19), `ExportSignedAuditCsvQuery.cs` (linea 15), `SignEvaluationActCommand.cs` (linea 106).
- `client.ts` mejorado con `ApiError` (status code), parsing de `ProblemDetails`, y body normalizado. Sin refresh/retry coordinado ni correlation id.
- `dashboardApi.ts` tipado con interfaces `PanelMetric`, `PanelChart`, `PanelFeedItem`, `PanelData`.
- Inline styles presentes en ~13 archivos (`Collapsible`, `DataTable`, `Modal`, `SignaturePad`, `ProgressBar`, `Stepper`, `Dashboard`, stories). La mayoria son valores dinamicos razonables.
- Hay tests backend relevantes: arquitectura, auth, subastas, auditoria, seguridad, integracion tenant y portal publico.
- Hay E2E frontend: formularios criticos, teclado, responsive, roles y flujo SICST.

## Hallazgos prioritarios

### 1. Secretos y claves criptograficas hardcodeadas

Prioridad: Roja - Critica

Problema: Hay datos sensibles o claves constantes en configuracion/codigo:
- Password de Neon PostgreSQL en `appsettings.Development.json` linea 9.
- JWT secret hardcodeado en `appsettings.Development.json` linea 15.
- Clave HMAC en `VerifyIntegrityQuery.cs` linea 19: `"SICST_Evaluation_Act_Signing_Secret_Key_2026"`.
- Clave HMAC en `ExportSignedAuditCsvQuery.cs` linea 15: `"SICST_Audit_Csv_Signing_Secret_Key_2026"`.
- Clave HMAC en `SignEvaluationActCommand.cs` linea 106: `"SICST_Evaluation_Act_Signing_Secret_Key_2026"`.

Impacto: Si el repositorio se comparte, se filtran credenciales de base de datos. Las firmas HMAC dejan de probar integridad si la clave esta versionada. En produccion esto compromete auditoria, documentos y datos fiscales/ARCA.

Solucion: mover secretos a user-secrets, variables de entorno o secret manager. Crear interfaces como `IAuditSigningService` y `IIntegritySigningOptions`. Rotar credenciales expuestas y evitar que development contenga secretos reales.

Ejemplo:

```csharp
public sealed class AuditSigningOptions
{
    public required string SigningKey { get; init; }
}
```

### 2. Servicios background ignoran excepciones

Prioridad: Naranja - Alta

Problema: `Program.cs` configura `BackgroundServiceExceptionBehavior.Ignore`. Esto evita caidas por errores transitorios, pero tambien puede dejar procesos criticos muertos o degradados sin alarma.

Impacto: Subastas, ARCA y outbox podrian dejar de ejecutarse sin que el sistema falle visiblemente. En una plataforma de contratacion publica esto es riesgo operacional alto.

Solucion: reemplazar por resiliencia explicita: try/catch dentro de cada worker, metricas, health degraded, alertas y reintentos con backoff. Mantener `Ignore` solo si hay watchdog/observabilidad.

### 3. Design system incompleto y CSS global excesivo

Prioridad: Naranja - Alta (reducida desde Alta pura)

Problema: Se avanzo significativamente: se eliminaron 270 lineas de CSS legacy (utilidades `btn`, `tabla`, `.form`, `.tabla-contenedor`), se reescribio `Table` como componente generico tipado, se agregaron 5 componentes nuevos (`FiltersBar`, `TableToolbar`, `RowActions`, `DetailPanel`, `ConnectionStatus`) y `DesignSystemPatterns.stories.tsx` documenta patrones oficiales. Sin embargo, `index.css` todavia tiene 2220 lineas con duplicaciones (`wizard-*`, `timeline-*`), `!important`, colores directos y estilos especificos de paginas.

Impacto: La UI es mas mantenible que antes, pero los cambios de marca/tema por tenant siguen fragiles. Las paginas grandes todavia pueden desviarse visualmente.

Solucion: completar migracion de componentes recurrentes a `shared/ui`: `Wizard`, `Timeline`, `MetricCard`, `PublicCard`. Retirar las duplicaciones restantes de `wizard-*` y `timeline-*`. Reducir `index.css` a tokens/base/utilidades minimas.

### 4. Tipado frontend incompleto en clientes API

Prioridad: Amarilla - Media (reducida desde Naranja)

Problema: `client.ts` y `dashboardApi.ts` estan correctamente tipados. Se agrego regla ESLint `@typescript-eslint/no-explicit-any: warn`. Sin embargo, `comprasApi.ts` (1031 LOC) todavia tiene uso extendido de `any` en mappers (`mapAward`, `mapContract`, `mapContractPayment`, `mapPurchaseOrder`, `mapReception`, `mapInvitacion`, `mapCalificacion`, etc.) y en tipos de parametros (`criteria: any[]`, `supplierEvaluations: any[]`).

Impacto: Cambios del backend pueden romper pantallas sin que TypeScript avise. La capa mas importante para integracion queda parcialmente subtipada, aunque el resto del frontend ya esta bien tipado.

Solucion: usar tipos generados desde OpenAPI como fuente de verdad. Donde haya mappers, tipar input/output con DTOs concretos y validar respuestas riesgosas con Zod si vienen de endpoints publicos o externos.

Ejemplo:

```ts
type PurchaseProcessDto = components['schemas']['PurchaseProcessDto']

export async function obtenerProceso(...): Promise<PurchaseProcessDto> {
  return apiFetch<PurchaseProcessDto>(endpoint)
}
```

### 5. Archivos grandes mezclan responsabilidades

Prioridad: Amarilla - Media

Problema: `useProcesoForm.ts` concentra estado, persistencia local, navegacion de wizard, guardado, documentos y subasta. `comprasApi.ts` concentra demasiados endpoints/mappers. En backend, `PdfGenerator.cs`, `VerifyIntegrityQuery.cs` y algunos controllers superan el tamano razonable.

Impacto: Baja mantenibilidad, mayor probabilidad de regresiones, tests mas dificiles y poca reutilizacion.

Solucion: dividir por subdominio y responsabilidad:
- `useProcesoWizardState`, `useProcesoPersistence`, `useProcesoSubmit`, `useAuctionDraftConfig`.
- `shared/api/compras/{procesos,contratos,evaluacion,adjudicacion}.ts`.
- `VerifyIntegrityQuery` en verificadores independientes: audit chain, bid chain, actas, adjudicaciones, contratos.
- `PdfGenerator` en plantillas/renderers por documento.

### 6. Consultas EF cargan grafos completos en flujos de lectura

Prioridad: Amarilla - Media

Problema: Varias queries usan `Include` amplio y luego mapean en memoria. Ejemplos: snapshots publicos, OCDS, integridad, subasta, procesos, adjudicacion. Algunas lecturas no usan `AsNoTracking`. `IgnoreQueryFilters` se usa en `VerifyIntegrityQuery.cs` (linea 49), `AuditSaveChangesInterceptor.cs` (lineas 54, 61) y `DatabaseInitializer.cs` (lineas 126, 185).

Impacto: Mas memoria, queries pesadas, riesgo de N+1 indirecto y degradacion con volumen real.

Solucion: usar proyecciones `Select` a DTOs en lecturas, `AsNoTracking` por defecto en queries, `AsSplitQuery` cuando haya multiples colecciones, paginacion obligatoria en listados y limites en exports/verificaciones.

### 7. Integridad/auditoria con firma no gestionada como secreto

Prioridad: Naranja - Alta

Problema: La auditoria encadenada y firmas son una fortaleza del sistema, pero parte de la verificacion usa HMAC con claves constantes (3 claves confirmadas, ver hallazgo #1). Tambien hay verificaciones que leen toda la tabla (`AuditEvents.IgnoreQueryFilters().OrderBy(...).ToListAsync`).

Impacto: La promesa de auditoria "tamper-proof" queda debilitada y puede volverse lenta al crecer.

Solucion: claves versionadas en secret manager, rotacion con `KeyId`, firmas por tenant, job offline/asincronico para verificacion completa, endpoints paginados para verificacion incremental.

### 8. Inline styles y excepciones al design system

Prioridad: Amarilla - Media

Problema: Hay ~13 instancias de estilos inline en `Collapsible` (rotate, gridTemplateRows), `DataTable` (width dinamico), `Modal` (maxWidth dinamico), `SignaturePad` (background + touchAction), `ProgressBar` (width porcentaje), `Stepper` (scaleX dinamico), `Dashboard` (width) y stories (demo visual). La mayoria son valores dinamicos razonables que no pueden expresarse con clases estaticas.

Impacto: Rompe consistencia nominal, pero la mayoria son justificables tecnicamente. Las excepciones son en stories (demo) y valores calculados.

Solucion: permitir inline solo para valores realmente dinamicos documentados (`width: ${percent}%`, canvas touch action, maxWidth por breakpoint). Reemplazar el resto por CSS variables/clases data-state. Documentar las excepciones permitidas en la guia de componentes.

Ejemplo:

```tsx
<div className="progress-bar" style={{ '--progress': `${percent}%` } as CSSProperties} />
```

Preferible si la regla se mantiene estricta: clases predefinidas para estados discretos.

### 9. Estado critico persistido en localStorage

Prioridad: Amarilla - Media

Problema: El wizard de compras persiste pasos, documentos y configuracion de subasta en `localStorage`.

Impacto: Puede quedar estado obsoleto, mezclarse entre usuarios del mismo navegador o divergir del backend. Para compras publicas, la fuente de verdad debe ser servidor.

Solucion: usar localStorage solo como borrador explicito y no como estado canonico. Namespacing por tenant/user/process, expiracion, limpieza al cerrar/publicar y preferir autosave backend para formularios largos.

### 10. API client central correcto pero incompleto para produccion

Prioridad: Amarilla - Media

Problema: `apiFetch` normaliza `/api` a `/api/v1`, maneja bearer y errores con `ApiError` (status code) y parsing de `ProblemDetails` (message, errors array, title). Falta refresh/retry coordinado, correlation id, manejo uniforme de validation errors por campo y cancelacion.

Impacto: UX inconsistente ante errores, dificultad de observabilidad end-to-end y riesgo de loops si expira token.

Solucion: agregar soporte de `traceId` desde headers de respuesta, interceptor de 401/refresh centralizado y convenciones de error por campo para formularios.

### 11. Preparacion responsive y accesibilidad parcial

Prioridad: Amarilla - Media

Problema: Hay E2E responsive, `skip-link`, focus visible, componentes compartidos. La tabla generica incluye `aria-sort`. Pero hay UI densa con wizards, modales/dropdowns y estados dinamicos que requieren auditoria manual de teclado/lector.

Impacto: Usuarios con teclado o baja vision pueden trabarse en flujos de compra/subasta.

Solucion: checklist WCAG por componente shared: focus trap en modal, aria-expanded/controls en collapsible/dropdown, nombres accesibles para icon buttons, contraste de badges, navegacion de tablas y tests Playwright de teclado por flujo critico.

### 12. Testing bueno en backend, desigual en frontend

Prioridad: Amarilla - Media

Problema: Backend tiene tests de arquitectura, seguridad, auth, subastas, auditoria e integracion. Frontend tiene E2E, Storybook/Vitest y `DesignSystemPatterns.stories`, pero no se observa cobertura fuerte de hooks complejos ni clientes API.

Impacto: Refactors de UI y API pueden romper flujos sin feedback rapido.

Solucion: tests unitarios para hooks complejos (`useProcesoForm` dividido), mappers API, permisos/rutas y componentes shared. Mantener E2E solo para flujos de negocio, no para toda logica.

## Avances recientes

### Rate limiting en endpoints de autenticacion

Se implementaron politicas de rate limiting por IP con `FixedWindowRateLimiter`:
- Login: 5 requests por minuto (`RateLimitPolicies.Login`)
- MFA verify: 5 requests por 2 minutos (`RateLimitPolicies.Mfa`)
- Refresh token: 20 requests por minuto (`RateLimitPolicies.RefreshToken`)

Aplicado via `[EnableRateLimiting]` en `AuthController` para las rutas `/login`, `/mfa/verify` y `/refresh`. Se extrajo `GetClientPartitionKey` para particionar por IP (con soporte de `X-Forwarded-For`). Esto mitiga ataques de fuerza bruta y abuso de tokens.

### TenantQueryFilters extraido

Los query filters de multi-tenancy fueron extraidos de `ApplicationDbContext` a una clase dedicada `TenantQueryFilters` en `SICST.Persistence/Contexts/TenantQueryFilters.cs`. Aplica filtros por `CompanyId` en 13 entidades: `User`, `CompanySupplier`, `ContractingMode`, `ApprovalWorkflow`, `DocumentTemplate`, `CompanyConfiguration`, `PurchaseProcess`, `Auction`, `AuditEvent`, `Contract`, `ContractPayment`, `PurchaseOrder`, `AccessLog`. Mejora mantenibilidad y testabilidad de los filtros de tenant.

### Eliminacion de soporte SQLite dual

Se elimino el soporte condicional de SQLite del `DependencyInjection.cs`. Ahora solo se configura PostgreSQL/Npgsql con retry on failure (5 reintentos, 10s delay). Esto simplifica el codigo y elimina riesgo de confusion en configuracion. Se agrego soporte para `DATABASE_URL` como alternativa al connection string tradicional.

### Migracion completa a TypeScript

Todo el frontend fue migrado de JSX a TSX (147 archivos `.tsx`, 0 `.jsx`). Se configuro `tsconfig.json` con `strict: true`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch` y `allowJs: false`. Se agrego regla ESLint `@typescript-eslint/no-explicit-any: warn`. `client.ts` y `dashboardApi.ts` fueron tipados completamente. La tabla generica `Table` fue reescrita en TypeScript con genericos, sorting, paginacion y accesibilidad.

### Eliminacion parcial de CSS legacy

Se eliminaron 270 lineas de `index.css`: utilidades `btn`, `btn--primario`, `btn--secundario`, `btn--texto`, `btn--texto-peligro`, `btn--peligro`, `btn--full`, `btn--chico`, `btn--icono`, `tabla` (utility y clase), `.form`, `.form__titulo`, `.form__subtitulo`, `.form__acciones`, `.form__seccion`, `.tabla-contenedor`, `.tabla__acciones`, `.tabla__nota`, y selectores compuestos (`.login .btn--primario`, `.panel-lista h2.form__titulo`, `.panel-acciones .btn`, `.hero__actions .btn`, `.card__action .btn`, `.auditoria-expediente .tabla`).

## Frontend

Arquitectura: buena separacion por `app`, `auth`, `features`, `shared`, `domain`. FSD implementado. El enrutado esta centralizado y usa lazy para `Layout`, pero podria aplicar lazy por feature para bajar bundle inicial. El estado remoto deberia estandarizarse mas alrededor de React Query; hoy hay mezcla de API clients, local state y localStorage.

Componentes: hay una libreria `shared/ui` amplia (56 componentes) con 5 componentes nuevos (`FiltersBar`, `TableToolbar`, `RowActions`, `DetailPanel`, `ConnectionStatus`). `Table` fue reescrito como generico tipado. Las paginas grandes indican responsabilidades mezcladas. Priorizar extracciones en proveedor, auditoria, evaluacion, portal publico y compras.

Design system: existe base solida con tokens de color, radio, spacing, sombras y tipografia en `index.css`, mas componentes compartidos. `DesignSystemPatterns.stories.tsx` documenta paleta oficial, espaciado y tipografia. Se avanzo en eliminacion de CSS legacy pero quedan duplicaciones en `wizard-*` y `timeline-*`. Unificar botones, inputs, tablas, cards, modales, badges, alertas, forms, tooltips, loaders y skeletons exclusivamente en `shared/ui`.

Colores: paleta base sobria y adecuada para SaaS gubernamental: azul primario, slate, estados semanticos. Problema: colores directos repetidos (`#3b82f6`, `#8b5cf6`, `#f59e0b`, `#10b981`, `#06b6d4`, rgba). Agregar tokens para chart/accent colors y evitar hex fuera de `@theme`.

Tipografia: `Source Sans 3` es buena para interfaz densa. Falta consolidar escala aplicada: hay `h1` global, utilities legacy y tamaños locales. Definir `PageTitle`, `SectionTitle`, `CardTitle`, `Body`, `Caption`.

Espaciado: hay escala `spacing-ui-*`, pero tambien muchas clases `gap-*`, `mt-*`, padding legacy y componentes con valores propios. Consolidar en componentes y evitar utilidades custom que duplican Tailwind.

Tailwind: el proyecto usa Tailwind 4 correctamente, pero `index.css` todavia intenta funcionar como mini framework paralelo. Reducir a tokens/base y componentes que realmente no puedan vivir en React.

Animaciones: hay transiciones y animaciones basicas, pero falta guia: duraciones, easing, reduced motion y estados coherentes para hover/focus/modal/dropdown/toast.

Responsive: hay specs E2E, pero revisar manualmente tablas, wizard de compras, subasta live y portal publico. Las tablas deben tener estrategia mobile clara: columnas prioritarias, cards compactas o overflow controlado. La tabla generica `Table` ya maneja `overflow-x-auto`.

UX: fortalezas en estados vacios/componentes y portal publico. Riesgos en flujos largos: guardado de borradores, errores por campo, recuperacion de sesion, feedback de subasta en tiempo real y consistencia de permisos.

Rendimiento: aplicar code splitting por feature, memoizar tablas/listas pesadas solo luego de medir, y evitar mappers grandes en render. React Query debe normalizar stale times e invalidaciones.

Accesibilidad: buena base con `aria-sort` en tabla, `skip-link`, focus visible. Necesita endurecimiento en modales, dropdowns, tabs, collapsibles, icon buttons y subasta live con regiones `aria-live` cuidadas.

## Backend

Arquitectura: la separacion en Api/Application/Domain/Infrastructure/Persistence es correcta. Los controllers son razonablemente finos, aunque algunos crecieron demasiado. MediatR y behaviors son buena eleccion para escalar. Se extrajo `TenantQueryFilters` a clase dedicada.

Clean Architecture: hay tests de arquitectura, pero son pocos y no cubren todas las capas. Expandir reglas: Domain sin dependencias, Application sin Infrastructure/Persistence, Api no accede a DbContext salvo casos justificados, modules sin dependencias circulares.

Codigo: fuerte en intencion de dominio, pero algunos handlers/verificadores son largos. Evitar instanciar handlers manualmente dentro de handlers (`new GetRiskDashboardQueryHandler(_context)`, `new GetRiskAlertsQueryHandler(_context)`, `new VerifyIntegrityQueryHandler(_context)` en `GetRiskDashboardQuery.cs` y `ExportSignedAuditCsvQuery.cs`) y usar servicios/composicion inyectada.

Entity Framework: necesita disciplina de lectura: `AsNoTracking`, proyecciones DTO, paginacion y `AsSplitQuery`. Revisar indices por filtros frecuentes: tenant/company, status, dates, supplier, auction status, audit sequence.

API: REST practico con versionado por convencion y Swagger. Rate limiting implementado en endpoints de autenticacion. Mejorar consistencia de `ProblemDetails`, codigos HTTP, errores de validacion y versionado visible en documentacion.

Seguridad: buenas bases: JWT, policies, rate limiting en auth, BCrypt, security headers, upload security, audit exclusions para secretos. Riesgos: secretos hardcodeados (Neon password, JWT secret, 3 claves HMAC), NoOp antivirus por default, data protection en temp para dev, query token en SignalR.

Errores/logging: existe middleware de errores y JSON console. Agregar correlation id visible en respuesta, niveles de error por dominio y redaccion de mensajes para no filtrar detalles internos.

Rendimiento: services background y SignalR deben tener metricas. Outbox batch y subasta lock son buenos. Revisar caching real de snapshots publicos, Redis health y degradacion si Redis no esta.

Base de datos: EF configurado con migraciones amplias. Soporte SQLite eliminado, solo PostgreSQL con retry on failure. `DATABASE_URL` soportado como alternativa. Riesgo en migraciones acumuladas y seeds con passwords demo; separar seed demo de seed productivo.

Testing: backend esta bien encaminado. Faltan pruebas de carga/concurrencia para lances, pruebas de autorizacion negativas por rol/tenant, y tests de resiliencia para workers/outbox.

## Integracion frontend-backend

El cliente central `apiFetch` es una buena base mejorada con `ApiError` (status code) y parsing de `ProblemDetails`. El contrato no esta plenamente tipado en la capa de features (ver hallazgo #4). La prioridad debe ser que cada endpoint critico tenga tipo generado, mapper probado y manejo uniforme de errores. Alinear validaciones frontend Zod con validators backend para evitar divergencias.

Recomendacion clave: publicar OpenAPI como contrato versionado en CI, generar tipos frontend en pipeline y fallar si hay breaking changes no revisados.

## Puntuaciones

| Area | Puntaje | Justificacion del cambio |
|---|---:|---|
| Arquitectura | 7.5/10 | Sin cambio |
| Frontend | 7.5/10 | +1.0: TS completo, FSD, Table reescrita, 5 componentes nuevos |
| Backend | 7.5/10 | Sin cambio |
| UI | 7/10 | +0.5: DesignSystemPatterns stories, nuevos componentes shared |
| UX | 6.5/10 | Sin cambio |
| Seguridad | 6/10 | +0.5: rate limiting en auth |
| Rendimiento | 6.5/10 | Sin cambio |
| Escalabilidad | 7/10 | Sin cambio |
| Mantenibilidad | 7/10 | +0.5: TenantQueryFilters, eliminacion de dual SQLite, Table reescrita |
| Calidad del codigo | 7/10 | +0.2: TS estricto, ESLint any=warn |
| Reutilizacion | 6.5/10 | +0.5: nuevos componentes reutilizables en shared/ui |
| Accesibilidad | 6/10 | Sin cambio |
| Preparacion para produccion | 6/10 | +0.5: rate limiting, eliminacion de soporte dual |

## Roadmap

### Completado

- [x] Rate limiting en endpoints de auth (login, MFA, refresh).
- [x] Migracion completa a TypeScript (147 `.tsx`, 0 `.jsx`).
- [x] Regla ESLint `@typescript-eslint/no-explicit-any: warn`.
- [x] Eliminacion parcial de CSS legacy (270 lineas: `btn`, `tabla`, `.form`).
- [x] `TenantQueryFilters` extraido a clase dedicada.
- [x] Eliminacion de soporte SQLite dual del DI.
- [x] Tabla generica reescrita en TypeScript con sorting, paginacion y accesibilidad.
- [x] `client.ts` mejorado con `ApiError` y parsing de `ProblemDetails`.
- [x] `dashboardApi.ts` tipado con interfaces de dominio.
- [x] `DesignSystemPatterns.stories.tsx` documentando paleta y patrones.
- [x] 5 componentes nuevos en `shared/ui`: `FiltersBar`, `TableToolbar`, `RowActions`, `DetailPanel`, `ConnectionStatus`.

### Mejoras rapidas (1-2 dias)

1. Rotar secretos expuestos y mover Neon password, JWT secret y claves HMAC a user-secrets/env vars/secret manager.
2. Documentar matriz de variables obligatorias por ambiente.
3. Ejecutar y estabilizar `npm run lint`, `npm run typecheck`, `npm run build`, `dotnet build` y `dotnet test`.
4. Corregir `BackgroundServiceExceptionBehavior.Ignore` con logging/health por worker o justificarlo explicitamente.
5. Marcar `NoOpAntivirusScanner` como solo desarrollo y fallar en produccion si no hay scanner real.
6. Eliminar Neon password de `appsettings.Development.json` y usar solo `DATABASE_URL` o user-secrets.

### Mejoras medias (1-2 semanas)

1. Dividir `useProcesoForm.ts` y `comprasApi.ts` por responsabilidades.
2. Completar migracion de `wizard`, `timeline`, `metric cards` y `public cards` a `shared/ui`.
3. Reducir `index.css` a tokens/base y retirar duplicaciones restantes (`wizard-*`, `timeline-*`).
4. Tipar `comprasApi.ts` con tipos de OpenAPI (prioridad: mappers de adjudicacion, contratos, recepciones).
5. Expandir tests de arquitectura backend por capas completas.
6. Optimizar queries de listados con proyecciones DTO, `AsNoTracking` y paginacion consistente.
7. Agregar tests unitarios para mappers API, permisos/rutas y hooks de compras/evaluacion.
8. Agregar checklist a11y y pruebas de teclado para modal/dropdown/tabs/subasta.

### Mejoras grandes (1-3 meses)

1. Contrato OpenAPI versionado con generacion automatica de cliente y checks de breaking changes en CI.
2. Observabilidad completa: correlation id, trazas, metricas de workers, SignalR, outbox y subastas.
3. Verificacion de integridad asincronica/incremental con claves versionadas por tenant.
4. Estrategia formal de cache Redis para snapshots publicos y subastas.
5. Pruebas de carga/concurrencia para lances y cierre de subastas.
6. Design system documentado en Storybook con tokens, patrones, estados, responsive y accesibilidad.
7. Hardening de despliegue: secret manager, backups, migraciones controladas, health gates y rollback.

## Decision de aprobacion

Estado recomendado: **aprobacion condicionada, no produccion directa**.

La situacion mejoro respecto a la revision inicial: TypeScript completo, rate limiting en auth, eliminacion de CSS legacy, nuevos componentes shared, `TenantQueryFilters` extraificado y eliminacion de soporte dual SQLite. Estos avances reducen deuda tecnica y mejoran la base para produccion.

Condiciones minimas antes de produccion:
- Secretos fuera del repo y rotados (Neon password, JWT secret, 3 claves HMAC).
- CI verde con lint, typecheck, build y tests backend.
- Workers criticos observables y sin fallas silenciosas.
- Contratos API criticos tipados (`comprasApi.ts` migrado a OpenAPI types).
- Flujos de auth, tenant, subasta, compras y auditoria cubiertos por pruebas negativas y E2E.
- Design system estabilizado para no seguir aumentando CSS legacy.
