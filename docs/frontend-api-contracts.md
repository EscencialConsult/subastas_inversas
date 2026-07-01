# Frontend API Contracts

## Fuente de verdad

El contrato publico entre frontend y backend debe salir del documento OpenAPI generado por `SICST.Api`.

En desarrollo:

1. Configurar secretos y connection string fuera del repo.
2. Levantar `SICST.Api`.
3. Abrir `/swagger/v1/swagger.json`.

Ese JSON debe considerarse la fuente de verdad para:

- rutas
- metodos HTTP
- codigos de respuesta
- DTOs request/response
- autenticacion bearer
- versionado futuro

## Estrategia recomendada

El frontend no deberia mantener mapeos y DTOs a mano indefinidamente. El siguiente paso recomendado es generar un cliente tipado desde OpenAPI.

Opciones compatibles:

- `openapi-typescript` para generar tipos.
- `openapi-fetch` para cliente liviano.
- `orval` si se quiere generar hooks/cache en una fase posterior.

## Estructura objetivo

```text
frontend/src/api/
  client.ts              wrapper fetch/auth/errores
  generated/schema.ts    tipos generados desde OpenAPI
  generated/client.ts    cliente tipado generado
  *.ts                   adaptadores de dominio temporales
```

## Regla de migracion

Mientras existan adaptadores manuales en `frontend/src/api`, cada migracion debe:

1. Tipar la respuesta cruda del backend.
2. Tipar el DTO que consume la UI.
3. Mantener el mapeo backend -> frontend en un solo archivo.
4. Evitar `any`; usar `unknown` y narrowing cuando el contrato todavia no este migrado.

## Scripts sugeridos

Cuando se incorpore el generador:

```json
{
  "scripts": {
    "api:types": "openapi-typescript http://localhost:5185/swagger/v1/swagger.json -o src/api/generated/schema.ts"
  }
}
```

No commitear secretos ni URLs privadas dentro del contrato. Para CI, publicar el `swagger.json` como artifact del backend o generarlo durante el pipeline.
