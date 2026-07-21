# Imagen del backend SICST (.NET 10) para desplegar en Render (o cualquier
# plataforma que acepte contenedores: Azure, Fly.io, etc.).
#
# El contexto de build es la RAÍZ del repositorio, no la carpeta backend/.

# ---------- Etapa 1: compilar ----------
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copiamos solo el backend (el frontend se publica aparte en Netlify).
COPY backend/ ./backend/

RUN dotnet restore backend/src/SICST.Api/SICST.Api.csproj
RUN dotnet publish backend/src/SICST.Api/SICST.Api.csproj \
    -c Release \
    -o /app/publish \
    --no-restore

# ---------- Etapa 2: ejecutar ----------
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

# QuestPDF (generación de PDFs: actas, órdenes de compra) usa SkiaSharp,
# que necesita estas librerías nativas para renderizar texto en Linux.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libfontconfig1 fontconfig \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/publish .

# Render (y la mayoría de los proxies) terminan el TLS y reenvían la petición
# por HTTP. Sin esto, UseHttpsRedirection cree que la conexión es insegura y
# genera un bucle infinito de redirecciones.
ENV ASPNETCORE_FORWARDEDHEADERS_ENABLED=true

EXPOSE 10000

# Render asigna el puerto en la variable PORT. Usamos la forma "shell" del CMD
# para que ${PORT} se expanda en tiempo de ejecución.
CMD ASPNETCORE_URLS=http://+:${PORT:-10000} dotnet SICST.Api.dll
