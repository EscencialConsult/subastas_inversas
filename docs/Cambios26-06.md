# Cambios 26/06 — Calificación de proveedores, criterios de evaluación, y unificación visual

> 53 archivos modificados, ~4690 líneas agregadas, ~816 eliminadas.

---

## 1. Calificación de proveedores (nuevo)

Flujo completo para que un **Evaluador** califique a los proveedores que aceptaron una invitación (Aprobado/Observado/Rechazado) antes de iniciar la subasta.

### Backend

| Archivo | Cambio |
|---|---|
| `SICST.Domain/Entities/Invitation.cs` | Nuevo enum `QualificationStatus` (Pending/Approved/Observed/Rejected) + campos `QualificationNotes`, `QualifiedById` (FK a User), `QualifiedAtUtc` |
| `SICST.Application/Purchases/DTOs/InvitationDto.cs` | Expone `QualificationStatus`, `QualificationNotes`, `QualifiedById`, `QualifiedByName`, `QualifiedAtUtc` |
| `SICST.Persistence/Contexts/ApplicationDbContext.cs` | Fluent API para nuevos campos + navegación `QualifiedBy` con `SetNull` |
| `SICST.Application/Purchases/Commands/QualifySupplierCommand.cs` | **Nuevo.** Valida que la invitación esté `Accepted`, permite pasar de `Observed` a `Approved`, exige `notes` si es `Rejected` |
| `SICST.Application/Purchases/Queries/GetProcessSuppliersQuery.cs` | **Nuevo.** Devuelve proveedores con su calificación para un proceso |
| `SICST.Application/Purchases/Queries/GetProcessesForQualificationQuery.cs` | **Nuevo.** Procesos con invitaciones aceptadas pendientes de calificar |
| `SICST.Api/Controllers/PurchaseProcessesController.cs` | Endpoints `GET /qualification`, `GET /{id}/suppliers`, `POST /{id}/invitations/{invId}/qualify` (todos con `PurchasesEvaluate`) |

### Frontend

| Archivo | Cambio |
|---|---|
| `features/calificacion/CalificacionListPage.jsx` | **Nuevo.** Lista procesos pendientes de calificar |
| `features/calificacion/CalificacionProcesoPage.jsx` | **Nuevo.** Lista proveedores de un proceso con su estado de calificación |
| `features/calificacion/CalificacionProveedorPage.jsx` | **Nuevo.** Calificación uno-a-uno con radio buttons (Aprobado/Observado/Rechazado) y textarea de fundamento |
| `App.jsx` | Rutas `/calificacion`, `/calificacion/:id`, `/calificacion/:id/:invitationId` protegidas con `puedeEvaluar` |
| `api/comprasApi.js` | Funciones `listarProcesosParaCalificacion`, `obtenerProveedoresDeProceso`, `calificarProveedor` |

---

## 2. Criterios de evaluación (nuevo)

Sistema de criterios **excluyentes** y **ponderados** para evaluar proveedores en un proceso de compra.

### Backend

| Archivo | Cambio |
|---|---|
| `SICST.Domain/Entities/EvaluationCriterion.cs` | **Nuevo.** Entidad con `Name`, `Description`, `Type` (Exclusionary/Weighted), `Weight`, `SortOrder` |
| `SICST.Domain/Entities/SupplierEvaluation.cs` | **Nuevo.** Evaluación por proveedor: `TotalWeightedScore`, `IsExcluded`, `ExcludedReason` |
| `SICST.Domain/Entities/SupplierCriterionResult.cs` | **Nuevo.** Resultado por criterio: `Score`, `Passed`, `Notes` |
| `SICST.Domain/Entities/PurchaseProcess.cs` | Navegaciones `EvaluationCriteria` y `SupplierEvaluations` |
| `SICST.Application/Common/Interfaces/IApplicationDbContext.cs` | DbSets para las 3 nuevas entidades |
| `SICST.Persistence/Contexts/ApplicationDbContext.cs` | Fluent API con índices compuestos, precisiones, cascades |
| `SICST.Application/Purchases/Commands/SaveEvaluationCriteriaCommand.cs` | **Nuevo.** Guarda criterios (reemplazo total — delete + insert) |
| `SICST.Application/Purchases/Commands/SaveSupplierEvaluationsCommand.cs` | **Nuevo.** Guarda evaluaciones de proveedores con puntajes por criterio |
| `SICST.Application/Purchases/Queries/GetEvaluationCriteriaQuery.cs` | **Nuevo.** Obtiene criterios de un proceso |
| `SICST.Application/Purchases/Queries/GetEvaluationResultsQuery.cs` | **Nuevo.** Obtiene resultados de evaluación |
| `SICST.Api/Controllers/PurchaseProcessesController.cs` | Endpoints para guardar/obtener criterios y resultados |

