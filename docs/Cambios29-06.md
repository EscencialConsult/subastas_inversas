# Cambios 30/06 

---

## 1. Cierre de subasta, acta y trazabilidad publica

Se robustecio el cierre de subasta con calculos de ahorro, ranking comparativo y acta PDF verificable.

### Backend

| Archivo | Cambio |
|---|---|
| `SICST.Application/Auctions/AuctionClosingAct.cs` | Nuevo helper para construir el cuadro comparativo por proveedor, calcular ahorro en monto/porcentaje y generar hash SHA-256 del acta de cierre. |
| `SICST.Application/Auctions/DTOs/AuctionComparisonRowDto.cs` | Nuevo DTO para exponer filas comparativas del cierre. |
| `SICST.Application/Auctions/Commands/CloseAuctionCommand.cs` | Cierre enriquecido: calcula ahorro, arma comparativo, genera acta PDF y hash de cierre. |
| `SICST.Application/Auctions/AuctionMapping.cs` | Mapea nuevos datos de cierre y comparativo. |
| `SICST.Application/Auctions/DTOs/AuctionDto.cs` | Nuevos campos de acta/cierre y comparativo. |
| `SICST.Infrastructure/Services/PdfGenerator.cs` | Genera PDF del acta de cierre de subasta. |
| `SICST.Application/Common/Interfaces/IPdfGenerator.cs` | Agrega `GenerateAuctionClosingAct`. |
| `SICST.Api/Controllers/AuctionsController.cs` | Nuevo endpoint `GET /api/auctions/{auctionId}/closing-act/pdf`. |

### Frontend

| Archivo | Cambio |
|---|---|
| `features/subasta/SubastaPage.jsx` | Muestra informacion de cierre, ahorro, comparativo y acceso al acta. |
| `features/publico/SubastaPublicaPage.jsx` | Mejora la visualizacion publica del estado y resultado de subasta. |
| `api/subastasApi.js` | Mapea nuevos campos de cierre, ahorro, comparativo y acta. |

---

## 2. Snapshot publico de subasta y actualizacion en vivo

Se incorporo una vista publica cacheable/anonomizada para subastas, pensada para transparencia durante la competencia.

### Backend

| Archivo | Cambio |
|---|---|
| `SICST.Application/Common/Interfaces/IPublicAuctionSnapshotCache.cs` | Nueva interfaz para cache de snapshot publico. |
| `SICST.Infrastructure/Auctions/InMemoryPublicAuctionSnapshotCache.cs` | Implementacion local en memoria. |
| `SICST.Infrastructure/Auctions/RedisPublicAuctionSnapshotCache.cs` | Implementacion distribuida con Redis. |
| `SICST.Application/Public/DTOs/PublicAuctionSnapshotDto.cs` | DTO publico con estado, precio actual, ranking, cantidad de lances e identidades reveladas/cubiertas. |
| `SICST.Application/Public/PublicAuctionSnapshotMapping.cs` | Ranking anonimo mientras la subasta esta abierta; revela identidades al cerrar. |
| `SICST.Application/Public/Queries/GetPublicAuctionSnapshotQuery.cs` | Query con cache para obtener snapshot por subasta. |
| `SICST.Api/Controllers/AuctionsController.cs` | Agrega stream/eventos publicos para snapshot de subasta. |
| `SICST.Infrastructure/DependencyInjection.cs` | Registra cache publica con Redis si hay configuracion; si no, usa memoria. |

### Frontend

| Archivo | Cambio |
|---|---|
| `api/publicoApi.js` | Mapea snapshot/ranking publico y nuevos estados. |
| `features/publico/SubastaPublicaPage.jsx` | Consume y renderiza ranking publico con anonimato hasta el cierre. |

---

## 3. Dictamen asistido y recomendacion de adjudicacion

Se agrego una recomendacion asistida para el comprador/evaluador/auditor basada en la mejor oferta economica apta y en los resultados tecnicos.

### Backend

| Archivo | Cambio |
|---|---|
| `SICST.Application/Purchases/DTOs/AssistedAwardRecommendationDto.cs` | Nuevos DTOs de recomendacion, candidatos y riesgos. |
| `SICST.Application/Purchases/Queries/GetAssistedAwardRecommendationQuery.cs` | Nuevo query: agrupa mejores lances por proveedor, cruza evaluacion tecnica, calcula ahorro y detecta riesgos. |
| `SICST.Api/Controllers/PurchaseProcessesController.cs` | Nuevos endpoints `GET /award-recommendation`, `/award-recommendation/evaluate` y `/award-recommendation/audit`. |

### Riesgos detectados

- Oferta recomendada marcada como PAB.
- Puntaje tecnico bajo.
- Falta de puntaje tecnico.
- Diferencia entre mejor oferta economica y mejor puntaje tecnico.
- Existencia de una oferta menor excluida.

