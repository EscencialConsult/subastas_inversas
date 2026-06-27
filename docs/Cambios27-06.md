# Cambios 27/06 — Sprint 13: Subasta programable, acta de evaluación con firma, verificación ARCA, lances con trazabilidad

> ~53 archivos modificados, ~18 nuevos, 4 migraciones, 2 servicios background.
> Ramas funcionales: subasta programable (Scheduled), acta de evaluación con firma digital, trazabilidad criptográfica de lances, verificación automática de proveedores vía ARCA, sala de subasta en vivo para proveedores.

---

## 1. Acta de Evaluación con Firma Digital (nuevo)

Flujo completo para que el **Evaluador** firme digitalmente el acta de evaluación de proveedores, generando un PDF inmutable con hash SHA-256 + HMAC, habilitando el inicio de la subasta.

### Backend

| Archivo | Cambio |
|---|---|
| `SICST.Domain/Entities/PurchaseProcess.cs` | Nuevos campos: `IsEvaluationActSigned`, `EvaluationActHash`, `EvaluationActSignature`, `EvaluationActSignedAtUtc`, `EvaluationActSignedById`, `EvaluationActSignedBy` (FK a User) |
| `SICST.Application/Purchases/Commands/SignEvaluationActCommand.cs` | **Nuevo.** Valida: proceso aprobado, acta no firmada, todas las calificaciones resueltas, arma material con datos del proceso + evaluador + proveedores, genera hash SHA-256, firma HMAC-SHA256, guarda imagen de firma, genera PDF |
| `SICST.Application/Common/Interfaces/IPdfGenerator.cs` | Nuevo método `GenerateEvaluationAct` |
| `SICST.Infrastructure/Services/PdfGenerator.cs` | Implementación con QuestPDF: documento A4, tabla de proveedores calificados, hash + firma digital visibles, imagen de la firma manuscrita, pie de página numerado |
| `SICST.Application/Purchases/DTOs/PurchaseProcessDto.cs` | Nuevos campos `IsEvaluationActSigned`, `EvaluationActHash`, `EvaluationActSignature`, `EvaluationActSignedAtUtc`, `EvaluationActSignedById`, `EvaluationActSignedByName` |
| `SICST.Application/Purchases/PurchaseProcessMapping.cs` | Mapeo de los nuevos campos incluyendo `EvaluationActSignedByName` |
| `SICST.Api/Controllers/PurchaseProcessesController.cs` | Endpoints `POST /{id}/evaluation-act/sign` (policy `PurchasesEvaluate`) y `GET /{id}/evaluation-act/pdf` (autenticado) |

### Frontend

| Archivo | Cambio |
|---|---|
| `components/SignaturePad.jsx` | **Nuevo.** Componente de firma manuscrita en canvas con soporte mouse/touch, verifica que no esté vacío, devuelve base64 PNG |
| `features/calificacion/CalificacionProcesoPage.jsx` | Sección "Acta de Evaluación" con: badge de estado, hash SHA-256 + firma digital visibles, enlace de descarga PDF, botón "Firmar y Habilitar Subasta" que abre `SignaturePad`. Bloqueado si hay proveedores sin calificar |
| `api/comprasApi.js` | Funciones `firmarActaEvaluacion` (POST) y `descargarActaEvaluacionUrl` |

---

## 2. Subasta Programable (Scheduled)

La subasta ya no se abre inmediatamente: puede **programarse** para una fecha/hora futura, y un `BackgroundService` la abre automáticamente.

### Backend

