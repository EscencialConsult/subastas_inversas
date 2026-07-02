# Registro Integral de Cambios y Arquitectura - 01 de Julio

Este documento consolida el registro de todas las transformaciones, refactorizaciones y mejoras arquitectónicas implementadas durante el día en el proyecto **subastas_inversas**, divididas por fases y capas de software.

---

## Fase 4: Refactor Frontend
Se reorganizó la estructura del frontend para desacoplar componentes y simplificar la gestión del estado:

* **División de Vistas Críticas**:
  * `ProcesoFormPage.jsx`: Ahora es mucho más liviana y delega toda su lógica de negocio al hook `useProcesoForm`.
  * `ConfiguracionPage.jsx` y `AuditoriaListPage.jsx`: Refactorizadas para extraer sub-paneles y lógica local.
* **Estructuración de Hooks Personalizados**:
  * `useProcesoForm`: Gestiona el estado de creación y edición del wizard de procesos de compras.
  * `useProcesos`: Maneja consultas y operaciones de listados de procesos.
  * `useSubasta`: Centraliza el flujo en vivo y lances de subastas.
  * `useProveedores` y `useAuditoria`: Abstracciones para listados y filtros específicos.
* **Componentes por Dominio**:
  * `ProcesoWizard`: Componente encapsulado para la navegación del formulario de compra.
  * `ProcesoResumen`, `InvitacionesPanel`, `ContratoPanel` y `PagosPanel`: Vistas modulares para la lectura de dominios del proceso.
  * `AuditoriaTimeline` y `AuditoriaTimeline.stories.jsx`: Componente visual cronológico para auditoría.
* **Unificación de Estados de Interfaz**:
  * Se crearon `LoadingState`, `ErrorState` y `EmptyResults` en `frontend/src/components/ui/StateViews.jsx` para estandarizar la experiencia de usuario ante cargas y fallos.

---

## Fase 5: Refactor Backend
Se aplicaron principios de modularización (SRP) y Clean Architecture en el backend C#:

* **Desacoplamiento de Controladores (API)**:
  * El controlador masivo `PurchaseProcessesController` se dividió en seis controladores específicos:
    * `PurchaseProcessesController`: Gestión principal de procesos de compra.
    * `EvaluationController`: Calificación de proveedores y criterios de evaluación.
    * `ContractsController`: Manejo de contratos y firmas.
    * `PurchaseOrdersController`: Generación y exportación de órdenes de compra.
    * `ReceptionsController`: Confirmaciones de recepción.
    * `PaymentsController`: Registro de pagos y facturas.
* **Modularización de Entity Framework (Persistence)**:
  * Se extrajeron las configuraciones de EF Core de `ApplicationDbContext` hacia archivos individuales `IEntityTypeConfiguration<T>` dentro de `Configurations/`.
  * Se simplificó `ApplicationDbContext.cs` llamando a `builder.ApplyConfigurationsFromAssembly()`.
* **Validación y Errores (Application)**:
  * Se implementaron excepciones tipadas (`ValidationException`, `NotFoundException`, etc.) en `Common/Exceptions`.
  * Middleware de gestión de errores (`ErrorHandlingMiddleware.cs`) ahora devuelve respuestas estándar en formato `ProblemDetails`.
  * Se configuró un pipeline behavior en MediatR (`ValidationBehavior`) para interceptar y validar requests automáticamente usando validadores livianos.
  * Se crearon DTOs específicos separados para listado, detalle, creación y actualización de procesos de compra.

---

## Fase 6: Optimización de Rendimiento
Acciones enfocadas a mitigar cuellos de botella en base de datos:

* **Optimización de Queries**:
  * Se configuró `AsNoTracking` en todas las consultas de sólo lectura (procesos, auditoría, proveedores, subastas y alertas).
  * La consulta `GetPurchaseProcessesQuery` ahora proyecta DTOs livianos en lugar de usar `Include` masivos, cargando relaciones secundarias (adjudicaciones/contratos/órdenes) de forma diferida únicamente para los IDs paginados.
  * Se configuró `AsSplitQuery` en consultas que requieren múltiples relaciones coleccionadas simultáneamente para evitar explosión cartesiana.
* **Paginación Segura**:
  * Se normalizaron límites máximos de páginas en `Paging.cs` (`pageSize <= 100` en procesos y subastas, `pageSize <= 1000` en logs de auditoría).
* **Índices de Rendimiento y Migraciones**:
  * Se agregaron índices para filtros frecuentes en las tablas de procesos, subastas, bids, auditoría, accesos y proveedores.
  * Migración EF generada: `20260701173420_AddPerformanceIndexes`.
  * `ApplicationDbContextFactory` implementado para migraciones eficientes en tiempo de diseño.
* **Medición de Telemetría**:
  * Se integró `PerformanceBehavior` en MediatR para alertar y loguear automáticamente cualquier comando o consulta que supere el umbral crítico de tiempo.

---

## Fase 7: Seguridad Avanzada
* **Protección de Carga de Archivos (Uploads)**:
  * Se endureció la seguridad analizando los bytes mágicos (`%PDF-`) de cabecera en PDFs.
  * Cálculo de hashes SHA-256 por streaming para validación de integridad.
  * Definición de abstracciones `IUploadStorage` e inyección de escáner antivirus `IAntivirusScanner` (con mock local).