### Frontend

| Archivo | Cambio |
|---|---|
| `features/evaluacion/EvaluacionListPage.jsx` | **Nuevo.** Lista procesos listos para evaluar |
| `features/evaluacion/EvaluacionProcesoPage.jsx` | **Nuevo.** Grilla de evaluación 0-100% con nota opcional por criterio |
| `App.jsx` | Rutas `/evaluacion`, `/evaluacion/:id` |
| `features/compras/ProcesoFormPage.jsx` | **Etapa 4 (Criterios)** del wizard: define criterios con tipo, peso y orden |
| `features/compras/AdjudicarPage.jsx` | Panel de resultados de evaluación con ranking y recomendación |
| `features/auditoria/AuditoriaDetailPage.jsx` | Sección de evaluación y resultados visibles en auditoría |

---

## 3. Wizard de 8 etapas en ProcesoFormPage

El formulario de creación/edición de procesos se reestructuró como wizard multi-etapa con persistencia del paso en `localStorage`.

| Etapa | Nombre | Contenido |
|---|---|---|
| 1 | Datos Básicos | Título, descripción |
| 2 | Presupuesto | Monto estimado + sugerencia de modalidad |
| 3 | Ítems | Productos/servicios del proceso |
| 4 | Criterios | Criterios de evaluación |
| 5 | Requisitos | Documentos requeridos + config. de subasta |
| 6 | Subasta | Parámetros (duración, decremento) |
| 7 | Invitaciones | Buscar proveedores verificados e invitarlos |
| 8 | Revisión | Resumen y publicación |

---

## 4. Invitaciones con motivo de rechazo

| Archivo | Cambio |
|---|---|
| `Invitation.cs` | Nuevo campo `RejectionReason` |
| `RespondToInvitationCommand.cs` | Exige `RejectionReason` si el proveedor rechaza |
| `InviteSupplierCommand.cs` | Expone `RejectionReason` en el DTO |
| `InvitationDto.cs` + `comprasApi.js` | Exponen `rejectionReason` |

El proveedor puede especificar el motivo al rechazar una invitación.

---

## 5. Unificación visual completa (Tailwind → App.css)

Se eliminó el uso de **Tailwind** en las **5 páginas públicas** y se migraron a clases **BEM** definidas en `App.css`.

| Página | Archivo |
|---|---|
| Portal público | `PortalLayout.jsx` |
| Login | `LoginPage.jsx` |
| Registro de proveedor | `RegistroProveedorPage.jsx` |
| Portal público (contenido) | `PortalPublicoPage.jsx` |
| Subasta pública | `SubastaPublicaPage.jsx` |

### App.css: +1151 líneas (de ~200 a ~1350)

29 secciones numeradas con nuevas clases:

- `.contenedor` / `.contenedor--chico` / `.contenedor--md` — contenedores responsive
- `.page-header` — encabezado con logo, título, navegación
- `.hero` — sección destacada con título, descripción, acciones
- `.metric-grid` / `.metric-card` — cuadrícula de métricas con variantes (primary/success/info/highlight)
- `.tabs` — tabs con cabezal y contenido
- `.panel-header` — encabezado de panel con título y acciones
- `.busqueda` — barra de búsqueda con input + select
- `.card-grid` / `.card` — cuadrícula de tarjetas de procesos
- `.row-item` — fila de listado (subastas, adjudicaciones)
- `.empty-state` — estado vacío con icono, título y texto
- `.public-page` / `.public-form` — layout de páginas públicas
- `.timeline-item` — ítem de línea de tiempo

