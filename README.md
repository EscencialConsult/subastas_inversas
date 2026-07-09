# SICST — Subastas Inversas para Compras del Sector Público

Plataforma digital de contrataciones públicas que implementa subastas inversas electrónicas. Permite a organismos públicos gestionar procesos de compra completos: planificación, licitación, subastas inversas en vivo, contratación, recepción y pago. Incluye gestión de proveedores con validación documental, evaluación multicriterio, circuitos de aprobación multinivel y un portal ciudadano para transparencia.

---

## Stack Tecnológico

### Backend

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| .NET / ASP.NET Core | 10.0 | Web API framework |
| Entity Framework Core | 10.0.9 | ORM |
| PostgreSQL / Npgsql | 10.0.2 | Base de datos |
| MediatR | 14.1.0 | CQRS / mediator |
| JWT Bearer | — | Autenticación |
| BCrypt.Net-Next | 4.2.0 | Password hashing |
| QuestPDF | 2026.6.0 | Generación de PDF |
| StackExchange.Redis | 2.10.1 | Caché distribuido (preparado) |
| SignalR | — | Tiempo real (subastas) |

### Frontend

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| React | 19.2.6 | UI framework |
| TypeScript | 6.0.3 | Lenguaje tipado |
| Vite | 8.0.12 | Build / dev server |
| Tailwind CSS | 4.3.1 | Estilos |
| React Router DOM | 7.18.0 | Routing |
| TanStack React Query | 5.101.2 | Data fetching |
| React Hook Form + Zod | — | Formularios + validación |
| SignalR | 10.0.0 | Tiempo real |
| Framer Motion | 12.42.2 | Animaciones |
| Lucide React | 1.21.0 | Iconos |
| Storybook | 10.4.6 | Componentes aislados |
| Vitest / Playwright | — | Tests unitarios y E2E |

---

## Estructura del Repositorio

```
subastas_inversas/
├── backend/
│   ├── SICST.slnx
│   ├── documentacion.md
│   └── src/
│       ├── SICST.Api/              # Controllers, Middleware, Hubs, Config
│       ├── SICST.Application/      # CQRS, DTOs, Interfaces, Behaviors
│       ├── SICST.Domain/           # Entidades, Enums
│       ├── SICST.Infrastructure/   # JWT, PDF, Redis, Email, etc.
│       └── SICST.Persistence/     # EF Core, Migraciones, Seed
│   └── tests/
│       └── SICST.Tests/
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── main.tsx / App.tsx
│       ├── auth/                   # AuthContext, permisos, rutas protegidas
│       ├── app/                    # Layout, providers, routing
│       ├── shared/                 # UI kit, API client, hooks
│       ├── features/               # Módulos funcionales
│       └── domain/                 # Modelos compartidos
├── docs/
└── README.md
```

---

## Arquitectura del Backend (Clean Architecture)

```
┌─────────────────────────────┐
│         SICST.Api           │  HTTP, Middleware, SignalR, Swagger
├─────────────────────────────┤
│      SICST.Application      │  CQRS, Validación, Interfaces
├─────────────────────────────┤
│       SICST.Domain          │  Entidades, Enums (sin dependencias)
├─────────────────────────────┤
│    SICST.Infrastructure     │  JWT, BCrypt, PDF, Redis, Email
├─────────────────────────────┤
│     SICST.Persistence       │  EF Core, Migraciones, Seed
└─────────────────────────────┘
```

### Capas

- **Api** — Controladores HTTP, middleware (error handling, tenancy, seguridad, observabilidad), hubs SignalR, health checks, Swagger.
- **Application** — Comandos y queries CQRS + MediatR, DTOs, interfaces de servicio, behaviors (validación, tenant authorization, performance).
- **Domain** — Entidades de negocio puras, enumeraciones, sin dependencias externas.
- **Infrastructure** — Implementaciones técnicas: JWT, password hashing (BCrypt), generación de PDF (QuestPDF), antivirus, almacenamiento, email.
- **Persistence** — DbContext, configuraciones de entidades EF Core, migraciones, seed data inicial.

---

## Funcionalidades

