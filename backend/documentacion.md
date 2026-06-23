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

`Email` tiene indice unico.

`Active` tiene default `true`.

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
- `UploadedAtUtc`

Tipos:

- `CuitCertificate`
- `TaxCertificate`
- `LegalDocument`
- `Other`

La subida actual acepta PDF y guarda el archivo bajo:

```text
uploads/suppliers/{supplierId}
```

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

Endpoints:

- `POST /api/suppliers/register`: publico. Registra usuario proveedor y perfil.
- `GET /api/suppliers/by-user/{userId}`: requiere JWT. Devuelve el perfil del proveedor.
- `POST /api/suppliers/{supplierId}/documents`: requiere JWT. Sube un PDF y registra metadata.

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

Campos:

- `Id`
- `CompanyId`
- `Name`
- `Description`
- `RequiresAuction`
- `Active`
- `CreatedAtUtc`

### Entidad ApprovalWorkflow

Ubicacion: `SICST.Domain/Entities/ApprovalWorkflow.cs`

Representa un circuito de aprobacion por empresa, con rango de montos y rol requerido.

Campos:

- `Id`
- `CompanyId`
- `Name`
- `MinAmount`
- `MaxAmount`
- `RequiredRole`
- `RequiredApprovals`
- `Active`
- `CreatedAtUtc`

Validaciones:

- `RequiredApprovals` debe ser mayor o igual a 1.
- Si ambos montos existen, `MinAmount` no puede ser mayor que `MaxAmount`.

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

Endpoints:

- `GET /api/companies/{companyId}/configuration`
- `PUT /api/companies/{companyId}/configuration`
- `GET /api/companies/{companyId}/configuration/contracting-modes`
- `POST /api/companies/{companyId}/configuration/contracting-modes`
- `GET /api/companies/{companyId}/configuration/approval-workflows`
- `POST /api/companies/{companyId}/configuration/approval-workflows`

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

## Pruebas automaticas

Comando:

```powershell
dotnet test backend\SICST.slnx
```

Estado actual:

```text
25 tests OK
```

Advertencia conocida:

- El proyecto de tests muestra un warning por versiones mezcladas de Entity Framework Core (`10.0.4` y `10.0.9`). No rompe la ejecucion, pero conviene alinear versiones.

## Integracion con frontend

Frontend consume:

- `POST /api/auth/login`
- `POST /api/suppliers/register`
- `GET /api/suppliers/by-user/{userId}`
- `GET /api/companies`
- `GET /api/companies/{id}`
- `POST /api/companies/with-admin`
- `PUT /api/companies/{id}`

El token se guarda en `localStorage` bajo la clave:

```text
sicst.sesion
```

`client.js` lee `sesion.token` y envia:

```http
Authorization: Bearer {token}
```

## Pendientes recomendados

Prioridad proxima:

1. Alinear versiones de paquetes EF Core.
2. Implementar refresh tokens reales persistidos.
3. Agregar CRUD backend de usuarios.
4. Usar `ICurrentTenant` en endpoints tenant-scoped.
5. Completar administracion interna de proveedores: listado, verificacion manual y vinculacion `CompanySupplier`.
6. Agregar endpoints de actualizacion/desactivacion para modalidades y circuitos.
7. Completar UI/backend de items e invitaciones de proveedores.
8. Reemplazar `InMemoryAuctionStateCache` por Redis real.
9. Conectar el frontend a SignalR para actualizar lances sin polling.
10. Empezar Sprint 7: adjudicacion.