### Frontend

| Archivo | Cambio |
|---|---|
| `api/comprasApi.js` | Agrega `obtenerDictamenAsistido` y mapeo de recomendacion/candidatos/riesgos. |
| `features/compras/AdjudicarPage.jsx` | Muestra dictamen asistido, ranking de candidatos, ahorro y alertas de riesgo. |

---

## 4. Adjudicacion multiproveedor e integridad documental

Se amplio la adjudicacion para soportar seleccion por items, multiples proveedores y controles de consistencia.

### Backend

| Archivo | Cambio |
|---|---|
| `SICST.Domain/Entities/Award.cs` | Nuevos campos de integridad documental y soporte de items adjudicados. |
| `SICST.Application/Purchases/AwardIntegrity.cs` | Nuevo helper para calcular hash del documento y hash inmutable de adjudicacion. |
| `SICST.Application/Purchases/Commands/AdjudicateProcessCommand.cs` | Valida y persiste adjudicaciones por proveedor/items; calcula hashes/documentos. |
| `SICST.Application/Purchases/DTOs/AwardDto.cs` | Expone `SupplierId`, hashes e items. |
| `SICST.Application/Purchases/PurchaseProcessMapping.cs` | Mapea multiples adjudicaciones y datos de integridad. |
| `SICST.Persistence/Contexts/ApplicationDbContext.cs` | Configuracion EF para nuevos campos y relaciones. |

### Frontend

| Archivo | Cambio |
|---|---|
| `features/compras/AdjudicarPage.jsx` | Interfaz de adjudicacion con soporte de dictamen asistido, seleccion y revision de candidatos/items. |
| `features/adjudicaciones/AdjudicacionDetailPage.jsx` | Muestra mas informacion de adjudicacion, documentos y acciones de aprobacion/devolucion. |
| `api/comprasApi.js` | Mapea multiples adjudicaciones, hashes e items. |

---

## 5. Circuito de aprobacion, devolucion y excepciones

Se agregaron decisiones de autoridad mas completas y estados excepcionales del proceso.

### Backend

| Archivo | Cambio |
|---|---|
| `SICST.Application/Purchases/ApprovalDecisionRouting.cs` | Nuevo helper para resolver el siguiente nivel del workflow de aprobacion y validar rol requerido. |
| `SICST.Application/Purchases/Commands/ApprovePurchaseProcessCommand.cs` | Usa niveles del workflow para aprobar adjudicaciones por monto. |
| `SICST.Application/Purchases/Commands/RejectPurchaseProcessCommand.cs` | Registra rechazo con fundamento y nivel correspondiente. |
| `SICST.Application/Purchases/Commands/ReturnPurchaseProcessCommand.cs` | Nuevo flujo para devolver adjudicacion a evaluacion con motivo y auditoria de decision. |
| `SICST.Application/Purchases/Commands/DeclarePurchaseProcessDesertedCommand.cs` | Nuevo flujo para declarar desierto con fundamento y cierre de subasta abierta/programada. |
| `SICST.Application/Purchases/Commands/SuspendPurchaseProcessByChallengeCommand.cs` | Nuevo flujo para suspender por impugnacion con fundamento y cierre de subasta. |
| `SICST.Domain/Entities/Approval.cs` | Agrega estado de decision devuelta. |
| `SICST.Domain/Entities/PurchaseProcess.cs` | Agrega/ajusta estados `Deserted` y `SuspendedByChallenge`. |
| `SICST.Api/Controllers/PurchaseProcessesController.cs` | Endpoints `POST /return`, `POST /desert`, `POST /challenge/suspend`. |

### Frontend

| Archivo | Cambio |
|---|---|
| `domain/compras.js` | Agrega estados de proceso `desierta` y `suspendida`. |
| `api/comprasApi.js` | Mapea estados backend/front y agrega acciones para declarar desierto, suspender y devolver adjudicacion. |
| `features/adjudicaciones/AdjudicacionDetailPage.jsx` | Acciones para aprobar, rechazar o devolver con motivo. |

---

## 6. Contratos, firma con MFA, orden de compra y recepcion

Se completo el tramo posterior a la adjudicacion: contrato, firma, orden de compra, recepcion parcial/total y conformidad.

### Backend

