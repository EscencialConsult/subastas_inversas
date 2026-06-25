# Documentacion Backend SICST

Este documento resume lo que se va agregando al backend de SICST. La idea es mantener una referencia viva para entender arquitectura, entidades, endpoints, seguridad, migraciones y pruebas disponibles.

## Arquitectura

El backend esta organizado con una separacion por capas:

- `SICST.Api`: controllers, configuracion HTTP, Swagger, autenticacion, autorizacion y middlewares.
- `SICST.Application`: casos de uso, comandos, queries, DTOs e interfaces.
- `SICST.Domain`: entidades y enums del dominio.
- `SICST.Infrastructure`: implementaciones tecnicas externas, como JWT y password hashing.
- `SICST.Persistence`: Entity Framework, `ApplicationDbContext`, migraciones y seed inicial.
- `SICST.Tests`: pruebas automatizadas de application handlers y seguridad.

## Base de datos

Proveedor configurado: PostgreSQL.

Conexion de desarrollo actual:

```json
"DefaultConnection": "Host=localhost;Port=5432;Database=sicst_db;Username=postgres;Password=postgres"
```

El backend ejecuta migraciones automaticamente al iniciar mediante `Database.MigrateAsync()` en `DatabaseInitializer`.

Migraciones existentes:

- `20260622204949_InitialCreate`
- `20260622211558_AddUserEntity`
- `20260622215544_CompleteSprints1And2`
- `20260622220834_AddSuppliers`
- `20260622221905_AddConfiguration`
- `20260622222941_AddPurchaseProcesses`
- `20260622224701_AddAuctions`
- `20260625194155_AddMfaAndAccessLogs` — MFA (TotpSecret, BackupCodes), AccessLog entity
- `20260625201103_AddSupplierDocumentHashAndExpiry` — FileHash, ExpiresAtUtc en SupplierDocument
- `20260625202156_AddCompanySupplierStatusPolicy` — Status, EvaluatedAtUtc en CompanySupplier
- `20260625204338_AddSupplierBusinessCategory` — BusinessCategory en Supplier
- `20260625205107_AddSupplierDocumentReviews` — Nueva entidad SupplierDocumentReview y estados
- `20260625205809_AddContractingModeAmountRanges` — MinAmount, MaxAmount en ContractingMode
- `20260625211713_AddApprovalWorkflowLevels` — Niveles de aprobación multi-nivel
- `20260625212845_AddDocumentTemplates` — Nueva entidad DocumentTemplate con versionado

## Sprint 0 - Base tecnica

Estado: implementado.

Incluye:

- Solucion `SICST.slnx`.
- Proyectos `Api`, `Domain`, `Application`, `Infrastructure`, `Persistence` y `Tests`.
- Entity Framework conectado a PostgreSQL.
- Swagger habilitado en entorno Development.
- Seed inicial de usuario SuperAdmin.

Usuario inicial:

```text
Email: admin@sicst.com
Password: Admin123!
Rol: SuperAdmin
```

## Sprint 1 - Multiempresa

Estado: implementado.

### Entidad Company

Ubicacion: `SICST.Domain/Entities/Company.cs`

Campos:

- `Id`
- `Name`
- `Domain`
- `Logo`
- `PrimaryColor`
- `IsPublicEntity`

`Domain` tiene indice unico y se usa como identificador de tenant/subdominio.

### Endpoints de empresas

Controller: `CompaniesController`

Base path:

```http
/api/companies
```

Endpoints:

- `GET /api/companies`
- `GET /api/companies/{id}`
- `POST /api/companies`
- `POST /api/companies/with-admin`
- `PUT /api/companies/{id}`

Todos requieren JWT y permisos.

Permisos usados:

- `companies:read`
- `companies:create`
- `companies:update`

### Resolucion de tenant

Middleware: `TenantResolutionMiddleware`

Objetivo:

- Detectar la empresa actual desde el subdominio.
- Permitir pruebas locales con header.

Reglas:

- Si existe el header `X-Tenant-Domain`, se usa ese valor.
- Si el host tiene formato tipo `smt.sicst.com`, se usa el primer segmento (`smt`).
- En `localhost` no se resuelve tenant salvo que se envie `X-Tenant-Domain`.

El tenant resuelto se guarda en `ICurrentTenant`.

## Sprint 2 - Usuarios y seguridad

Estado: implementado parcialmente, con la base principal completa.

### Entidad User

Ubicacion: `SICST.Domain/Entities/User.cs`

Campos:

- `Id`
- `CompanyId`
- `Email`
- `PasswordHash`
- `FirstName`
- `LastName`
- `Role`
- `Active`
- `MfaEnabled` — indica si el usuario activó MFA
- `MfaSecret` — seed TOTP para autenticador (encriptado)
- `RefreshTokenHash` — hash SHA256 del refresh token activo
- `RefreshTokenExpiresAtUtc` — fecha de expiración del refresh token

`Email` tiene indice unico.

`Active` tiene default `true`.

### MFA (Multi-Factor Authentication)

El sistema soporta MFA vía TOTP (Time-based One-Time Password) compatible con Google Authenticator, Authy y similares.

**Interfaz:** `IMfaProvider` en `SICST.Application/Common/Interfaces/IMfaProvider.cs`
**Implementación:** `TotpMfaProvider` en `SICST.Infrastructure/Security/TotpMfaProvider.cs`

Métodos del provider:
- `GenerateSecret()` — genera seed de 20 bytes en base32
- `GetTotpUri(issuer, email, secret)` — genera URI `otpauth://` para QR
- `VerifyCode(secret, code)` — valida código TOTP con ventana de ±1 paso

**Flujo de activación:**
1. Usuario solicita `POST /api/auth/mfa/setup` → recibe `secret` y `otpAuthUri` (para QR)
2. Escanea el QR con su app de autenticación
3. Verifica con `POST /api/auth/mfa/verify` enviando `mfaToken` + `code`
4. Si el código es válido, se completa el login con tokens JWT + refresh

**Flujo de login con MFA:**
1. `POST /api/auth/login` con email + password
2. Si el usuario tiene MFA habilitado, responde con `requiresMfa: true` y `mfaToken`
3. Cliente envía `POST /api/auth/mfa/verify` con `mfaToken` + `code` TOTP
4. Si el código es válido, responde con tokens completos

### Access Logs