### Backend (por Sprint)

| Sprint | Funcionalidad |
|--------|---------------|
| 0 | Base técnica: Clean Architecture, EF + PostgreSQL, Swagger, seed SuperAdmin |
| 1 | Multi-tenant por subdominio + header `X-Tenant-Domain` |
| 2 | JWT, roles, permisos, refresh tokens rotativos con SHA256 |
| 3 | Registro y gestión de proveedores, documentos con hash, revisiones, vinculación ARCA |
| 4 | Modalidades de contratación, circuitos de aprobación multinivel, plantillas, configuración |
| 5 | Procesos de compra, items, invitaciones, publicación/cierre |
| 6 | Subasta inversa en vivo con SignalR, lances, decremento mínimo |
| 8 | Contratos con PDF desde plantillas, órdenes de compra, recepciones parciales |
| 9 | Auditoría encadenada con SHA256 (tamper-proof) |
| 10 | Portal ciudadano público con SSE |
| 11 | MFA (TOTP), access logs, refresh tokens rotativos |

### Frontend

- Sistema de autenticación con MFA (login en 2 pasos)
- Dashboard multi-rol con navegación contextual
- Gestión de procesos de compra (creación, edición, publicación)
- Subasta inversa en vivo con actualizaciones en tiempo real
- Portal ciudadano público con SSE
- Módulo de proveedores (registro, documentación, oportunidades, ARCA, postulación)
- Evaluación y calificación de proveedores con criterios
- Configuración de empresa (modalidades, circuitos, plantillas)
- Auditoría y access logs
- Design system propio (56 componentes UI) con Storybook
- Branding dinámico por tenant (color primario, logo)
- Frontend 100% TypeScript con tsconfig estricto
- Organización FSD (Feature-Sliced Design) por dominio

---

## Roles y Permisos

| Rol | Permisos |
|-----|----------|
| **SuperAdmin** | Todos |
| **Admin** | Gestión usuarios, proveedores, compras, aprobación, evaluación, auditoría, configuración |
| **Comprador** | `purchases:manage` |
| **Proveedor** | Sin permisos internos |
| **Evaluador** | `purchases:evaluate` |
| **Auditor** | `audit:read` |
| **Autoridad** | `purchases:approve` |

---

## Base de Datos

- **Motor:** PostgreSQL
- **ORM:** Entity Framework Core 10.0.9 + Npgsql
- **Migraciones automáticas** al iniciar (configurable con `Database:InitializeOnStartup`)
- **Seed inicial:** Usuario SuperAdmin: `admin@sicst.com` / `Admin123!`

### Conexión

La connection string se resuelve en este orden:
1. Variable de entorno `DATABASE_URL` (formato `postgresql://user:pass@host/db?...`)
2. `ConnectionStrings:DefaultConnection` en appsettings

### Migraciones

El proyecto cuenta con 35 migraciones que cubren todas las entidades del sistema.

---

## Entidades del Dominio (30+)

`Company`, `User`, `Supplier`, `SupplierDocument`, `SupplierDocumentReview`, `SupplierEvaluation`, `EvaluationCriterion`, `CompanySupplier`, `PurchaseProcess`, `PurchaseItem`, `Invitation`, `Auction`, `AuctionParticipant`, `Bid`, `Award`, `AwardItem`, `Evaluation`, `Approval`, `Contract`, `ContractPayment`, `PurchaseOrder`, `ReceptionConfirmation`, `ContractingMode`, `ApprovalWorkflow`, `ApprovalWorkflowLevel`, `DocumentTemplate`, `CompanyConfiguration`, `AuditEvent`, `AccessLog`, `OutboxMessage`, `Permission`, `RolePermission`, `ReceptionConfirmationItem`, `SupplierCriterionResult`.

---

## Endpoints Principales de la API

