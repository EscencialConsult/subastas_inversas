# Instrucciones para probar SICST

## Requisitos

- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
- [Node.js 20+](https://nodejs.org/)
- [PostgreSQL 16+](https://www.postgresql.org/download/) (o Neon en la nube, ver seccion 1b)

---

## 1. Base de datos

### Opcion A — PostgreSQL local

Asegurate de tener PostgreSQL corriendo con:

| Dato | Valor |
|---|---|
| Host | `localhost` |
| Puerto | `5432` |
| Database | `sicst_db` |
| Usuario | `postgres` |
| Password | `postgres` |

### Opcion B — Neon (nube, sin instalar nada)

Cada desarrollador necesita su propia base de datos en [Neon](https://neon.tech):

1. Crear cuenta gratis en https://neon.tech
2. Crear un proyecto (se genera una base `neondb` automaticamente)
3. Copiar la **connection string** de la dashboard de Neon

Luego, al iniciar el backend, pasar la connection string como variable de entorno:

**Windows (cmd):**
```cmd
set ConnectionStrings__DefaultConnection=Host=...neon.tech;Port=5432;Database=neondb;Username=...;Password=...;SSL Mode=Require;Trust Server Certificate=true
dotnet run
```

**Windows (PowerShell):**
```powershell
$env:ConnectionStrings__DefaultConnection = "Host=...neon.tech;Port=5432;Database=neondb;Username=...;Password=...;SSL Mode=Require;Trust Server Certificate=true"
dotnet run
```

**Linux/Mac:**
```bash
export ConnectionStrings__DefaultConnection="Host=...neon.tech;Port=5432;Database=neondb;Username=...;Password=...;SSL Mode=Require;Trust Server Certificate=true"
dotnet run
```

> La base de datos se crea automaticamente al iniciar el backend por primera vez (migraciones + seed).

---

## 2. Backend

```bash
cd backend/src/SICST.Api
dotnet run
```

El backend arranca en `http://localhost:5185`.

**Seed inicial:** se crea un usuario SuperAdmin:

| Email | Contraseña |
|---|---|
| `admin@sicst.com` | `Admin123!` |

Tambien se crean todos los permisos y roles automaticamente.

**Swagger:** disponible en `http://localhost:5185/swagger`.

---

## 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

El frontend arranca en `http://localhost:5173`.

---

## 4. Flujo de prueba completo

### 4.1 Login como SuperAdmin

1. Abrir `http://localhost:5173/login`
2. Ingresar:
   - **Email:** `admin@sicst.com`
   - **Contraseña:** `Admin123!`

### 4.2 Crear un tenant (municipio/empresa)

1. Ir a **Tenants** en el menú lateral
2. Click en **+ Nuevo tenant**
3. Completar:
   - **Nombre:** `Municipio de Prueba`
   - **Subdominio:** `prueba`
   - **Email del admin:** `admin@prueba.gov.ar`
4. Click **Guardar**

Esto crea el tenant y un usuario Admin con contraseña temporal: `TempPassword123!`

### 4.3 Login como Admin del tenant

1. Cerrar sesión (click en **Salir**)
2. Login con:
   - **Email:** `admin@prueba.gov.ar`
   - **Contraseña:** `TempPassword123!`

### 4.4 Crear un usuario Comprador

1. Ir a **Usuarios** → **+ Nuevo usuario**
2. Completar:
   - **Nombre:** `Carlos`
   - **Apellido:** `Comprador`
   - **Email:** `carlos@prueba.gov.ar`
   - **Contraseña:** `Test123!`
   - **Rol:** `Comprador`
3. Click **Guardar**

### 4.5 Registrar un proveedor

1. Cerrar sesión
2. Ir a `http://localhost:5173/registro-proveedor`
3. Completar:
   - **Razon social:** `Insumos del Norte SRL`
   - **CUIT:** `30-12345678-9`
   - **Email:** `ventas@insumosnorte.com`
   - **Contraseña:** `Test123!`
   - **Provincia:** `Tucuman`
   - **Localidad:** `San Miguel de Tucuman`
4. Click **Registrarse**

> Repetir para registrar al menos 2 proveedores.

### 4.6 Login como Admin del tenant nuevamente

1. Ir a la página de proveedores: **Proveedores** en el menú lateral
2. Verificar que aparecen los proveedores registrados

### 4.7 Crear un proceso de compra e invitar proveedores

1. Ir a **Compras** → **+ Nuevo proceso**
2. Completar:
   - **Titulo:** `Compra de insumos de limpieza`
   - **Descripcion:** `Provisión de insumos para edificios municipales.`
   - **Presupuesto estimado:** `500000`
3. Agregar items (descripción, cantidad, unidad, precio unitario)
4. En la seccion **Seleccionar proveedores a invitar**, elegir proveedores del dropdown y click **Agregar**
5. Click **Guardar**

> El proceso se crea en estado **Borrador** y los proveedores seleccionados quedan invitados.

### 4.8 Enviar a aprobacion

1. Desde la lista de **Compras**, click en **Editar** sobre el proceso
2. Click **Enviar a aprobacion**
3. El proceso pasa a estado **Pendiente de aprobación**

### 4.9 Aprobar el proceso

> Para probar, podés loguearte como Aprobador y aprobar el proceso desde la seccion **Aprobaciones** (si creaste un usuario con ese rol).

Tambien podés ver el proceso desde la lista y ver su estado actual.

### 4.10 Ver invitaciones desde el proveedor

1. Cerrar sesión
2. Login como proveedor:
   - **Email:** `ventas@insumosnorte.com`
   - **Contraseña:** `Test123!`
3. Ir a **Mi cuenta**
4. En la seccion **Invitaciones a procesos**, se muestran las invitaciones recibidas
5. Click **Aceptar** o **Rechazar** para responder

### 4.11 Iniciar la subasta

1. Login como **Comprador** (`carlos@prueba.gov.ar` / `Test123!`)
2. Ir a **Compras** → editar el proceso
3. Click **Publicar** si sigue en borrador, y que alguien lo apruebe desde **Aprobaciones**
4. Una vez aprobado, editar el proceso nuevamente y click **Iniciar subasta**
5. La subasta se abre con duracion de 10 minutos y los proveedores aceptados quedan como participantes

### 4.12 Participar desde el proveedor

1. Login como **Proveedor** que aceptó la invitación
2. Ir a **Subastas** (menú lateral, sección **Subastas**)
3. Se muestra la subasta activa con código y datos
4. Click en la fila o en **Ver** para abrir el modal con detalles de la subasta (precio base, mejor oferta, lances, tiempo restante)
5. Click **Participar** para ir al monitor de subasta

### 4.13 Realizar lances

1. En el monitor, se ve:
   - Contador regresivo
   - Precio base, mejor oferta actual y tu mejor lance
   - Tabla de lances (se actualiza cada 5s)
2. En el panel lateral, ingresar un monto menor a la mejor oferta actual
3. Click **Ofertar**
4. **Regla:** no podés ofertar dos veces seguidas — si sos el último ofertante, el formulario se deshabilita y muestra un mensaje hasta que otro proveedor oferte

### 4.14 Probar la alternancia de lances

1. Abrir dos navegadores o ventanas de incógnito, uno con cada proveedor
2. Desde el Proveedor A: ofertar un monto menor
3. Desde el Proveedor B: esperar 5s a que se actualice, ofertar un monto aún menor
4. Volver al Proveedor A: el formulario ya debería estar disponible para ofertar de nuevo

### 4.15 Cierre de subasta

1. Login como **Comprador**
2. Ir a **Compras** → editar el proceso
3. Click **Cerrar subasta** (o esperar a que venza el tiempo)
4. La subasta pasa a estado **Cerrada** y los proveedores la ven en la sección **Subastas finalizadas**

---

## 5. Endpoints disponibles

### Proveedores

| Metodo | Ruta | Descripcion |
|---|---|---|
| `POST` | `/api/suppliers/register` | Registro público de proveedor |
| `GET` | `/api/suppliers` | Listar todos (requiere `purchases:manage`) |
| `GET` | `/api/suppliers/by-user/{userId}` | Obtener proveedor por usuario |
| `GET` | `/api/suppliers/{supplierId}/invitations` | Invitaciones del proveedor |
| `PATCH` | `/api/suppliers/invitations/{id}/respond` | Aceptar/rechazar invitacion |
| `GET` | `/api/suppliers/{supplierId}/auctions` | Listar subastas del proveedor |
| `GET` | `/api/suppliers/{supplierId}/auctions/{auctionId}` | Detalle de subasta (proveedor) |

### Procesos de compra

| Metodo | Ruta | Descripcion |
|---|---|---|
| `GET` | `/api/companies/{companyId}/purchase-processes` | Listar procesos |
| `POST` | `/api/companies/{companyId}/purchase-processes` | Crear proceso |
| `GET` | `/api/companies/{companyId}/purchase-processes/{id}` | Ver proceso |
| `PUT` | `/api/companies/{companyId}/purchase-processes/{id}` | Actualizar proceso |
| `POST` | `/api/companies/{companyId}/purchase-processes/{id}/publish` | Enviar a aprobacion |
| `POST` | `/api/companies/{companyId}/purchase-processes/{id}/close` | Cerrar proceso |
| `GET` | `/api/companies/{companyId}/purchase-processes/{id}/invitations` | Invitaciones del proceso |
| `POST` | `/api/companies/{companyId}/purchase-processes/{id}/invitations` | Invitar proveedor |

### Subastas (lado comprador)

| Metodo | Ruta | Descripcion |
|---|---|---|
| `POST` | `/api/companies/{companyId}/purchase-processes/{id}/auction/start` | Iniciar subasta |
| `GET` | `/api/companies/{companyId}/purchase-processes/{id}/auction` | Obtener subasta del proceso |
| `POST` | `/api/companies/{companyId}/auctions/{auctionId}/bids` | Registrar lance |
| `POST` | `/api/companies/{companyId}/auctions/{auctionId}/close` | Cerrar subasta |

---

## 6. Reglas de negocio implementadas

- **Alternancia de lances:** un proveedor no puede ofertar dos veces seguidas. Debe esperar a que otro proveedor oferte antes de hacer un nuevo lance.
- **Decremento mínimo:** cada oferta debe ser menor o igual al precio actual menos el porcentaje de decremento mínimo configurado.
- **Vencimiento por tiempo:** si la fecha de cierre de la subasta pasó, se trata como finalizada aunque nadie la haya cerrado manualmente. El botón "Participar" desaparece y la subasta se muestra en "Finalizadas".
- **Invitación obligatoria:** solo los proveedores invitados y que aceptaron la invitación participan en la subasta.

---

## 7. Credenciales rapidas

| Rol | Email | Contraseña |
|---|---|---|
| SuperAdmin | `admin@sicst.com` | `Admin123!` |
| Admin tenant (seed) | `admin@prueba.gov.ar` | `TempPassword123!` |
| Comprador (creado manualmente) | `carlos@prueba.gov.ar` | `Test123!` |
| Proveedor A | `ventas@insumosnorte.com` | `Test123!` |
| Proveedor B | (registrar otro) | `Test123!` |