Clases utilitarias:

| Categoría | Clases |
|---|---|
| Flex | `.flex`, `.flex--col`, `.flex--wrap`, `.flex--centro`, `.flex--entre` |
| Gap | `.gap-4`, `.gap-8`, `.gap-12`, `.gap-16`, `.gap-24`, `.gap-32` |
| Grid | `.grid-2`, `.grid-3`, `.grid-items`, `.grid-full` |
| Width | `.w-sm`, `.w-md`, `.w-lg`, `.w-full` |
| Texto | `.text-center`, `.text-right`, `.text-mono`, `.text-xs`, `.text-sm`, `.text-suave`, `.text-error`, `.text-ok` |
| Margin | `.mt-4`, `.mt-8`, `.mt-12`, `.mt-16`, `.mt-24`, `.mb-*` |
| Botones | `.btn--secundario`, `.btn--full`, `.btn--chico`, `btn--primario:active` (scale 0.97) |

### index.css

| Cambio | Detalle |
|---|---|
| `--color-primario-claro` | `#dbeafe` |
| `--radio-lg` | `12px` |
| `--sombra-lg` | Sombra grande |
| `--font-mono` | Stack de fuentes monoespaciadas |
| `*::before, *::after` | Box-sizing border-box |
| `:focus-visible` | Outline azul para accesibilidad (solo teclado) |
| `.skip-link` | Enlace de salto para navegación por teclado |

---

## 6. Endpoints de auditoría, aprobación y evaluación

Se agregaron endpoints separados con políticas específicas para cada rol.

### Auditoría (`AuditRead`)

```
GET  /api/companies/{companyId}/purchase-processes/audit
GET  /api/companies/{companyId}/purchase-processes/{id}/audit
GET  /api/companies/{companyId}/purchase-processes/{id}/invitations/audit
GET  /api/companies/{companyId}/purchase-processes/{id}/evaluation-results/audit
GET  /api/companies/{companyId}/purchase-processes/{purchaseProcessId}/auction/audit
GET  /api/audit/suppliers
```

### Aprobación (`PurchasesApprove`)

```
GET  /api/companies/{companyId}/purchase-processes/approvals
GET  /api/companies/{companyId}/purchase-processes/{id}/approval
GET  /api/companies/{companyId}/purchase-processes/{purchaseProcessId}/auction/approval
```

### Evaluación (`PurchasesEvaluate`)

```
GET  /api/companies/{companyId}/purchase-processes/evaluate
GET  /api/companies/{companyId}/purchase-processes/{id}/evaluate
GET  /api/companies/{companyId}/purchase-processes/{id}/evaluation-criteria/evaluate
GET  /api/companies/{companyId}/purchase-processes/{id}/evaluation-results/evaluate
GET  /api/companies/{companyId}/purchase-processes/{purchaseProcessId}/auction/evaluate
GET  /api/evaluation/suppliers
```

---

## 7. Hash de especificaciones + auditoría

| Archivo | Cambio |
|---|---|
| `PurchaseProcess.cs` | Nuevo campo `SpecificationsHash` |
| `PublishPurchaseProcessCommand.cs` | Calcula SHA-256 al publicar (título + descripción + presupuesto + ítems ordenados) y registra evento de auditoría |
| `PurchaseProcessDto.cs` + mapping | Expone `SpecificationsHash` |
| `ApplicationDbContext.cs` | `HasMaxLength(64)` |
| `PurchaseProcessHandlerTests.cs` | Test `PublishPurchaseProcess_ShouldCalculateSpecificationsHashAndLogAudit` |

---

## 8. Documentación de proveedores → status automático

`IssueSupplierDocumentVerdictCommandHandler` ahora actualiza el estado del proveedor:

- Si el veredicto es `Approved`/`ApprovedWithException` y **todos** los demás documentos están aprobados → `Supplier.Status = Verified`
- Si el veredicto es `Rejected` → `Supplier.Status = Rejected`

