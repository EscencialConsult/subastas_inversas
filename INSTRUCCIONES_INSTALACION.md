# Instrucciones para probar el proyecto

Esta guia explica como descargar, configurar y ejecutar el proyecto en una maquina nueva.

## Requisitos

Instalar antes de comenzar:

1. Git  
   https://git-scm.com/downloads

2. Node.js 20 o superior  
   https://nodejs.org

3. .NET SDK 10  
   https://dotnet.microsoft.com/download

4. PostgreSQL  
   Puede usarse Neon, Supabase, Railway o una instalacion local de PostgreSQL.

## 1. Clonar el repositorio

```bash
git clone URL_DEL_REPOSITORIO
cd subastas_inversas
```

Reemplazar `URL_DEL_REPOSITORIO` por la URL real del repositorio en GitHub.

## 2. Configurar la base de datos

Editar el archivo:

```text
backend/src/SICST.Api/appsettings.Development.json
```

Configurar `DefaultConnection` con el connection string real de PostgreSQL:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=TU_HOST;Port=5432;Database=TU_DB;Username=TU_USUARIO;Password=TU_PASSWORD;SSL Mode=Require;Trust Server Certificate=true"
  }
}
```

Si se usa Neon, copiar el connection string desde el dashboard de Neon.

Ejemplo de formato:

```text
Host=xxxx.neon.tech;Port=5432;Database=neondb;Username=neondb_owner;Password=xxxxx;SSL Mode=Require;Trust Server Certificate=true
```

## 3. Ejecutar el backend

Desde la raiz del proyecto:

```bash
cd backend/src/SICST.Api
dotnet restore
dotnet run
```

La API queda disponible en:

```text
http://localhost:5185
```

Swagger queda disponible en:

```text
http://localhost:5185/swagger
```

Al iniciar, el backend ejecuta las migraciones pendientes y crea los datos minimos de sistema, como permisos y el usuario superadmin inicial si no existen.

## 4. Ejecutar el frontend

Abrir otra terminal y ejecutar:

```bash
cd frontend
npm install
npm run dev
```

Vite mostrara una URL similar a:

```text
http://localhost:5173
```

Abrir esa URL en el navegador.

## 5. Usuario inicial

Si la base de datos esta vacia, el backend crea este usuario inicial:

```text
Email: admin@sicst.com
Password: Admin123!
```

## 6. URLs utiles

Frontend:

```text
http://localhost:5173
```

Login:

```text
http://localhost:5173/login
```

Portal publico:

```text
http://localhost:5173/portal
```

Backend:

```text
http://localhost:5185
```

Swagger:

```text
http://localhost:5185/swagger
```

## 7. Verificaciones rapidas

Verificar backend:

```bash
cd backend/src/SICST.Api
dotnet run
```

Verificar frontend:

```bash
cd frontend
npm run dev
```

Verificar lint del frontend:

```bash
cd frontend
npm run lint
```

Compilar backend:

```bash
dotnet build backend/SICST.slnx
```

En Windows tambien puede usarse:

```powershell
dotnet build backend\SICST.slnx
```

## 8. Problemas comunes

### Error: Host desconocido

Si al ejecutar el backend aparece algo como:

```text
Host desconocido
```

o:

```text
Failed to connect
```

significa que la maquina no puede resolver o conectarse al host de PostgreSQL.

En PowerShell, probar:

```powershell
Resolve-DnsName TU_HOST_DE_POSTGRES
Test-NetConnection TU_HOST_DE_POSTGRES -Port 5432
```

Si `Resolve-DnsName` falla, revisar que el host del connection string sea correcto.

Si `Resolve-DnsName` funciona pero `TcpTestSucceeded` da `False`, puede haber bloqueo de red, firewall, VPN, proveedor de internet o restricciones del servicio de base de datos.

### El frontend no conecta con la API

Confirmar que el backend este corriendo en:

```text
http://localhost:5185
```

Tambien revisar la consola del navegador para ver errores de red.

### El puerto ya esta ocupado

Si el backend o frontend no arranca porque el puerto esta ocupado, cerrar el proceso anterior o usar otro puerto.

Para revisar procesos en Windows:

```powershell
netstat -ano | findstr :5185
netstat -ano | findstr :5173
```

Luego se puede cerrar el proceso con:

```powershell
Stop-Process -Id ID_DEL_PROCESO
```

## 9. Orden recomendado para probar

1. Configurar el connection string de PostgreSQL.
2. Ejecutar el backend.
3. Abrir Swagger y confirmar que responde.
4. Ejecutar el frontend.
5. Entrar al login.
6. Iniciar sesion con el superadmin inicial.
7. Probar el portal publico.