Cada evento de autenticación se registra en la entidad `AccessLog`:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `Id` | Guid | Identificador único |
| `UserId` | Guid? | Usuario que realizó la acción |
| `CompanyId` | Guid? | Compañía del usuario |
| `Email` | string | Email al momento del evento |
| `EventType` | enum | Tipo de evento (ver abajo) |
| `Success` | bool | Si la operación fue exitosa |
| `FailureReason` | string? | Motivo de fallo (si aplica) |
| `IpAddress` | string? | IP origen |
| `UserAgent` | string? | User-Agent del navegador |
| `OccurredAtUtc` | DateTime | Momento del evento |

**Tipos de evento (`AccessLogEventType`):**

| Valor | Evento |
|-------|--------|
| `LoginSucceeded` | Login exitoso (sin MFA) |
| `LoginFailed` | Login fallido |
| `MfaRequired` | Login con MFA pendiente |
| `MfaSucceeded` | Verificación MFA exitosa |
| `MfaFailed` | Verificación MFA fallida |
| `RefreshSucceeded` | Refresh token exitoso |
| `RefreshFailed` | Refresh token fallido |
| `Logout` | Cierre de sesión |

### Refresh Tokens Reales

Anteriormente el refresh token reutilizaba el mismo JWT. Ahora se usa un sistema rotativo:

- `RefreshTokenHelper.Generate()` — genera token aleatorio de 64 bytes en base64
- `RefreshTokenHelper.Hash(token)` — hashea con SHA256 para almacenar
- Se persiste `RefreshTokenHash` y `RefreshTokenExpiresAtUtc` en el usuario
- Al refrescar, se rota: el token anterior se invalida y se genera uno nuevo
- Validez: 30 días

### Endpoints de autenticación

Controller: `AuthController`

Base path: `/api/auth`

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | Público | Login con email + password. Si MFA activo, devuelve `mfaToken` |
| POST | `/api/auth/refresh` | Público | Refrescar token con `refreshToken` |
| POST | `/api/auth/mfa/setup` | JWT | Obtener secret TOTP y URI para QR |
| POST | `/api/auth/mfa/verify` | Público | Verificar código MFA (requiere `mfaToken` del login) |
| POST | `/api/auth/mfa/enable` | JWT | Activar MFA después de verificar |
| POST | `/api/auth/mfa/disable` | JWT | Desactivar MFA (requiere código + contraseña) |
| POST | `/api/auth/logout` | JWT | Cerrar sesión e invalidar refresh token |
| POST | `/api/auth/profile` | JWT | Actualizar nombre/apellido |
| POST | `/api/auth/register` | `users:manage` | Crear usuario (solo SuperAdmin/Admin) |
| POST | `/api/auth/reset-password` | `users:manage` | Resetear contraseña de cualquier usuario (SuperAdmin/Admin) |

**Ejemplos:**

```json
// POST /api/auth/login — sin MFA
// Request
{ "email": "user@company.com", "password": "Pass123!" }
// Response 200
{
  "token": "jwt...",
  "userId": "guid...",
  "email": "user@company.com",
  "firstName": "Juan",
  "lastName": "Pérez",
  "role": "Admin",
  "companyId": "guid...",
  "companyName": "Municipio de Tucumán",
  "refreshToken": "base64...",
  "requiresMfa": false,
  "mfaEnabled": true
}

// POST /api/auth/login — con MFA
// Request
{ "email": "user@company.com", "password": "Pass123!" }
// Response 200
{
  "requiresMfa": true,
  "mfaEnabled": true,
  "mfaToken": "jwt-mfa...",
  "email": "user@company.com",
  "userId": "guid...",
  "role": "Admin",
  "companyId": "guid..."
}

// POST /api/auth/mfa/setup
// Request (requiere JWT)
{}
// Response 200
{ "secret": "JBSWY3DPEHPK3PXP", "otpAuthUri": "otpauth://totp/SICST:user@company.com?secret=JBSWY3D..." }

// POST /api/auth/mfa/verify
// Request
{ "mfaToken": "jwt-mfa...", "code": "123456" }
// Response 200
{ "token": "jwt...", "refreshToken": "base64...", ... }

// POST /api/auth/reset-password (solo SuperAdmin/Admin)
// Request
{ "userId": "guid...", "newPassword": "TempPass123!" }
// Response 200
{ "newPassword": "TempPass123!" }
```

### Roles

Enum: `UserRole`

Roles actuales:

- `SuperAdmin`
- `Admin`
- `Comprador`
- `Proveedor`
- `Evaluador`
- `Auditor`
- `Autoridad`

### Permisos

Entidades:

- `Permission`
- `RolePermission`

Codigos actuales:

- `companies:read`
- `companies:create`
- `companies:update`
- `users:manage`
- `suppliers:manage`
- `purchases:manage`
- `purchases:approve`
- `purchases:evaluate`
- `audit:read`

Seed de permisos:

- `SuperAdmin`: todos los permisos.
- `Admin`: gestion de usuarios, proveedores, compras, aprobacion, evaluacion y auditoria.
- `Comprador`: `purchases:manage`.
- `Proveedor`: sin permisos internos por ahora.
- `Evaluador`: `purchases:evaluate`.
- `Auditor`: `audit:read`.
- `Autoridad`: `purchases:approve`.

### Autenticacion JWT

Controller: `AuthController`