| Archivo | Cambio |
|---|---|
| `SICST.Domain/Entities/Auction.cs` | Nuevo enum value `AuctionStatus.Scheduled`. Nuevos campos: `AutoExtensionMinutes` (default 3), `PabThreshold` |
| `SICST.Application/Auctions/Commands/StartAuctionCommand.cs` | Nuevos parámetros: `BasePrice`, `MinimumDecrementPercentage`, `StartsAtUtc`, `DurationMinutes`, `AutoExtensionMinutes`, `PabThreshold`. Si `StartsAtUtc > now` → status `Scheduled`. Valida que `IsEvaluationActSigned == true`. Calcula `endsAt` desde `startsAt`. Participantes se unen en `startsAt` |
| `SICST.Application/Auctions/Commands/CloseAuctionCommand.cs` | Valida que la subasta esté `Open` (rechaza cerrar una `Scheduled`) |
| `SICST.Application/Auctions/DTOs/AuctionDto.cs` | Nuevos campos: `AutoExtensionMinutes`, `PabThreshold` |
| `SICST.Application/Auctions/AuctionMapping.cs` | Mapeo de `AutoExtensionMinutes`, `PabThreshold`, y nuevos campos de `BidDto` |
| `SICST.Api/Controllers/AuctionsController.cs` | Al iniciar, notifica `AuctionOpened` si Open o `AuctionScheduled` si Scheduled por SignalR |
| `SICST.Api/Program.cs` | Registra `AuctionSchedulerService` y `SupplierArcaVerificationService` como hosted services. SignalR acepta token por query string para WebSocket. `MigrateAsync()` en startup |

### Frontend

| Archivo | Cambio |
|---|---|
| `features/compras/ProcesosListPage.jsx` | Modal de configuración de subasta con campos: Precio Base, Decremento Mínimo (%), Fecha/Hora de Inicio, Duración (min), Extensión Automática (min), Umbral PAB. Botón "Programar subasta" si acta firmada, o "⚠️ Firmar Acta" si no |
| `api/subastasApi.js` | `iniciarSubasta` ahora envía todos los parámetros de configuración. Normaliza status a Open/Closed/Scheduled |
| `features/subasta/SubastaPage.jsx` | Soporta estado `Scheduled` con cuenta regresiva hasta inicio. Muestra métricas de configuración (decremento, extensión, umbral PAB, inicio). Botón "Cerrar subasta" solo si está abierta |

### Subasta programada — vista pública

| Archivo | Cambio |
|---|---|
| `features/publico/SubastaPublicaPage.jsx` | Detecta estado `Scheduled` via `programada` flag. Muestra cuenta regresiva de inicio o cierre según corresponda. Badge "Programada" en vez de "Activa" |

---

## 3. AuctionSchedulerService (nuevo)

`BackgroundService` que cada 30 segundos ejecuta:

1. **Apertura automática**: busca subastas `Scheduled` con `StartsAtUtc <= now`, las pasa a `Open`, actualiza proceso a `InAuction`, setea cache, notifica por SignalR (`AuctionOpened`, `AuctionUpdated`)
2. **Cierre automático**: busca subastas `Open` con `EndsAtUtc <= now`, las pasa a `Closed`, actualiza proceso a `Evaluation`, setea `ClosedAtUtc`, notifica por SignalR (`AuctionClosed`, `AuctionUpdated`)

| Archivo | Cambio |
|---|---|
| `SICST.Api/Services/AuctionSchedulerService.cs` | **Nuevo.** BackgroundService con SignalR `IHubContext<AuctionHub>` |

---

## 4. Lances con trazabilidad criptográfica

Cada lance registra un hash SHA-256 encadenado al hash del lance anterior, más un número de secuencia secuencial por subasta.

### Backend

