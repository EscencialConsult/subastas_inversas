# Conexion compartida a Neon PostgreSQL

Neon se usa como base PostgreSQL compartida para desarrollo/pruebas entre varios desarrolladores. Mas adelante, cuando se migre a una base PostgreSQL alojada en un VPS, el cambio deberia limitarse a reemplazar la connection string.

La aplicacion no debe guardar credenciales de Neon ni del futuro VPS en `appsettings*.json`.

## Opcion recomendada: user-secrets

Desde la carpeta del repo:

```powershell
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=TU_HOST.neon.tech;Port=5432;Database=TU_DB;Username=TU_USER;Password=TU_PASSWORD;SSL Mode=Require;Trust Server Certificate=true" --project backend/src/SICST.Api/SICST.Api.csproj
```

Tambien se puede guardar directamente la URL de Neon:

```powershell
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "postgresql://TU_USER:TU_PASSWORD@TU_HOST.neon.tech/TU_DB?sslmode=require&channel_binding=require" --project backend/src/SICST.Api/SICST.Api.csproj
```

Luego reiniciar el backend.

## Opcion alternativa: variable de entorno DATABASE_URL

Tambien se soporta el formato URL que entrega Neon:

PowerShell:

```powershell
$env:DATABASE_URL="postgresql://TU_USER:TU_PASSWORD@TU_HOST.neon.tech/TU_DB?sslmode=require"
dotnet run --project backend/src/SICST.Api/SICST.Api.csproj
```

Git Bash:

```bash
export DATABASE_URL='postgresql://TU_USER:TU_PASSWORD@TU_HOST.neon.tech/TU_DB?sslmode=require'
dotnet run --project backend/src/SICST.Api/SICST.Api.csproj
```

`DATABASE_URL` tiene prioridad sobre `ConnectionStrings:DefaultConnection`.

## Verificacion

El backend ya no define `DefaultConnection` en `appsettings.Development.json`, por lo que si no se configura Neon mediante user-secrets o variable de entorno, la aplicacion falla al iniciar con un mensaje explicito.

Esto evita volver silenciosamente a `sicst_dev.db` local. El runtime de la API usa PostgreSQL mediante Npgsql; SQLite queda fuera del flujo normal de la aplicacion.

## Nota sobre SQLite local

`sicst_dev.db` fue detectada como base local. Para el flujo de equipo no deberia usarse como fallback automatico, porque cada desarrollador terminaria probando contra datos distintos.

Si se quiere mantener SQLite para pruebas puntuales, conviene hacerlo con una configuracion local no versionada y explicita.