| Categoría | Endpoints |
|-----------|-----------|
| **Auth** | `POST /api/auth/login`, `/refresh`, `/logout`, `/register`, `/reset-password`, `/mfa/*` |
| **Empresas** | `GET/POST /api/companies`, `GET/PUT /api/companies/{id}`, `POST .../with-admin` |
| **Proveedores** | `POST /api/suppliers/register`, `GET /api/suppliers`, documentos CRUD, revisiones, vinculación |
| **Configuración** | `GET/PUT .../configuration`, contracting-modes, approval-workflows, document-templates CRUD |
| **Procesos** | CRUD purchase-processes, publicar, cerrar, invitar |
| **Subastas** | iniciar, ofertar, cerrar + SignalR `/hubs/auctions` |
| **Portal Público** | `GET /api/public/purchase-processes`, `/awards`, `/auctions/live`, `/auctions/{id}/events` (SSE) |
| **Auditoría** | `GET /audit/events`, `GET /audit/events/access-logs` |
| **Health** | `GET /health/live`, `GET /health/ready` |

---

## Puertos

| Servicio | Puerto |
|----------|--------|
| Frontend (dev) | 5173 |
| Backend (API) | 5185 |
| PostgreSQL | 5432 |
| Storybook | 6006 |

---

## Inicio Rápido

### Requisitos

- .NET 10.0 SDK
- Node.js 22+
- PostgreSQL (o instancia en Neon)

### Backend

```powershell
# Configurar base de datos (ejemplo con Neon)
$env:DATABASE_URL="postgresql://user:password@host/db?sslmode=require"

# Iniciar
dotnet run --project backend/src/SICST.Api

# O sin variable (usa ConnectionStrings:DefaultConnection de appsettings)
dotnet run --project backend/src/SICST.Api

# Ejecutar tests
dotnet test backend/SICST.slnx
```

### Frontend

```powershell
cd frontend
npm install

# Iniciar dev server (http://localhost:5173)
npm run dev

# Typecheck
npm run typecheck

# Tests
npm run test

# Storybook
npm run storybook
```

---

## Variables de Entorno

### Backend

| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `DATABASE_URL` | No* | Connection string formato URI (prioridad sobre appsettings) |
| `ConnectionStrings:DefaultConnection` | No* | Connection string formato Npgsql |
| `Jwt:Secret` | Sí | Clave JWT (mín. 32 caracteres) |
| `Jwt:Issuer` | Sí | Emisor del token |
| `Jwt:Audience` | Sí | Audiencia del token |
| `Jwt:AccessTokenMinutes` | No | TTL del token (default: 15) |
| `Cors:AllowedOrigins` | No | Orígenes permitidos |
| `Database:InitializeOnStartup` | No | Migrar y seed al iniciar |

\* Se requiere al menos una de las dos primeras.

### Frontend

| Variable | Default | Descripción |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:5185` | URL base de la API |

---

## Seguridad

- **Autenticación:** JWT Bearer tokens
- **MFA:** TOTP (Google Authenticator, Authy) con QR
- **Refresh tokens:** Sistema rotativo con hash SHA256, 30 días de validez
- **Rate limiting:** 5 intentos/minuto en login, 5/2min en MFA, 20/min en refresh
- **CORS:** Orígenes configurados (localhost:5173 por defecto en desarrollo)
- **Data Protection:** Keys persistidas en archivo temporal (desarrollo)
- **Headers de seguridad:** `SecurityHeadersMiddleware`
- **Autorización:** Policy-based con permisos por rol

---

## Características Destacadas

1. **Multi-tenant real** — Por subdominio + header `X-Tenant-Domain`
2. **Subasta inversa en vivo** — SignalR para actualizaciones en tiempo real
3. **Portal ciudadano** — SSE para transparencia pública
4. **MFA (TOTP)** — Compatible con Google Authenticator y Authy
5. **Refresh tokens rotativos** — Con hash SHA256, 30 días de expiración
6. **Auditoría encadenada** — SHA256 tamper-proof
7. **PDF con plantillas** — Generación de documentos desde HTML configurable
8. **Circuitos de aprobación** — Multinivel, secuenciales y paralelos
9. **Evaluación de proveedores** — Criterios excluyentes y ponderados
10. **Revisión documental** — Flujo observación → remediación → veredicto
11. **Branding dinámico** — Color primario y logo por tenant
12. **Design system propio** — 56 componentes UI en Storybook con patrones documentados