| Archivo | Cambio |
|---|---|
| `SICST.Domain/Entities/Bid.cs` | Nuevos campos: `IsPab`, `SequenceNumber`, `PreviousHash`, `Hash` |
| `SICST.Application/Auctions/DTOs/BidDto.cs` | Nuevos campos: `IsPab`, `SequenceNumber`, `PreviousHash`, `Hash` |
| `SICST.Application/Auctions/Commands/PlaceBidCommand.cs` | Inyecta `IAuctionBidLock` para concurrencia. Calcula `sequenceNumber` (último + 1), hereda `previousHash`, genera hash SHA-256 con `AuctionId|BidId|SupplierId|Amount|PlacedAtUtc|SequenceNumber|PreviousHash`. Marca `IsPab` si monto < `PabThreshold`. Usa `AutoExtensionMinutes` configurable (ya no hardcodea 3 min) |
| `SICST.Persistence/Contexts/ApplicationDbContext.cs` | Fluent API: `IsPab` default false, `SequenceNumber` required, `PreviousHash` max 64, `Hash` max 64, índice único `(AuctionId, SequenceNumber)`, `AutoExtensionMinutes` default 3, `PabThreshold` precision(18,2) |

### IAuctionBidLock (nuevo)

| Archivo | Cambio |
|---|---|
| `SICST.Application/Common/Interfaces/IAuctionBidLock.cs` | **Nuevo.** Interfaz con `AcquireAsync(Guid auctionId)` |
| `SICST.Infrastructure/Auctions/InMemoryAuctionBidLock.cs` | **Nuevo.** Implementación in-memory con `ConcurrentDictionary<Guid, SemaphoreSlim>` |
| `SICST.Infrastructure/Auctions/RedisAuctionBidLock.cs` | **Nuevo.** Implementación distribuida con Redis `StringSet(NX)` + script Lua para liberación atómica |

---

## 5. Subasta en vivo para proveedores (nuevo)

Sala de subasta en tiempo real donde el proveedor puede ver lances, ofertar y recibir eventos vía SignalR.

| Archivo | Cambio |
|---|---|
| `features/proveedor/ProveedorSubastaLivePage.jsx` | **Nuevo.** Sala en vivo con conexión SignalR, tabla de lances ordenada por secuencia, formulario de oferta, detección PAB, métricas de conexión/estado/mejor oferta/mínimo válido |
| `api/subastasRealtime.js` | **Nuevo.** Cliente SignalR con reconexión automática, token JWT desde localStorage, URL `/hubs/auctions` |
| `App.jsx` | Nueva ruta `/proveedor/subastas/:auctionId` protegida con `esProveedor` |
| `features/proveedor/ProveedorOportunidadesPage.jsx` | Tabla de subastas con columna "Inicio", botón "Entrar" que navega a sala en vivo. Subastas `Scheduled` se muestran como "Aún no abre" |
| `package.json` | Nueva dependencia: `@microsoft/signalr@^10.0.0` |
| `api/proveedoresApi.js` | `realizarLance` ahora retorna el lance mapeado. Nuevos mapeadores de estado ARCA y subasta. Constant maps para `ESTADOS_ARCA` y `ESTADOS_SUBASTA` |

### SignalR Hub

| Archivo | Cambio |
|---|---|
| `SICST.Api/Hubs/AuctionHub.cs` | Hub con métodos `JoinAuction`/`LeaveAuction`/`JoinAuctionRoom`/`LeaveAuctionRoom`. Grupos por `auction:{id}` |
| `SICST.Api/Program.cs` | Mapeo `/hubs/auctions`, JWT Bearer acepta `access_token` en query string para WebSocket |

---

## 6. Verificación ARCA de proveedores (nuevo)

Flujo automático de verificación fiscal de proveedores al registrarse.

### Backend