Endpoints:

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/refresh`

`POST /api/auth/login` devuelve:

- `token`
- `refreshToken`
- `email`
- `firstName`
- `lastName`
- `role`
- `companyId`

Nota actual: `refreshToken` reutiliza un JWT valido. Es suficiente para desarrollo, pero mas adelante conviene persistir refresh tokens reales con expiracion, revocacion y rotacion.

### Autorizacion por permisos

Implementacion:

- `PermissionRequirement`
- `PermissionAuthorizationHandler`

Las policies se registran en `Program.cs` usando los codigos de `PermissionCodes`.

Actualmente `CompaniesController` ya usa policies por permiso.

## Pruebas manuales

Archivo recomendado:

```text
SICST.Api/SICST.Api.http
```

Flujo minimo:

1. Login con `admin@sicst.com` / `Admin123!`.
2. Copiar `token`.
3. Probar `GET /api/companies` sin token y verificar `401`.
4. Probar `GET /api/companies` con `Authorization: Bearer {token}`.
5. Crear una empresa con `POST /api/companies`.
6. Obtenerla con `GET /api/companies/{id}`.
7. Actualizarla con `PUT /api/companies/{id}`.
8. Probar refresh con `POST /api/auth/refresh`.

## Sprint 3 - Proveedores

Estado: implementado base.

### Entidad Supplier

Ubicacion: `SICST.Domain/Entities/Supplier.cs`

Campos:

- `Id`
- `UserId`
- `Cuit`
- `BusinessName`
- `Email`
- `Province`
- `Locality`
- `BusinessCategory` — rubro/categoría del proveedor (nuevo en esta sesión)
- `Status`
- `ArcaVerified`
- `CreatedAtUtc`

Estados:

- `Pending`
- `Verified`
- `Rejected`

El registro de proveedor crea un usuario con rol `Proveedor` y un perfil `Supplier`.

### Entidad SupplierDocument

Ubicacion: `SICST.Domain/Entities/SupplierDocument.cs`

Campos:

- `Id`
- `SupplierId`
- `Type`
- `FileName`
- `ContentType`
- `StoragePath`
- `Sha256Hash` — hash SHA256 del archivo para verificar integridad
- `ExpiresAtUtc` — fecha de vencimiento del documento
- `Status` — `Valid`, `ExpiringSoon`, `Expired` (se calcula automáticamente)
- `AlertSentAtUtc` — fecha del último aviso de vencimiento enviado
- `UploadedAtUtc`
- `Reviews` — colección de `SupplierDocumentReview`

Tipos:

- `CuitCertificate`
- `TaxCertificate`
- `LegalDocument`
- `Other`

La subida actual acepta PDF, calcula SHA256 del archivo, y guarda bajo:

```text
uploads/suppliers/{supplierId}
```

### Entidad SupplierDocumentReview

Ubicacion: `SICST.Domain/Entities/SupplierDocumentReview.cs`

Representa una revisión de documento por parte del comprador/evaluador.

Campos:
- `Id`
- `SupplierDocumentId`
- `ReviewerId` — usuario que revisa
- `ReviewStatus` — `PendingObservation`, `RequiresRemediation`, `Approved`, `Rejected`
- `Comments`
- `CreatedAtUtc`
- `ReviewedAtUtc`

Flujo de revisión:
1. Proveedor sube documento
2. Evaluador observa (`POST .../documents/{id}/observations`) → estado `RequiresRemediation`
3. Proveedor subsana (`POST .../documents/{id}/remediations`) → estado `PendingObservation`
4. Evaluador emite veredicto (`POST .../documents/{id}/verdicts`) → `Approved` o `Rejected`

### Entidad CompanySupplier (actualizada)

Ubicacion: `SICST.Domain/Entities/CompanySupplier.cs`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `Id` | Guid | |
| `CompanyId` | Guid | Empresa compradora |
| `SupplierId` | Guid | Proveedor |
| `LinkedAtUtc` | DateTime | Fecha de vinculación |
| `Status` | enum | `Enabled`, `EnabledWithWarning`, `Blocked` |
| `WarningMessage` | string? | Mensaje de advertencia (si aplica) |
| `EvaluatedAtUtc` | DateTime | Última evaluación de políticas |

La vinculación se evalúa automáticamente mediante `SupplierCompanyPolicyEvaluator` que verifica:
- Estado ARCA del proveedor
- Vigencia de documentos
- Categoría de negocio

### Entidad CompanySupplier

Ubicacion: `SICST.Domain/Entities/CompanySupplier.cs`

Representa la relacion entre una empresa/tenant comprador y un proveedor.

Campos:

- `Id`
- `CompanyId`
- `SupplierId`
- `LinkedAtUtc`

### Endpoints de proveedores

Controller: `SuppliersController`

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| POST | `/api/suppliers/register` | Público | Registra usuario proveedor y perfil |
| GET | `/api/suppliers` | `purchases:manage` | Listado paginado con filtros (search, rubro, province, locality) |
| GET | `/api/suppliers/by-user/{userId}` | JWT | Perfil del proveedor por userId |
| POST | `/api/suppliers/{supplierId}/documents` | JWT | Sube PDF con hash SHA256 y fecha de vencimiento |
| GET | `/api/suppliers/{supplierId}/documents` | JWT | Lista documentos del proveedor |
| GET | `/api/suppliers/{supplierId}/documents/alerts` | JWT | Documentos por vencer o vencidos |
| GET | `/api/suppliers/documents/expiring` | `purchases:manage` | Todos los documentos próximos a vencer (filtro global) |
| POST | `/api/suppliers/documents/{documentId}/observations` | `purchases:evaluate` | Evaluador observa documento → requiere remediación |
| POST | `/api/suppliers/documents/{documentId}/remediations` | JWT | Proveedor subsana observaciones |
| POST | `/api/suppliers/documents/{documentId}/verdicts` | `purchases:evaluate` | Evaluador aprueba/rechaza documento |
| POST | `/api/companies/{companyId}/suppliers/{supplierId}/enable` | `suppliers:manage` | Vincular/habilitar proveedor para una empresa compradora |
| GET | `/api/suppliers/{supplierId}/invitations` | JWT | Invitaciones del proveedor |
| PATCH | `/api/suppliers/invitations/{invitationId}/respond` | JWT | Aceptar/rechazar invitación |
| GET | `/api/suppliers/{supplierId}/auctions` | JWT | Subastas del proveedor |
| GET | `/api/suppliers/{supplierId}/auctions/{auctionId}` | JWT | Detalle subasta del proveedor |

### Verificacion ARCA

La verificacion ARCA esta mockeada.

Regla actual:

- CUIT que no termina en `-0`: queda `Verified`.
- CUIT que termina en `-0`: queda `Pending`.

Mas adelante deberia reemplazarse por integracion real.

## Sprint 4 - Configuracion

Estado: implementado base.

### Entidad ContractingMode

Ubicacion: `SICST.Domain/Entities/ContractingMode.cs`

Representa las modalidades de contratacion habilitadas para una empresa.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `Id` | Guid | |
| `CompanyId` | Guid | Empresa |
| `Name` | string | Nombre (ej: "Licitación Pública") |
| `Description` | string | |
| `MinAmount` | decimal | Monto mínimo para esta modalidad |
| `MaxAmount` | decimal? | Monto máximo (null = sin límite superior) |
| `RequiresAuction` | bool | Si requiere subasta inversa |
| `Active` | bool | |
| `CreatedAtUtc` | DateTime | |

**Reglas (`ContractingModeRules`):**
- Los rangos de montos entre modalidades no pueden superponerse para una misma empresa
- `MinAmount` debe ser menor que `MaxAmount` (si ambos existen)

### Entidad ApprovalWorkflow

Ubicacion: `SICST.Domain/Entities/ApprovalWorkflow.cs`

Representa un circuito de aprobacion por empresa, con niveles de aprobacion, montos y roles.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `Id` | Guid | |
| `CompanyId` | Guid | Empresa |
| `Name` | string | Nombre del circuito |
| `MinAmount` | decimal | Monto mínimo |
| `MaxAmount` | decimal? | Monto máximo (null = sin límite) |
| `Active` | bool | |
| `CreatedAtUtc` | DateTime | |
| `Levels` | List\<ApprovalWorkflowLevel\> | Niveles de aprobación |

### Entidad ApprovalWorkflowLevel

Ubicacion: `SICST.Domain/Entities/ApprovalWorkflowLevel.cs`

Representa un nivel dentro del circuito de aprobación.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `Id` | Guid | |
| `ApprovalWorkflowId` | Guid | Workflow padre |
| `LevelOrder` | int | Orden del nivel (1, 2, 3...) |
| `RequiredRole` | UserRole | Rol que aprueba en este nivel |
| `RequiredApprovals` | int | Cantidad de aprobaciones necesarias |
| `IsParallel` | bool | Si las aprobaciones son paralelas (todos al mismo tiempo) o secuenciales |

**Routing (`ApprovalWorkflowRouting`):**
- Secuencial: nivel 1 → nivel 2 → nivel 3
- Paralelo: todos los aprobadores del nivel reciben notificación simultánea

**Validaciones:**
- `RequiredApprovals` >= 1
- `MinAmount` < `MaxAmount` si ambos existen

### Entidad DocumentTemplate

Ubicacion: `SICST.Domain/Entities/DocumentTemplate.cs`

Representa una plantilla de documento configurable por empresa.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `Id` | Guid | |
| `CompanyId` | Guid | Empresa |
| `Type` | enum | `AwardAct`, `Contract`, `PurchaseOrder` |
| `Name` | string | Nombre descriptivo |
| `Version` | int | Versión actual (incrementa al modificar) |
| `Content` | string | Contenido HTML/plantilla |
| `Active` | bool | Si es la versión activa |
| `CreatedAtUtc` | DateTime | |

Solo puede haber **una** versión activa por tipo de documento por empresa. Al crear una nueva versión, la anterior se desactiva automáticamente.

Reglas de validación (`DocumentTemplateRules`):
- El contenido no puede estar vacío
- El nombre es obligatorio
- Al activar una versión, las demás del mismo tipo se desactivan

### Entidad CompanyConfiguration

Ubicacion: `SICST.Domain/Entities/CompanyConfiguration.cs`

Configuracion operativa general de una empresa.

Campos:

- `Id`
- `CompanyId`
- `DefaultCurrency`
- `TimeZone`
- `MinimumBidDecrementPercentage`
- `AuctionExtensionMinutes`
- `RequireSupplierVerification`
- `UpdatedAtUtc`

Valores por defecto devueltos cuando la empresa todavia no tiene configuracion persistida:

- `DefaultCurrency`: `ARS`
- `TimeZone`: `America/Argentina/Buenos_Aires`
- `MinimumBidDecrementPercentage`: `1`
- `AuctionExtensionMinutes`: `2`
- `RequireSupplierVerification`: `true`

### Endpoints de configuracion

Controller: `ConfigurationController`

Base path:

```http
/api/companies/{companyId}/configuration
```

#### Company Configuration

| Método | Endpoint | Permiso | Descripción |
|--------|----------|---------|-------------|
| GET | `/api/companies/{companyId}/configuration` | `configuration:read` | Obtener configuración general |
| PUT | `/api/companies/{companyId}/configuration` | `configuration:manage` | Crear o actualizar configuración |

#### Contracting Modes

| Método | Endpoint | Permiso | Descripción |
|--------|----------|---------|-------------|
| GET | `/api/companies/{companyId}/configuration/contracting-modes` | `configuration:read` | Listar modalidades |
| GET | `/api/companies/{companyId}/configuration/contracting-modes/suggest?amount=100000` | `configuration:read` | Sugerir modalidad según monto |
| POST | `/api/companies/{companyId}/configuration/contracting-modes` | `configuration:manage` | Crear modalidad con rango de montos |
| PUT | `/api/companies/{companyId}/configuration/contracting-modes/{id}` | `configuration:manage` | Actualizar modalidad |
| DELETE | `/api/companies/{companyId}/configuration/contracting-modes/{id}` | `configuration:manage` | Eliminar modalidad |

#### Approval Workflows

| Método | Endpoint | Permiso | Descripción |
|--------|----------|---------|-------------|
| GET | `/api/companies/{companyId}/configuration/approval-workflows` | `configuration:read` | Listar circuitos con niveles |
| POST | `/api/companies/{companyId}/configuration/approval-workflows` | `configuration:manage` | Crear circuito con niveles |
| PUT | `/api/companies/{companyId}/configuration/approval-workflows/{id}` | `configuration:manage` | Actualizar circuito y niveles |
| DELETE | `/api/companies/{companyId}/configuration/approval-workflows/{id}` | `configuration:manage` | Eliminar circuito |

#### Document Templates

| Método | Endpoint | Permiso | Descripción |
|--------|----------|---------|-------------|
| GET | `/api/companies/{companyId}/configuration/document-templates?type=Contract` | `configuration:read` | Listar plantillas (filtro por tipo opcional) |
| POST | `/api/companies/{companyId}/configuration/document-templates` | `configuration:manage` | Crear plantilla versión 1 |
| POST | `/api/companies/{companyId}/configuration/document-templates/{id}/activate` | `configuration:manage` | Activar versión específica |

**Ejemplos:**

```json
// POST /api/companies/{companyId}/configuration/document-templates
// Request
{
  "companyId": "guid...",
  "type": 1,
  "name": "Contrato de Obra Pública",
  "content": "<html><body><h1>Contrato {{numero}}</h1><p>Monto: ${{monto}}</p></body></html>"
}
// Response 200
{
  "id": "guid...",
  "companyId": "guid...",
  "type": "Contract",
  "name": "Contrato de Obra Pública",
  "version": 1,
  "content": "<html>...",
  "active": true,
  "createdAtUtc": "2026-06-25T20:00:00Z"
}
```

Variabes disponibles en el template:
- `{{numero}}` — número de contrato
- `{{monto}}` — monto formateado
- `{{proveedor}}` — nombre del proveedor
- `{{organismo}}` — nombre de la empresa

Permisos usados:

- `configuration:read`
- `configuration:manage`

Seed de permisos:

- `SuperAdmin`: puede leer y gestionar configuracion.
- `Admin`: puede leer y gestionar configuracion.

## Sprint 5 - Procesos de Compra

Estado: implementado base.

### Entidad PurchaseProcess

Ubicacion: `SICST.Domain/Entities/PurchaseProcess.cs`

Representa un proceso de compra de una empresa/tenant.

Campos:

- `Id`
- `CompanyId`
- `BuyerId`
- `ContractingModeId`
- `Code`
- `Title`
- `Description`
- `EstimatedBudget`
- `Status`
- `CreatedAtUtc`
- `PublishedAtUtc`
- `ClosedAtUtc`

Estados:

- `Draft`
- `Published`
- `Closed`

### Entidad PurchaseItem

Ubicacion: `SICST.Domain/Entities/PurchaseItem.cs`

Representa los items/renglones del proceso.

Campos:

- `Id`
- `PurchaseProcessId`
- `Description`
- `Quantity`
- `Unit`
- `EstimatedUnitPrice`

### Entidad Invitation

Ubicacion: `SICST.Domain/Entities/Invitation.cs`

Representa la invitacion de un proveedor a un proceso de compra.

Campos:

- `Id`
- `PurchaseProcessId`
- `SupplierId`
- `Status`
- `InvitedAtUtc`

Estados:

- `Pending`
- `Accepted`
- `Rejected`

### Endpoints de procesos de compra

Controller: `PurchaseProcessesController`

Base path:

```http
/api/companies/{companyId}/purchase-processes
```

Endpoints:

- `GET /api/companies/{companyId}/purchase-processes`
- `GET /api/companies/{companyId}/purchase-processes/{id}`
- `POST /api/companies/{companyId}/purchase-processes`
- `PUT /api/companies/{companyId}/purchase-processes/{id}`
- `POST /api/companies/{companyId}/purchase-processes/{id}/publish`
- `POST /api/companies/{companyId}/purchase-processes/{id}/close`
- `POST /api/companies/{companyId}/purchase-processes/{id}/invitations`

Permiso usado:

- `purchases:manage`

Reglas actuales:

- Un proceso nace en estado `Draft`.
- Solo un proceso `Draft` puede editarse.
- Solo un proceso `Draft` puede publicarse.
- Un proceso publicado pasa a `Published`.
- Un proceso puede cerrarse y pasa a `Closed`.
- No se puede invitar dos veces al mismo proveedor al mismo proceso.
- No se puede invitar proveedores a procesos cerrados.

## Sprint 6 - Subasta Inversa

Estado: implementado base.

### Entidad Auction

Ubicacion: `SICST.Domain/Entities/Auction.cs`

Representa la subasta inversa asociada a un proceso de compra publicado.

Campos:

- `Id`
- `PurchaseProcessId`
- `CompanyId`
- `BasePrice`
- `MinimumDecrementPercentage`
- `Status`
- `StartsAtUtc`
- `EndsAtUtc`
- `ClosedAtUtc`

Estados:

- `Open`
- `Closed`

### Entidad AuctionParticipant

Ubicacion: `SICST.Domain/Entities/AuctionParticipant.cs`

Representa un proveedor habilitado para ofertar en una subasta.

Campos:

- `Id`
- `AuctionId`
- `SupplierId`
- `Active`
- `JoinedAtUtc`

Al iniciar una subasta se crean participantes a partir de las invitaciones del proceso.

### Entidad Bid

Ubicacion: `SICST.Domain/Entities/Bid.cs`

Representa un lance/oferta de proveedor.

Campos:

- `Id`
- `AuctionId`
- `SupplierId`
- `Amount`
- `PlacedAtUtc`

### Reglas de oferta

Implementadas en `PlaceBidCommandHandler`.

Validaciones:

- La subasta debe estar `Open`.
- El horario actual debe estar entre `StartsAtUtc` y `EndsAtUtc`.
- El proveedor debe ser participante activo de la subasta.
- La oferta debe ser menor al precio actual.
- La oferta debe respetar el decremento minimo configurado por empresa.

El decremento minimo se toma de `CompanyConfiguration.MinimumBidDecrementPercentage`.

### Endpoints de subasta

Controller: `AuctionsController`

Endpoints:

- `POST /api/companies/{companyId}/purchase-processes/{purchaseProcessId}/auction/start`
- `GET /api/companies/{companyId}/purchase-processes/{purchaseProcessId}/auction`
- `POST /api/companies/{companyId}/auctions/{auctionId}/bids`
- `POST /api/companies/{companyId}/auctions/{auctionId}/close`

### SignalR

Hub:

```text
/hubs/auctions
```

Metodo del hub:

- `JoinAuction(Guid auctionId)`
- `LeaveAuction(Guid auctionId)`

Eventos emitidos:

- `AuctionUpdated`
- `BidPlaced`
- `AuctionClosed`

### Redis / estado en memoria

Se agrego la interfaz:

```text
IAuctionStateCache
```

Implementacion actual:

```text
InMemoryAuctionStateCache
```

Esto deja preparado el cambio a Redis real sin tocar las reglas de negocio. Para produccion, esta implementacion debe reemplazarse por una basada en Redis.

### Portal ciudadano en vivo

Endpoint SSE publico:

```http
GET /api/public/auctions/{auctionId}/events
```

Devuelve eventos `auction` con el estado actual de la subasta cada 2 segundos hasta que la subasta cierre.

## Sprint 11 - MFA y Access Logs

Estado: implementado.

Este sprint consolida la funcionalidad de autenticación multifactor y el registro de accesos. Los detalles de implementación están documentados en Sprint 2 (MFA, Refresh Tokens y entidad AccessLog) y Sprint 9 (Access Logs endpoint).

### Resumen

| Componente | Archivo(s) | Propósito |
|------------|------------|-----------|
| `IMfaProvider` | `SICST.Application/Common/Interfaces/IMfaProvider.cs` | Interfaz TOTP |
| `TotpMfaProvider` | `SICST.Infrastructure/Security/TotpMfaProvider.cs` | Generación y verificación TOTP |
| `SetupMfaCommand` | `SICST.Application/Auth/Commands/SetupMfaCommand.cs` | Iniciar setup MFA |
| `VerifyMfaCommand` | `SICST.Application/Auth/Commands/VerifyMfaCommand.cs` | Verificar código + completar login |
| `EnableMfaCommand` | `SICST.Application/Auth/Commands/EnableMfaCommand.cs` | Activar MFA |
| `DisableMfaCommand` | `SICST.Application/Auth/Commands/DisableMfaCommand.cs` | Desactivar MFA |
| `RefreshTokenHelper` | `SICST.Application/Auth/Commands/RefreshTokenHelper.cs` | Generación y hash de refresh tokens |
| `AccessLog` | `SICST.Domain/Entities/AccessLog.cs` | Entidad de log de acceso |
| `GetAccessLogsQuery` | `SICST.Application/Audit/Queries/GetAccessLogsQuery.cs` | Consulta de access logs |
| `ICurrentTenant` | `SICST.Application/Common/Interfaces/ICurrentTenant.cs` | Tenant actual para acceso sincrónico |

### Migraciones

| Migración | Descripción |
|-----------|-------------|
| `20260625194155_AddMfaAndAccessLogs` | Crea campos MFA en User, tabla AccessLog |

### Permisos

No se agregaron permisos nuevos para MFA. Los endpoints `/setup`, `/enable`, `/disable` requieren JWT (usuario autenticado). La verificación MFA es pública (requiere `mfaToken` temporal).

## Pruebas automaticas

Comando:

```powershell
dotnet test backend\SICST.slnx
```
Tests actualizados en esta sesión:

| Archivo | Líneas agregadas |
|---------|-----------------|
| `AuthTests.cs` | +128 (MFA flows, refresh tokens, access logs) |
| `ConfigurationHandlerTests.cs` | +144 (DocumentTemplates, Workflows, ContractingModes) |
| `PurchaseProcessHandlerTests.cs` | +157 (aprobaciones multi-nivel, contratos) |
| `SupplierHandlerTests.cs` | +403 (documentos con hash/expiry, reviews, políticas CompanySupplier) |
| `AuctionHandlerTests.cs` | +3 |
| `AuditEventTests.cs` | +2 |
| `CompanyHandlerTests.cs` | +2 |

Advertencia conocida:

- El proyecto de tests muestra un warning por versiones mezcladas de Entity Framework Core (`10.0.4` y `10.0.9`). No rompe la ejecucion, pero conviene alinear versiones.

## Integracion con frontend

Frontend consume:

**Autenticación:**
- `POST /api/auth/login` — login con/sin MFA
- `POST /api/auth/refresh` — refresh token rotativo
- `POST /api/auth/logout` — cierre de sesión
- `POST /api/auth/mfa/setup` — setup MFA (QR)
- `POST /api/auth/mfa/verify` — verificar código MFA
- `POST /api/auth/mfa/enable` — activar MFA
- `POST /api/auth/mfa/disable` — desactivar MFA
- `POST /api/auth/profile` — actualizar perfil

**Proveedores:**
- `POST /api/suppliers/register` — registro público
- `GET /api/suppliers` — listado paginado con filtros
- `GET /api/suppliers/by-user/{userId}` — perfil propio
- `POST /api/suppliers/{supplierId}/documents` — subir documento
- `GET /api/suppliers/{supplierId}/documents` — listar documentos
- `GET /api/suppliers/documents/expiring` — docs por vencer
- `POST /api/suppliers/documents/{id}/observations` — observar doc
- `POST /api/suppliers/documents/{id}/remediations` — subsanar doc
- `POST /api/suppliers/documents/{id}/verdicts` — aprobar/rechazar doc
- `POST /api/companies/{companyId}/suppliers/{supplierId}/enable` — habilitar proveedor en empresa

**Empresas (tenants):**
- `GET /api/companies` — listar
- `GET /api/companies/{id}` — detalle
- `POST /api/companies/with-admin` — crear con admin
- `PUT /api/companies/{id}` — actualizar

**Configuración:**
- `GET /api/companies/{id}/configuration` — obtener config
- `PUT /api/companies/{id}/configuration` — actualizar config
- `GET /api/companies/{id}/configuration/contracting-modes` — listar modalidades
- `POST /api/companies/{id}/configuration/contracting-modes` — crear modalidad
- `GET /api/companies/{id}/configuration/contracting-modes/suggest` — sugerir modalidad
- `GET /api/companies/{id}/configuration/approval-workflows` — listar circuitos
- `POST /api/companies/{id}/configuration/approval-workflows` — crear circuito
- `GET /api/companies/{id}/configuration/document-templates` — listar plantillas
- `POST /api/companies/{id}/configuration/document-templates` — crear plantilla

**Auditoría:**
- `GET /audit/events` — eventos de auditoría
- `GET /audit/events/access-logs` — logs de acceso

El token se guarda en `localStorage` bajo la clave:

```text
sicst.sesion
```

`client.js` lee `sesion.token` y envia:

```http
Authorization: Bearer {token}
```

## Pendientes recomendados

### Completados en esta sesión

- ✅ Refresh tokens reales persistidos con rotación (RefreshTokenHelper)
- ✅ CRUD backend de proveedores: listado paginado, filtros (GetSuppliersQuery)
- ✅ Vinculación `CompanySupplier` con políticas y estados (SupplierCompanyPolicyEvaluator)
- ✅ CRUD completo modalidades de contratación (PUT, DELETE + rangos de montos)
- ✅ CRUD completo circuitos de aprobación (PUT, DELETE + niveles multi-nivel)
- ✅ Supplier Document Reviews (observaciones, remediaciones, veredictos)
- ✅ Document Templates con versionado y activación
- ✅ MFA (TOTP) con QR, backup codes, verificación
- ✅ Access Logs para eventos de autenticación

### Pendientes

1. Alinear versiones de paquetes EF Core (`10.0.4` y `10.0.9`).
2. Usar `ICurrentTenant` en todos los endpoints tenant-scoped.
3. Completar UI frontend para configuración (document templates, workflows).
4. Completar UI frontend para revisión de documentos de proveedores.
5. Reemplazar `InMemoryAuctionStateCache` por Redis real.
6. Conectar el frontend a SignalR para actualizar lances sin polling.
7. Completar permisos específicos para contratación y recepción si se separan roles operativos.
8. Notificaciones por email para: documentos por vencer, invitaciones a procesos, cambios de estado.
9. Tests de integración E2E.

## Sprint 8 - Contratos

Estado: implementado base.

### Entidad Contract

Representa el contrato generado a partir de una adjudicacion.

Campos principales:

- `Id`
- `CompanyId`
- `PurchaseProcessId`
- `AwardId`
- `SupplierId`
- `Number`
- `Amount`
- `StartDateUtc`
- `EndDateUtc`
- `Status`
- `Terms`
- `DocumentPath`
- `CreatedAtUtc`
- `SignedAtUtc`

Estados:

- `Draft`
- `Active`
- `Completed`
- `Cancelled`

### Entidad PurchaseOrder

Representa la orden de compra emitida desde un contrato activo.

Campos principales:

- `Id`
- `CompanyId`
- `PurchaseProcessId`
- `ContractId`
- `SupplierId`
- `Number`
- `Amount`
- `Status`
- `IssuedAtUtc`
- `ExpectedDeliveryDateUtc`
- `Observations`
- `DocumentPath`

Estados:

- `Issued`
- `PartiallyReceived`
- `Received`
- `Cancelled`

### Entidad ReceptionConfirmation

Representa una confirmacion de recepcion de una orden de compra.

La recepcion permite entregas parciales mediante `ReceptionConfirmationItem`, que registra cantidades recibidas por item del proceso.

Campos principales:

- `Id`
- `PurchaseOrderId`
- `ReceivedById`
- `Status`
- `ReceivedAtUtc`
- `Observations`
- `DocumentPath`
- `Items`

Estados:

- `Accepted`
- `AcceptedWithObservations`
- `Rejected`

### Endpoints de contratacion

Base path:

```http
/api/companies/{companyId}
```

Endpoints:

- `POST /api/companies/{companyId}/purchase-processes/{id}/contract`
- `POST /api/companies/{companyId}/contracts/{contractId}/purchase-order`
- `POST /api/companies/{companyId}/purchase-orders/{purchaseOrderId}/receptions`
- `GET /api/companies/{companyId}/contracts/{contractId}/pdf`
- `GET /api/companies/{companyId}/purchase-orders/{purchaseOrderId}/pdf`
- `GET /api/companies/{companyId}/receptions/{receptionId}/pdf`

### Generación de PDF con Templates

El servicio `PdfGenerator` (`SICST.Infrastructure/Services/PdfGenerator.cs`) fue mejorado para usar las plantillas configurables de `DocumentTemplate`:

- Busca la plantilla activa de la empresa para el tipo de documento (Contract, PurchaseOrder, AwardAct)
- Si existe, renderiza el contenido HTML reemplazando variables con datos reales
- Si no existe plantilla configurada, usa una plantilla por defecto
- El PDF se genera con una librería HTML-to-PDF (PuppeteerSharp o similar)
- Se guarda en `uploads/contracts/` o `uploads/purchase-orders/` según corresponda

Reglas actuales:

- Solo se puede generar contrato para procesos `Adjudicated`.
- No se puede generar mas de un contrato por adjudicacion.
- La orden de compra se emite solo desde contratos `Active`.
- No se puede emitir mas de una orden por contrato.
- Las recepciones pueden ser parciales y acumulan cantidades por item.
- No se permite recibir mas cantidad que la solicitada en el proceso.
- Cuando todos los items quedan recibidos, la orden pasa a `Received` y el proceso a `Received`.

## Sprint 9 - Auditoria

Estado: implementado base.

### Entidad AuditEvent

Ubicacion: `SICST.Domain/Entities/AuditEvent.cs`

Representa un evento global de auditoria generado automaticamente al persistir cambios sobre entidades del sistema.

Campos:

- `Id`
- `Sequence`
- `CompanyId`
- `EntityName`
- `EntityId`
- `Action`
- `Payload`
- `CreatedAtUtc`
- `PreviousHash`
- `Hash`

Acciones:

- `Created`
- `Updated`
- `Deleted`

### Hash encadenado SHA256

La auditoria se genera desde `ApplicationDbContext.SaveChangesAsync`.

Cada evento calcula un hash SHA256 con:

- secuencia
- hash previo
- empresa
- entidad
- id de entidad
- accion
- fecha
- payload JSON

El primer evento usa `PreviousHash` vacio. Cada evento siguiente guarda como `PreviousHash` el `Hash` del evento anterior, formando una cadena auditable.

`AuditEvent` se excluye de su propia auditoria para evitar recursividad.

### Endpoint de consulta auditor

Controller: `AuditController`

Endpoint:

```http
GET /audit/events
```

Permiso requerido:

- `audit:read`

Filtros opcionales:

- `companyId`
- `entityName`
- `action`
- `fromUtc`
- `toUtc`
- `limit`

Ejemplo:

```http
GET /audit/events?companyId={companyId}&entityName=PurchaseProcess&limit=100
```

### Endpoint de Access Logs

Controller: `AuditController`

Endpoint:

```http
GET /audit/events/access-logs
```

Permiso requerido:

- `audit:read`

Filtros opcionales:

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `companyId` | Guid? | Filtrar por empresa |
| `email` | string? | Filtrar por email |
| `eventType` | AccessLogEventType? | `LoginSucceeded`, `LoginFailed`, `MfaSucceeded`, etc. |
| `success` | bool? | Solo exitosos o solo fallidos |
| `fromUtc` | DateTime? | Desde fecha |
| `toUtc` | DateTime? | Hasta fecha |
| `limit` | int | Máximo de registros (default 200) |

Ejemplo:

```http
GET /audit/events/access-logs?eventType=LoginFailed&fromUtc=2026-06-01&limit=50
```

## Sprint 10 - Portal Publico

Estado: implementado base.

El portal publico permite consultar informacion sin iniciar sesion.

### Consulta publica de procesos

Endpoint:

```http
GET /api/public/purchase-processes
```

Filtros opcionales:

- `companyId`
- `search`

Devuelve procesos en estados publicables:

- `Approved`
- `InAuction`
- `Evaluation`
- `Adjudicated`
- `Contracted`
- `PurchaseOrderIssued`
- `Received`
- `Closed`

No expone informacion interna de usuarios ni permisos.

### Consulta publica de adjudicaciones

Endpoint:

```http
GET /api/public/awards
```

Filtros opcionales:

- `companyId`
- `search`

Devuelve proceso, organismo, proveedor adjudicado, monto, fecha y URL del acta.

### Consulta publica de subastas en vivo

Endpoint de listado:

```http
GET /api/public/auctions/live
```

Devuelve subastas abiertas y dentro de su ventana horaria.

Endpoint SSE:

```http
GET /api/public/auctions/{auctionId}/events
```

Emite eventos `auction` cada 2 segundos hasta que la subasta cierre.

### Frontend

Ruta publica:

```text
/publico
```

Incluye pestañas para:

- procesos
- adjudicaciones
- subastas en vivo con actualizacion SSE

---

## 📋 Changelog

### [Sesión 2026-06-25] — Frontend: Modernización dashboard, formularios empresa y perfil

#### ✨ Agregado
- **Lucide React**: instalado e integrado en sidebar (`Layout.jsx`) y formularios
- **Iconos en sidebar**: `LayoutDashboard`, `Users`, `Settings`, `Building2`, `ShoppingCart`, `ClipboardCheck`, `Truck`, `Award`, `Hammer`, `ShieldCheck`, `UserCircle`, `LogOut`
- **Validación cliente**: campos requeridos con `*` y errores inline en formulario de creación de empresa y perfil
- **Grid 2 columnas**: nombre/apellido lado a lado en formularios (empresa y perfil)
- **Badge de estado MFA**: colores verde (activo) / gris (inactivo)
- **Ancho de formularios**: aumentado de 520px a 640px

#### 🔧 Modificado
- `frontend/src/index.css`: paleta slate (`#f8fafc`, `#e2e8f0`, `#64738b`), nuevas variables CSS (`--color-warn-bg/tx`, `--color-info-bg/tx`, `--sombra`, `--sombra-md`)
- `frontend/src/App.css`: botones con sombra/hover, alertas con variables, focus ring azul, layout con header 56px y sombra, sidebar 220px con hover `#f1f5f9` / activo `#eff6ff`, tablas con sombra y border-radius 10px, badges pill, panel grid 200px min
- `frontend/src/components/Layout.jsx`: Lucide icons por sección, header con `.layout__marca` para separar logo/nombre empresa
- `frontend/src/features/tenants/TenantFormPage.jsx`: validación inline por campo, grid 2 columnas para logo/color y admin nombre/apellido, iconos Lucide en títulos y campos, botón submit con icono, modal de éxito con `CheckCircle`, subtítulos descriptivos
- `frontend/src/features/perfil/PerfilPage.jsx`: secciones con iconos (`User`, `Lock`, `Shield`), grid 2 columnas nombre/apellido y nueva/repetir contraseña, badge de estado MFA, botones con iconos (`Save`, `RefreshCw`, `Smartphone`, `RotateCcw`), labels con iconos en campos de contraseña
- `frontend/src/auth/permisos.js`: `puedeGestionarUsuarios` restringido solo a `ADMINISTRADOR` (SuperAdmin ya no ve usuarios)