| Archivo | Cambio |
|---|---|
| `SICST.Domain/Entities/Contract.cs` | Campos de firma, hash, operador firmante y template documental. |
| `SICST.Application/Purchases/Commands/CreateContractCommand.cs` | Genera contrato borrador desde adjudicacion aprobada. |
| `SICST.Application/Purchases/Commands/UpdateContractTermsCommand.cs` | Permite modificar terminos y vencimiento mientras el contrato esta en borrador. |
| `SICST.Application/Purchases/Commands/SignContractCommand.cs` | Firma contrato con OTP/MFA, genera hash y PDF, activa contrato y mueve proceso a contratado. |
| `SICST.Application/Purchases/Commands/IssuePurchaseOrderCommand.cs` | Emite orden de compra desde contrato activo, genera documento y notifica. |
| `SICST.Application/Purchases/Commands/ConfirmReceptionCommand.cs` | Flujo existente integrado: recepcion parcial/total, conformidad, cantidades pendientes y PDF de recepcion. |
| `SICST.Application/Purchases/DTOs/ContractDto.cs` | Expone firma, hash, operador, URL de documento y template. |
| `SICST.Application/Purchases/DTOs/ReceptionConfirmationDto.cs` | DTO de conformidad/recepcion por item. |
| `SICST.Api/Controllers/PurchaseProcessesController.cs` | Endpoints de contrato, terminos, firma, orden de compra, recepciones y descarga de PDFs. |
| `SICST.Infrastructure/Services/PdfGenerator.cs` | Genera PDFs de contrato, orden de compra y recepcion. |

### HU-083 - Recepcion y conformidad

| Archivo | Cambio |
|---|---|
| `frontend/src/api/comprasApi.js` | Agrega `confirmarRecepcion`, mapea ordenes de compra, recepciones, contratos y estados. |
| `frontend/src/features/compras/ProcesoFormPage.jsx` | Bloque "Recepcion y conformidad" en el legajo: muestra orden, proveedor, cantidades ordenadas/recibidas/pendientes, registra recepcion parcial o total y conformidad. |

Detalles del comportamiento:

- Permite cantidades parciales por item.
- Bloquea cantidades mayores al pendiente.
- Estados de conformidad: conforme, conforme con observaciones, rechazada.
- Lista recepciones historicas con receptor, fecha, items y PDF.
- Soporta multiples ordenes de compra cuando hay adjudicacion multiproveedor.

---

## 7. Portal publico y datos visibles

Se amplio la informacion publica para procesos, subastas y adjudicaciones.

| Archivo | Cambio |
|---|---|
| `SICST.Application/Public/DTOs/PublicAuctionDto.cs` | Nuevos campos publicos de subasta. |
| `SICST.Application/Public/Queries/GetPublicAuctionByPurchaseProcessQuery.cs` | Incluye datos adicionales y ranking/snapshot donde aplica. |
| `SICST.Application/Public/Queries/GetPublicPurchaseProcessesQuery.cs` | Ajusta estados visibles para procesos publicados/cerrados/adjudicados. |
| `frontend/src/api/publicoApi.js` | Normaliza los nuevos campos publicos. |
| `frontend/src/features/publico/SubastaPublicaPage.jsx` | Muestra mejor oferta/ranking, fechas y estados enriquecidos. |

---

## 8. Scheduler y tiempo real

El servicio de subastas programadas ahora actualiza cache publica y notifica eventos en mas momentos del ciclo.

| Archivo | Cambio |
|---|---|
| `SICST.Api/Services/AuctionSchedulerService.cs` | Al abrir/cerrar subastas actualiza snapshot publico, emite eventos SignalR/SSE y limpia cache cuando corresponde. |
| `SICST.Api/Controllers/AuctionsController.cs` | Notifica eventos al iniciar, cerrar y actualizar subastas. |
| `frontend/src/features/proveedor/ProveedorSubastaLivePage.jsx` | Ajustes de estado y datos recibidos en sala en vivo. |
| `frontend/src/api/proveedoresApi.js` | Mapeo menor para datos de proveedor/subasta. |

---

## 9. Migraciones EF pendientes

| Migracion | Cambio |
|---|---|
| `20260629195627_AddAuctionClosingActFields` | Agrega campos de acta de cierre, ahorro y hash a subastas. |
| `20260629202849_AddContractSigningFields` | Agrega campos de firma, hash, operador y template documental a contratos/adjudicaciones. |
| `ApplicationDbContextModelSnapshot.cs` | Snapshot actualizado con los nuevos campos y relaciones. |

---

## 10. Tests agregados/actualizados

### Compras

| Test | Cobertura |
|---|---|
| `AdjudicationApproval_ShouldActivateLevelsByAwardAmount` | Aprobacion por niveles segun monto adjudicado. |
| `ReturnPurchaseProcess_ShouldMoveAdjudicationBackToEvaluationAndAuditDecision` | Devolucion de adjudicacion con decision registrada. |
| `DeclareDeserted_ShouldRequireGroundsAndCloseProcess` | Declaracion desierta con fundamento y cierre. |
| `SuspendByChallenge_ShouldStoreGroundsAndCloseOpenAuction` | Suspension por impugnacion y cierre de subasta. |
| `AssistedAwardRecommendation_ShouldReturnWinnerSavingsAndDetectedRisks` | Dictamen asistido, ahorro y riesgos. |
| `ContractFlow_ShouldAllowPartialReceptions` | Contrato, firma, orden de compra y recepciones parciales/totales. |
| `AdjudicateProcess_ShouldCreateMultipleAwardsByItems` | Adjudicacion multiproveedor por items. |