* **Autenticación Robusta**:
  * Expiración corta del Token de Acceso JWT (15 minutos).
  * Tokens de refresco rotativos (`RefreshToken`) con revocación explícita y detección de reuso de tokens (si un token viejo intenta reutilizarse, se revoca la cadena entera).
  * Rate limiting en endpoints sensibles (Login, MFA, Refresh).
  * Logs con advertencias operativas ante fallos repetitivos.
  * Nueva migración EF: `20260701175241_AddRefreshTokenRevocation`.
* **Políticas de Cabeceras HTTP (Headers)**:
  * `SecurityHeadersMiddleware.cs` inyecta cabeceras de seguridad estrictas: CSP (Content Security Policy), HSTS en producción, X-Frame-Options, X-Content-Type-Options y Referrer-Policy.

---

## Fase 8 y Pruebas Locales Estables
Se resolvió la estabilidad local y de CI del arnés de pruebas de extremo a extremo:

* **Soporte Base de Datos SQLite**:
  * En `DependencyInjection.cs` se añadió soporte condicional para SQLite (`sicst_dev.db`).
  * En `Program.cs` se configuró la inicialización dinámica para evitar colisión de dialectos de base de datos.
  * Inicialización automática de datos demo (seeding) con la empresa de prueba y credenciales por defecto.
* **Desactivación de HTTPS en Desarrollo**:
  * Se configuró `UseHttpsRedirection()` únicamente para entornos fuera de desarrollo, facilitando pruebas locales.
* **Pruebas de Storybook (A11y)**:
  * Pruebas configuradas para fallar ante cualquier violación de accesibilidad WCAG.
* **Tests de Extremo a Extremo (Playwright E2E)**:
  * Implementación de la suite de pruebas bajo `frontend/e2e/` (`role-navigation.spec.js`, `critical-forms.spec.js`, `responsive.spec.js`).

---

## Fase 9: Arquitectura Frontend FSD & TypeScript (Sesión Actual)
Se completó la migración hacia **Feature-Sliced Design (FSD)** y se resolvió la type-safety del frontend a través de compilación estricta de TypeScript:

* **Estructura FSD Implementada**:
  * `src/app/`: Centralización de proveedores (`providers.tsx`), configuración de rutas dinámicas lazy (`routes.tsx`), y layouts base.
  * `src/shared/`:
    * Componentes comunes de UI (`src/shared/ui/` como `Alert`, `Badge`, `Spinner`, etc.).
    * Clientes API globales (`src/shared/api/`).
  * `src/features/`: Separación modular de features con estructura autocomportada (`compras`, `proveedor`, `evaluacion`, `subasta`, `auditoria`, `configuracion`, etc.), conteniendo sus respectivas carpetas `pages/`, `routes.jsx`, y componentes específicos.
* **Páginas Migradas y Fuertemente Tipadas (TSX)**:
  * `ConfiguracionPage.tsx`: Implementación tipada con soporte para gestión de plantillas, modalidades y circuitos.
  * `AuditoriaDetailPage.tsx`: Expediente y línea de tiempo detallada de auditoría, lectura de alertas y visualización de lances y adjudicaciones.
  * `EvaluacionProcesoPage.tsx`: Lógica compleja de evaluación de proveedores con criterios ponderados y excluyentes.
* **Archivos de Declaración de Tipos (`.d.ts`)**:
  * Creados para dotar de tipado estricto a submódulos antiguos en JS:
    * `subastasApi.d.ts`: Tipado de la API de subastas, lances y comparativas.
    * `usersApi.d.ts`: Mapeo de perfiles, usuarios y resolución de nombres.
    * `StateViews.d.ts`: Estandarización de llamadas opcionales a `EmptyResults` e interfaces de estados de carga.
* **Ajustes de Integridad de Tipos (TypeScript Compiler)**:
  * Se solucionaron desalineaciones del contrato generado por OpenAPI en el frontend:
    * Mapeo de `SupplierInvitationResponse` a `InvitationDto` en vez de `SupplierInvitationDto`.
    * Corrección de mapeo de evaluaciones reemplazando `evaluadorId` por `evaluatorId` según contrato.
    * Corrección del mapeo de items eliminando `purchaseProcessId` del DTO de items.
    * Mapeo de `AuctionDtoResponse` a `SupplierAuctionDto` para soportar campos `auctionId`, `processCode` y `processTitle`.
    * Ajustes a `tsconfig.json` para ignorar advertencias de deprecación de `baseUrl` mediante `"ignoreDeprecations": "6.0"`.
  * **Resultado de Validación**: `npx tsc --noEmit` ejecuta con **0 errores**.

---

## Fase 10: Planificación de Producción Enterprise (Próximos Pasos)
Se entregó la planificación detallada y el diseño técnico para la escala real del software:

* **Eventos de Dominio**: Abstracciones para emitir eventos desde la capa de dominio (`PurchaseProcessPublished`, `SupplierInvited`, `AuctionStarted`, `BidPlaced`, `ProcessAwarded`).
* **Patrón Outbox**: Interceptores transaccionales automáticos en EF Core para encolar eventos de dominio y procesamiento asíncrono at-least-once.
* **Hardening de Workers**: Mecanismo de reintentos (Retries), logging estructurado e idempotencia mediante advisory locks distribuidos en PostgreSQL para entornos con múltiples instancias.
* **Health Checks**: Diagnóstico de base de datos, almacenamiento local y caché (Redis).
* **Observabilidad**: Configuración enriquecida de Serilog para traceo estructurado y telemetría HTTP a través de OpenTelemetry.
* **CI/CD Pipeline**: Configuración de GitHub Actions para flujos automáticos de validación frontend y backend (incluyendo Testcontainers PostgreSQL).