### [Sesión 2026-06-25] — Sprint 11: MFA, Document Templates, Supplier Management

#### ✨ Agregado
- **MFA TOTP**: setup con QR (`/api/auth/mfa/setup`), verificación (`/api/auth/mfa/verify`), activación/desactivación, flujo de login con challenge
- **Refresh tokens rotativos**: persistidos en BD con hash SHA256, expiración a 30 días, invalidación al rotar
- **Access Logs**: entidad `AccessLog` + endpoint `GET /audit/events/access-logs` con filtros
- **Document Templates**: entidad `DocumentTemplate` con versionado, activación por versión, tipos `AwardAct`, `Contract`, `PurchaseOrder`
- **Approval Workflow Levels**: niveles multi-nivel secuenciales/paralelos, `ApprovalWorkflowLevel`, routing configurable
- **Contracting Mode Amount Ranges**: `MinAmount`/`MaxAmount` por modalidad, reglas de no superposición, endpoint `/suggest`
- **Supplier Business Category**: campo `BusinessCategory` en `Supplier`
- **Supplier Document Hash & Expiry**: `Sha256Hash` y `ExpiresAtUtc` en documentos
- **Supplier Document Reviews**: flujo completo observación → remediación → veredicto
- **CompanySupplier Status & Policy**: estados `Enabled`, `EnabledWithWarning`, `Blocked`, evaluador de políticas
- **PDF Generator**: mejorado para usar plantillas configurables de `DocumentTemplate`
- **Reset Admin Password**: endpoint `POST /api/auth/reset-password` para SuperAdmin/Admin
- **Frontend modal contraseña temporal**: al crear tenant se muestra la contraseña en un modal antes de redirigir