| Archivo | Cambio |
|---|---|
| `SICST.Domain/Entities/Supplier.cs` | Nuevo enum `ArcaVerificationStatus` (Pending/Verified/Rejected/Failed). Nuevos campos: `ArcaVerificationStatus`, `ArcaVerifiedAtUtc`, `ArcaVerificationNotes`, `CredentialsSentAtUtc` |
| `SICST.Application/Common/Interfaces/IArcaVerificationService.cs` | **Nuevo.** Interfaz con `VerifySupplierAsync(request)` + records `ArcaVerificationRequest`/`ArcaVerificationResult` |
| `SICST.Application/Common/Interfaces/IEmailSender.cs` | **Nuevo.** Interfaz con `SendAsync(to, subject, body)` |
| `SICST.Infrastructure/Services/MockArcaVerificationService.cs` | **Nuevo.** Mock que valida CUIT (dígito verificador), rechaza CUITs terminados en "-0", rechaza razón social vacía |
| `SICST.Infrastructure/Services/ConsoleEmailSender.cs` | **Nuevo.** Implementación que loguea por `ILogger` |
| `SICST.Api/Services/SupplierArcaVerificationService.cs` | **Nuevo.** BackgroundService que cada 30s toma hasta 10 proveedores `Pending`, los verifica contra ARCA. Si OK: marca Verified, genera password temporal, activa usuario, envía email. Si no: marca Rejected, desactiva usuario, envía email de rechazo |
| `SICST.Infrastructure/DependencyInjection.cs` | Registra `MockArcaVerificationService`, `ConsoleEmailSender`, `IAuctionBidLock` (Redis si hay config, si no InMemory). `AddInfrastructureServices` ahora recibe `IConfiguration` |
| `SICST.Infrastructure/SICST.Infrastructure.csproj` | Nueva dependencia: `StackExchange.Redis 2.10.1` |
| `SICST.Persistence/Contexts/ApplicationDbContext.cs` | Fluent API: `ArcaVerificationStatus` required, `ArcaVerificationNotes` max 1000 |

### Frontend

| Archivo | Cambio |
|---|---|
| `features/proveedor/RegistroProveedorPage.jsx` | Ya no solicita password ni repetición. Muestra mensaje de confirmación: "Tus datos fueron enviados a verificación." |
| `api/proveedoresApi.js` | `registrarProveedor` ya no envía `password`. `obtenerProveedorDeUsuario` expone `estadoArca`, `verificadoArcaEn`, `notasArca`, `credencialesEnviadasEn` |

### RegistroSupplierCommand

| Archivo | Cambio |
|---|---|
| `SICST.Application/Suppliers/Commands/RegisterSupplierCommand.cs` | Elimina campo `Password`. Crea usuario con `Active = false` y password temporal aleatorio. Crea proveedor con `ArcaVerified = false`, `ArcaVerificationStatus = Pending`. Elimina validación de password. `SupplierRegistrationResponseDto` ahora incluye `Status` y `Message` |
| `SICST.Application/Suppliers/DTOs/SupplierRegistrationResponseDto.cs` | Nuevos campos: `Status`, `Message` |

### Queries de proveedores actualizados

| Archivo | Cambio |
|---|---|
| `GetSuppliersQuery.cs` | Incluye `ArcaVerificationStatus`, `ArcaVerifiedAtUtc`, `ArcaVerificationNotes`, `CredentialsSentAtUtc` |
| `GetSupplierByUserIdQuery.cs` | Incluye mismos campos |
| `GetSupplierAuctionsQuery.cs` | Incluye `AutoExtensionMinutes`, `PabThreshold` en DTO, más `IsPab`, `SequenceNumber`, `PreviousHash`, `Hash` en bids |
| `GetSupplierAuctionByIdQuery.cs` | Incluye mismos campos |
| `SICST.Application/Suppliers/DTOs/SupplierDto.cs` | Nuevos campos de verificación ARCA |
| `SICST.Application/Suppliers/DTOs/SupplierAuctionDto.cs` | Nuevos campos: `AutoExtensionMinutes`, `PabThreshold` |

### Login

| Archivo | Cambio |
|---|---|
| `SICST.Application/Auth/Commands/LoginCommand.cs` | Mensaje de error más claro: "La cuenta aún no está activa. Si sos proveedor, esperá la verificación de ARCA." |

---

## 7. Migraciones EF (4 nuevas)