### Subastas

| Test | Cobertura |
|---|---|
| `Scheduler_ShouldOpenScheduledAuctionAndNotifyParticipants` | Apertura programada y notificaciones. |
| `Scheduler_ShouldCloseExpiredAuctionAndNotifyParticipants` | Cierre automatico y notificaciones. |
| `PlaceBid_ShouldAccept50ConcurrentSuppliersWithoutBidLossAndKeepHashChainIntegrity` | Concurrencia de lances e integridad de cadena hash. |
| `PublicSnapshot_ShouldAnonymizeRankingUntilAuctionIsClosed` | Ranking publico anonimo hasta el cierre. |
| `CloseAuction_ShouldGenerateClosingActHashSavingsAndComparison` | Acta de cierre, ahorro, hash y comparativo. |
| `PlaceBid_ShouldExtendAuction_WhenPlacedInLastThreeMinutes` | Extension automatica cerca del cierre. |
| `PlaceBid_ShouldNotExtendAuction_WhenOutsideExtensionWindow` | Sin extension fuera de ventana. |

---

## 11. Verificacion ejecutada

| Comando | Resultado |
|---|---|
| `npm.cmd run lint` en `frontend` | Correcto. |
| `dotnet test --filter FullyQualifiedName~ContractFlow_ShouldAllowPartialReceptions` en `backend` | Correcto. |
| `dotnet test` en `backend` | Compila y ejecuta la suite, pero falla 1 test diagnostico existente: `DiagnoseDatabasePermissions`, que lanza una excepcion contra base remota para listar permisos. |

---

## 12. Archivos nuevos detectados

### Backend

```
backend/src/SICST.Application/Auctions/AuctionClosingAct.cs
backend/src/SICST.Application/Auctions/DTOs/AuctionComparisonRowDto.cs
backend/src/SICST.Application/Common/Interfaces/IPublicAuctionSnapshotCache.cs
backend/src/SICST.Application/Public/DTOs/PublicAuctionSnapshotDto.cs
backend/src/SICST.Application/Public/PublicAuctionSnapshotMapping.cs
backend/src/SICST.Application/Public/Queries/GetPublicAuctionSnapshotQuery.cs
backend/src/SICST.Application/Purchases/ApprovalDecisionRouting.cs
backend/src/SICST.Application/Purchases/AwardIntegrity.cs
backend/src/SICST.Application/Purchases/Commands/DeclarePurchaseProcessDesertedCommand.cs
backend/src/SICST.Application/Purchases/Commands/ReturnPurchaseProcessCommand.cs
backend/src/SICST.Application/Purchases/Commands/SignContractCommand.cs
backend/src/SICST.Application/Purchases/Commands/SuspendPurchaseProcessByChallengeCommand.cs
backend/src/SICST.Application/Purchases/Commands/UpdateContractTermsCommand.cs
backend/src/SICST.Application/Purchases/DTOs/AssistedAwardRecommendationDto.cs
backend/src/SICST.Application/Purchases/Queries/GetAssistedAwardRecommendationQuery.cs
backend/src/SICST.Application/Purchases/Queries/GetContractQuery.cs
backend/src/SICST.Infrastructure/Auctions/InMemoryPublicAuctionSnapshotCache.cs
backend/src/SICST.Infrastructure/Auctions/RedisPublicAuctionSnapshotCache.cs
backend/src/SICST.Persistence/Migrations/20260629195627_AddAuctionClosingActFields.cs
backend/src/SICST.Persistence/Migrations/20260629195627_AddAuctionClosingActFields.Designer.cs
backend/src/SICST.Persistence/Migrations/20260629202849_AddContractSigningFields.cs
backend/src/SICST.Persistence/Migrations/20260629202849_AddContractSigningFields.Designer.cs
```

---

## 13. Nota para el commit

Este paquete agrupa varias historias funcionales encadenadas:

- cierre y transparencia de subastas;
- dictamen asistido y adjudicacion multiproveedor;
- aprobacion/devolucion/excepciones;
- contrato firmado con MFA;
- orden de compra;
- recepcion parcial/total y conformidad;
- snapshot publico cacheable y ranking anonimo;
- pruebas de integracion para los flujos principales.

Antes de subir, conviene decidir si se elimina, omite o transforma en `Skip` el test diagnostico `DiagnoseDatabasePermissions`, porque actualmente impide que `dotnet test` completo quede verde.