#### 🔧 Modificado
- `AuthController.cs` (+142): MFA endpoints, refresh token rotation, logout con invalidación
- `SuppliersController.cs` (+159): listado paginado, documentos con hash/expiry, reviews, vinculación empresa
- `ConfigurationController.cs` (+139): CRUD completo document-templates, approval-workflows, contracting-modes
- `AuditController.cs` (+22): nuevo endpoint `/access-logs`
- `User.cs`: campos `MfaEnabled`, `MfaSecret`, `RefreshTokenHash`, `RefreshTokenExpiresAtUtc`
- `SupplierDocument.cs`: campos `Sha256Hash`, `ExpiresAtUtc`, `Status`, `AlertSentAtUtc`, `Reviews`
- `CompanySupplier.cs`: campos `Status`, `WarningMessage`, `EvaluatedAtUtc`
- `ContractingMode.cs`: campos `MinAmount`, `MaxAmount`
- `ApplicationDbContext.cs` (+185): nuevas entidades y relaciones
- `TenantFormPage.jsx`: modal con contraseña temporal al crear tenant

#### 🧪 Tests
- `AuthTests.cs` (+128): MFA flows, refresh token rotation, access logs
- `ConfigurationHandlerTests.cs` (+144): document templates, workflows, contracting modes
- `SupplierHandlerTests.cs` (+403): documentos, reviews, políticas, vinculación
- `PurchaseProcessHandlerTests.cs` (+157): aprobaciones multi-nivel
- Total: ~800+ líneas nuevas de tests

#### 📦 Migraciones nuevas (8)
| Migración | Cambios |
|-----------|---------|
| `20260625194155_AddMfaAndAccessLogs` | MFA User fields, AccessLog table |
| `20260625201103_AddSupplierDocumentHashAndExpiry` | Sha256Hash, ExpiresAtUtc en SupplierDocument |
| `20260625202156_AddCompanySupplierStatusPolicy` | Status, EvaluatedAtUtc en CompanySupplier |
| `20260625204338_AddSupplierBusinessCategory` | BusinessCategory en Supplier |
| `20260625205107_AddSupplierDocumentReviews` | SupplierDocumentReview table |
| `20260625205809_AddContractingModeAmountRanges` | MinAmount, MaxAmount en ContractingMode |
| `20260625211713_AddApprovalWorkflowLevels` | ApprovalWorkflowLevel table + FK |
| `20260625212845_AddDocumentTemplates` | DocumentTemplate table |