| Migración | Tablas/Campos | Detalle |
|---|---|---|
| `AddEvaluationActFields` | `PurchaseProcesses` | `IsEvaluationActSigned`, `EvaluationActHash` (varchar 64 → text), `EvaluationActSignature` (varchar 256 → text), `EvaluationActSignedAtUtc`, `EvaluationActSignedById` (FK Users, Restrict → NoAction) |
| `AddAuctionConfigFields` | `Auctions`, `Bids` | `Auctions.AutoExtensionMinutes` (int, default 3), `Auctions.PabThreshold` (decimal 18,2). `Bids.IsPab` (bool, default false). Altera columnas de acta a text |
| `AddBidLiveTraceFields` | `Bids` | `SequenceNumber` (int), `PreviousHash` (varchar 64), `Hash` (varchar 64). Backfill con `ROW_NUMBER()` por subasta. Hash calculado con md5 duplicado para datos existentes. Índice único `(AuctionId, SequenceNumber)` |
| `AddSupplierArcaVerificationWorkflow` | `Suppliers` | `ArcaVerificationStatus` (int, default 0=Pending), `ArcaVerifiedAtUtc`, `ArcaVerificationNotes` (varchar 1000), `CredentialsSentAtUtc`. Backfill desde `ArcaVerified` existente |

---

## 8. Tests

| Archivo | Cambio |
|---|---|
| `AuctionHandlerTests.cs` | `StartAuction_ShouldCreateScheduledAuction_WhenStartIsInFuture` — verifica status Scheduled. `PlaceBid_ShouldRejectBid_WhenAuctionIsScheduled` — rechaza lance en programada. `CloseAuction_ShouldRejectClose_WhenAuctionIsScheduled` — rechaza cierre en programada. `PlaceBid_ShouldReturnBidWithHashAndSequence` — verifica SequenceNumber=1, PreviousHash vacío, hash 64 chars. `PlaceBid_ShouldMarkBidAsPab_WhenBelowThreshold` — PAB si monto < threshold. Seed actualizado: invitation Accepted + QualificationStatus Approved + IsEvaluationActSigned = true. `PlaceBidCommandHandler` recibe `IAuctionBidLock` |
| `PurchaseProcessHandlerTests.cs` | Test de integración marca `IsEvaluationActSigned = true` manualmente antes de iniciar subasta. `IPdfGenerator` mock implementa `GenerateEvaluationAct` |
| `SupplierHandlerTests.cs` | `RegisterSupplierCommand` ya no envía `Password`. Usuario creado con `Active = false`. Proveedor `Status = Pending`, `ArcaVerificationStatus = Pending`, `ArcaVerified = false`. Test de CUIT inválido sin password |

---

## 9. Resumen de archivos nuevos

### Backend (10 archivos)

```
SICST.Api/Services/AuctionSchedulerService.cs
SICST.Api/Services/SupplierArcaVerificationService.cs
SICST.Application/Common/Interfaces/IArcaVerificationService.cs
SICST.Application/Common/Interfaces/IAuctionBidLock.cs
SICST.Application/Common/Interfaces/IEmailSender.cs
SICST.Application/Purchases/Commands/SignEvaluationActCommand.cs
SICST.Infrastructure/Auctions/InMemoryAuctionBidLock.cs
SICST.Infrastructure/Auctions/RedisAuctionBidLock.cs
SICST.Infrastructure/Services/ConsoleEmailSender.cs
SICST.Infrastructure/Services/MockArcaVerificationService.cs
```

### Frontend (3 archivos)

```
api/subastasRealtime.js
components/SignaturePad.jsx
features/proveedor/ProveedorSubastaLivePage.jsx
```

### Migraciones (4 archivos + 4 Designer.cs = 8 archivos)

```
20260627122830_AddEvaluationActFields.cs
20260627124302_AddAuctionConfigFields.cs
20260627150000_AddBidLiveTraceFields.cs
20260627162000_AddSupplierArcaVerificationWorkflow.cs
```

---