---

## 9. Registro de proveedor tolerante a CUIT inválido

`RegisterSupplierCommand.cs`: ya no lanza `InvalidOperationException` si el CUIT tiene dígito verificador incorrecto. En su lugar, crea el proveedor como `Pending` con `ArcaVerified = false`. El proveedor puede subsanar/documentarse después.

---

## 10. StartAuctionCommand filtrado por calificación

```csharp
// Antes: cualquier invitación participaba en la subasta
.Where(i => i.PurchaseProcessId == request.PurchaseProcessId)

// Ahora: solo invitaciones aceptadas Y calificadas como Approved
.Where(i => i.PurchaseProcessId == request.PurchaseProcessId
    && i.Status == InvitationStatus.Accepted
    && i.QualificationStatus == QualificationStatus.Approved)
```

---

## 11. Navegación y layout

### Layout (`Layout.jsx`)

Nuevos links para Evaluador:
- **Calificación** → `/calificacion`
- **Evaluación de procesos** → `/evaluacion`
- **Evaluación documental** → `/evaluacion-proveedores`

Nuevo link para Proveedor:
- **Subastas / Invitaciones** → `/proveedor/oportunidades`

### RutaProtegida (`RutaProtegida.jsx`)

En lugar de mostrar "Sin acceso", redirige al home del rol:
- Proveedor → `/proveedor`
- Evaluador → `/evaluacion`
- Otros → `/`

---

## 12. Permisos y dashboard

| Archivo | Cambio |
|---|---|
| `permisos.js` | `tienePanel()` excluye a `EVALUADOR` |
| `PanelPage.jsx` | Listas envueltas en `.panel-listas-grid` |
| `dashboardApi.js` | Paneles de Autoridad y Auditor usan endpoints dedicados |
| `DatabaseInitializer.cs` | `Comprador` ahora tiene permiso `ConfigurationRead` |

---

## 13. Migraciones EF

| Migración | Tablas/Campos |
|---|---|
| `AddSpecificationsHash` | `PurchaseProcess.SpecificationsHash` |
| `AddInvitationRejectionReason` | `Invitation.RejectionReason` |
| `AddEvaluationCriteria` | `EvaluationCriteria`, `SupplierEvaluations`, `SupplierCriterionResults` |
| `AddQualificationStatus` | `Invitation.QualificationStatus`, `QualificationNotes`, `QualifiedById`, `QualifiedAtUtc` |

---

## Resumen de archivos nuevos

### Backend (12 archivos)

```
SICST.Application/Purchases/Commands/QualifySupplierCommand.cs
SICST.Application/Purchases/Commands/SaveEvaluationCriteriaCommand.cs
SICST.Application/Purchases/Commands/SaveSupplierEvaluationsCommand.cs
SICST.Application/Purchases/DTOs/EvaluationCriterionDto.cs
SICST.Application/Purchases/DTOs/QualificationSupplierDto.cs
SICST.Application/Purchases/DTOs/SupplierEvaluationDto.cs
SICST.Application/Purchases/Queries/GetEvaluationCriteriaQuery.cs
SICST.Application/Purchases/Queries/GetEvaluationResultsQuery.cs
SICST.Application/Purchases/Queries/GetProcessSuppliersQuery.cs
SICST.Application/Purchases/Queries/GetProcessesForQualificationQuery.cs
SICST.Domain/Entities/EvaluationCriterion.cs
SICST.Domain/Entities/SupplierCriterionResult.cs
SICST.Domain/Entities/SupplierEvaluation.cs
```

### Frontend (6 archivos)

```
features/calificacion/CalificacionListPage.jsx
features/calificacion/CalificacionProcesoPage.jsx
features/calificacion/CalificacionProveedorPage.jsx
features/evaluacion/EvaluacionListPage.jsx
features/evaluacion/EvaluacionProcesoPage.jsx
features/proveedor/EvaluacionProveedoresPage.jsx
features/proveedor/ProveedorOportunidadesPage.jsx
```
