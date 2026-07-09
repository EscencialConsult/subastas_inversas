# Guía de Uso — SICST Subastas Inversas

Guía completa del flujo de trabajo, rol por rol, paso a paso.

---

## Índice

1. [Introducción](#1-introducción)
2. [Roles de usuario](#2-roles-de-usuario)
3. [Flujo completo paso a paso](#3-flujo-completo-paso-a-paso)
4. [Guía rápida por rol](#4-guía-rápida-por-rol)
5. [Estados del proceso de compra](#5-estados-del-proceso-de-compra)
6. [Preguntas frecuentes](#6-preguntas-frecuentes)

---

## 1. Introducción

**SICST** es una plataforma digital de contrataciones públicas del sector público argentino. Permite a organismos públicos gestionar procesos de compra completos usando subastas inversas electrónicas, garantizando transparencia, eficiencia y trazabilidad.

### Conceptos clave

| Término | Descripción |
|---------|-------------|
| **Proceso de compra** | Solicitud de compra de bienes o servicios. Pasa por varios estados hasta su finalización. |
| **Subasta inversa** | Método de contratación donde los proveedores compiten ofreciendo precios decrecientes. Gana el menor precio. |
| **Multi-tenant** | Cada organismo público es un "tenant" (empresa) con su propia configuración, usuarios y datos. |
| **Circuito de aprobación** | Flujo multinivel de aprobaciones antes de que un proceso pase a subasta. |
| **PAB (Precio Base)** | Precio mínimo aceptable. Si un lance cruza este umbral, el sistema lo marca como oferta muy baja. |

---

## 2. Roles de usuario

| Rol | ¿Quién lo usa? | Responsabilidades principales |
|-----|----------------|------------------------------|
| **SuperAdmin** | Dueño de la plataforma | Crear empresas (tenants), gestionar toda la plataforma |
| **Admin** | Responsable del organismo | Configurar la empresa, crear usuarios, gestionar parámetros |
| **Comprador** | Área de compras | Crear procesos de compra, gestionar subastas, adjudicar |
| **Proveedor** | Empresa contratista | Registrarse, subir documentación, participar en subastas |
| **Evaluador** | Comité evaluador | Evaluar ofertas técnicas, revisar documentos |
| **Autoridad** | Funcionario aprobador | Aprobar procesos en los circuitos de aprobación |
| **Auditor** | Órgano de control | Consultar logs de auditoría y accesos |

### 2.1 SuperAdmin

**Acceso:** Usuario creado en el seed inicial.

**Pantallas que ve:**
- `/tenants` — Listado de empresas
- `/tenants/nuevo` — Crear nueva empresa
- `/tenants/:id` — Editar empresa
- `/tenants/:id/detalle` — Detalle de empresa
- `/perfil` — Su perfil
- `/panel` — Dashboard global

**Lo que NO puede hacer:**
- Crear procesos de compra
- Participar en subastas
- Evaluar ofertas

### 2.2 Admin

**Acceso:** Creado por SuperAdmin al crear la empresa o manualmente.

**Pantallas que ve:**
- `/configuracion` — Configurar modalidades, circuitos, plantillas
- `/usuarios` — Gestionar usuarios del organismo
- `/usuarios/nuevo` — Crear usuario
- `/panel` — Dashboard general
- `/perfil` — Su perfil

**Lo que hace:**
1. Configurar las **modalidades de contratación** (rangos de montos, si requieren subasta)
2. Configurar los **circuitos de aprobación** (niveles, roles aprobadores, montos)
3. Configurar las **plantillas de documentos** (contratos, actas, órdenes de compra)
4. Crear usuarios de todos los roles (Compradores, Evaluadores, Autoridades, Auditores)

### 2.3 Comprador

**Acceso:** Creado por Admin.

**Pantallas que ve:**
- `/compras` — Listado de procesos de compra
- `/compras/nuevo` — Nuevo proceso (asistente 8 pasos)
- `/compras/:id` — Editar / ver detalle
- `/compras/:id/adjudicar` — Adjudicar proceso
- `/subasta/:procesoId` — Gestionar subasta
- `/compras-realizadas` — Historial de compras
- `/proveedores` — Directorio de proveedores
- `/panel` — Dashboard

**Lo que hace:**
1. Crear procesos de compra con todos los detalles
2. Publicar procesos
3. Invitar proveedores
4. Iniciar y cerrar subastas
5. Adjudicar al ganador
6. Generar contratos y órdenes de compra
7. Confirmar recepción de bienes/servicios

### 2.4 Proveedor

**Acceso:** Se registra solo desde el portal público. Luego recibe credenciales.

**Pantallas que ve:**
- `/proveedor` — Home con datos de su empresa
- `/proveedor/arca` — Datos fiscales y vinculación ARCA
- `/proveedor/documentacion` — Subir y gestionar documentación
- `/proveedor/oportunidades` — Oportunidades de compra
- `/proveedor/subastas/:auctionId` — Subasta en vivo
- `/registro-proveedor` — Registro (público, sin autenticación)
- `/perfil` — Su perfil

**Lo que hace:**
1. Registrarse como proveedor (público)
2. Completar datos fiscales en `/proveedor/arca`
3. Subir documentación en `/proveedor/documentacion` (PDF con fecha de vencimiento)
4. Aceptar o rechazar invitaciones a procesos
5. Participar en subastas inversas en vivo (lances)
6. Ver resultados de subastas ganadas

### 2.5 Evaluador

**Acceso:** Creado por Admin.

**Pantallas que ve:**
- `/evaluacion` — Listado de procesos a evaluar
- `/evaluacion/:id` — Evaluar ofertas de un proceso
- `/evaluacion-proveedores` — Evaluar proveedores
- `/calificacion` — Calificar ofertas
- `/proveedores` — Directorio de proveedores
- `/panel` — Dashboard

**Lo que hace:**
1. Evaluar ofertas técnicas de los procesos
2. Revisar y aprobar/rechazar documentación de proveedores
3. Calificar ofertas según criterios definidos

### 2.6 Autoridad

**Acceso:** Creado por Admin.

**Pantallas que ve:**
- `/adjudicaciones` — Listado de procesos pendientes de aprobación
- `/adjudicaciones/:id` — Detalle de adjudicación
- `/panel` — Dashboard

**Lo que hace:**
1. Aprobar o rechazar procesos en los circuitos de aprobación
2. Revisar detalles de adjudicaciones

### 2.7 Auditor

**Acceso:** Creado por Admin.

**Pantallas que ve:**
- `/auditoria` — Listado de eventos de auditoría
- `/auditoria/:id` — Detalle del evento
- `/subastas` — Subastas realizadas
- `/proveedores` — Directorio de proveedores
- `/panel` — Dashboard

**Lo que hace:**
1. Consultar la cadena de auditoría (tamper-proof con SHA256)
2. Consultar logs de acceso
3. Revisar subastas realizadas

---

## 3. Flujo completo paso a paso

### Fase 1: Setup de la plataforma

#### Paso 1 — SuperAdmin crea una empresa

**Quién:** SuperAdmin
**Pantalla:** `/tenants/nuevo`
**Qué hace:**

1. Completa el formulario:
   - **Nombre de la empresa** (ej: "Municipio de Tucumán")
   - **Subdominio** (se genera automáticamente, ej: `municipio-tucuman`)
   - **Logo** (URL opcional)
   - **Color primario** (para el branding visual)
2. Completa los datos del **Administrador inicial**:
   - Nombre, Apellido, Email
3. Envía el formulario
4. El sistema crea:
   - La empresa (Company)
   - Un usuario Admin con contraseña temporal
5. Aparece un **modal con la contraseña temporal** que debe copiarse y entregarse al Admin

**Resultado:** La empresa está creada con su Admin inicial.

---

#### Paso 2 — Admin configura la empresa

**Quién:** Admin
**Pantalla:** `/configuracion`
**Qué hace:**

**A — Modalidades de contratación:**
1. Crea las modalidades que usa el organismo (ej: "Licitación Pública", "Contratación Directa", "Subasta Inversa")
2. Para cada una define:
   - Nombre y descripción
   - **Monto mínimo y máximo** (definen rangos sin superposición)
   - Si **requiere subasta inversa**
3. Guarda los cambios

**B — Circuitos de aprobación:**
1. Crea los circuitos de aprobación necesarios
2. Para cada circuito define:
   - Nombre (ej: "Circuito de compras mayores a $10M")
   - Rango de montos (min/max)
   - **Niveles de aprobación**, cada nivel con:
     - Orden (1, 2, 3...)
     - Rol que aprueba (Autoridad, Admin, etc.)
     - Si es secuencial o paralelo
     - Cantidad de aprobaciones necesarias

**C — Plantillas de documentos:**
1. Carga plantillas HTML para:
   - Actas de adjudicación
   - Contratos
   - Órdenes de compra
2. Las plantillas pueden usar variables: `{{numero}}`, `{{monto}}`, `{{proveedor}}`, `{{organismo}}`

---

#### Paso 3 — Admin crea los usuarios

**Quién:** Admin
**Pantalla:** `/usuarios/nuevo`
**Qué hace:**

1. Crea los usuarios necesarios:
   - **Comprador** (1 o más)
   - **Evaluador** (1 o más)
   - **Autoridad** (1 o más)
   - **Auditor** (opcional)
2. Para cada uno completa: nombre, apellido, email, rol
3. El usuario recibe un email con sus credenciales (en desarrollo se muestra en pantalla)

**Resultado:** El organismo tiene su equipo listo para operar.

---

### Fase 2: Proveedores

#### Paso 4 — Proveedor se registra (autogestión)

**Quién:** Cualquier persona (público)
**Pantalla:** `/registro-proveedor`
**Qué hace:**

1. Completa el formulario público:
   - **Razón social** (nombre de la empresa)
   - **CUIT** (formato XX-XXXXXXXX-X)
   - **Email**
   - **Rubro** (categoría de negocio)
   - **Provincia**
   - **Localidad**
2. Envía el formulario
3. El sistema valida:
   - Que el email no esté duplicado
   - Que el CUIT no esté duplicado
4. Crea el usuario con rol Proveedor (inactivo) y el perfil de proveedor (pendiente)
5. Muestra mensaje de confirmación

**Resultado:** El proveedor queda en estado `Pending` a la espera de verificación ARCA.

---

#### Paso 4b — Proveedor completa datos fiscales

**Quién:** Proveedor
**Pantalla:** `/proveedor/arca`
**Qué hace:**

1. Ingresa los datos de vinculación con ARCA (AFIP)
2. Completa CUIT, datos fiscales y configuración impositiva
3. Guarda los cambios

**Resultado:** Los datos fiscales quedan registrados para validación.

---

#### Paso 5 — Proveedor sube documentación

**Quién:** Proveedor
**Pantalla:** `/proveedor/documentacion`
**Qué hace:**

1. Inicia sesión con las credenciales recibidas
2. Ve su estado: "Pendiente de verificación"
3. En la sección de **Documentación**:
   - Selecciona tipo de documento (Certificado CUIT, Constancia AFIP, etc.)
   - Ingresa fecha de vencimiento
   - Sube el archivo PDF
4. El sistema calcula el hash SHA256 del archivo y lo almacena
5. Sube todos los documentos requeridos

**Resultado:** Los documentos quedan disponibles para revisión por el organismo.

---

#### Paso 6 — Admin/Evaluador verifica proveedor

**Quién:** Admin o Evaluador
**Pantalla:** `/proveedores` → detalle del proveedor
**Qué hace:**

1. Ve el listado de proveedores pendientes
2. Accede al detalle del proveedor
3. Revisa la documentación subida:
   - Puede **aprobar** el documento
   - Puede **observar** (solicitar corrección) → el proveedor debe subsanar
   - Puede **rechazar** (con motivo)
4. Si documentación en orden, verifica al proveedor

**Resultado:** El proveedor pasa a estado `Verified` y puede participar en procesos de compra.

---

### Fase 3: Proceso de compra

#### Paso 7 — Comprador crea un proceso de compra

**Quién:** Comprador
**Pantalla:** `/compras/nuevo`
**Qué hace:**

Completa el **asistente de 8 pasos**:

| Paso | Sección | Qué completa |
|------|---------|-------------|
| 1 | **Datos básicos** | Título del proceso, descripción |
| 2 | **Presupuesto** | Presupuesto estimado, modalidad de contratación |
| 3 | **Ítems** | Los renglones de la compra (descripción, cantidad, unidad) |
| 4 | **Criterios** | Criterios de evaluación (ponderación por criterio) |
| 5 | **Requisitos** | Documentos requeridos a proveedores |
| 6 | **Subasta** | Precio base, porcentaje de decremento mínimo, extensión automática (minutos), umbral PAB |
| 7 | **Invitaciones** | Selecciona proveedores verificados para invitar |
| 8 | **Revisión** | Resumen de todo el proceso, confirmar y enviar |

**Resultado:** El proceso se crea en estado `Draft`.

---

#### Paso 8 — Comprador publica el proceso

**Quién:** Comprador
**Pantalla:** `/compras/:id`
**Qué hace:**

1. Revisa el detalle del proceso
2. Confirma que todo está correcto
3. Hace clic en **"Publicar"**
4. El proceso cambia a estado `PendingApproval`

**Resultado:** El proceso queda pendiente de aprobación por el circuito configurado.

---

#### Paso 9 — Circuito de aprobación

**Quién:** Autoridad (según el nivel del circuito)
**Pantalla:** `/adjudicaciones`
**Qué hace:**

1. Ve los procesos pendientes de su aprobación
2. Revisa los detalles del proceso
3. **Aprueba** o **Rechaza** (con motivo)
4. Si hay varios niveles, el proceso pasa al siguiente nivel hasta completar el circuito

**Cuando se completa la aprobación:**
- Si la modalidad **requiere subasta** → estado `Approved` (listo para subasta)
- Si **no requiere subasta** → pasa directamente a evaluación

**Si se rechaza:**
- Estado `Rejected` con el motivo registrado

---

#### Paso 10 — Comprador inicia la subasta

**Quién:** Comprador
**Pantalla:** `/subasta/:procesoId`
**Qué hace:**

1. Ve los parámetros de la subasta
2. Confirma que los proveedores invitados aceptaron la invitación
3. Inicia la subasta
4. Se crea la Auction con:
   - Precio base
   - Decremento mínimo
   - Extensión automática
   - Umbral PAB
5. El proceso pasa a estado `InAuction`

**Resultado:** La subasta queda abierta para que los proveedores oferten.

---

#### Paso 11 — Proveedor participa en la subasta

**Quién:** Proveedor
**Pantalla:** `/proveedor/subastas/:auctionId`
**Qué hace:**

1. Ve la subasta activa con:
   - Precio base
   - Mejor oferta actual
   - Tiempo restante
   - Decremento mínimo requerido
2. Ingresa su oferta (debe ser menor a la mejor oferta actual y respetar el decremento mínimo)
3. La oferta se registra en tiempo real
4. Si otro proveedor ofrece un precio menor cerca del cierre, el sistema **extiende automáticamente** el tiempo

**Reglas de la subasta:**
- Cada oferta debe ser menor a la mejor oferta actual
- Debe respetar el porcentaje de decremento mínimo configurado
- Si se supera el umbral PAB, se marca como oferta muy baja
- Si no hay ofertas, la subasta queda `Deserted`

---

#### Paso 12 — Comprador cierra la subasta

**Quién:** Comprador
**Pantalla:** `/subasta/:procesoId`
**Qué hace:**

1. Monitorea la subasta en vivo
2. Cuando el tiempo expira (sin extensiones activas):
   - La subasta se cierra automáticamente
   - O puede cerrarla manualmente si ya no hay ofertas competitivas
3. Al cerrar:
   - Se genera el acta de cierre
   - Se muestra la tabla comparativa con posiciones
   - El proceso pasa a estado `Evaluation`

**Resultado:** Los administradores ven la tabla comparativa con:
- Posición de cada proveedor
- Mejor oferta
- Cantidad de lances
- Ahorro generado (monto y porcentaje)

---

### Fase 4: Evaluación y adjudicación

#### Paso 13 — Evaluador evalúa las ofertas

**Quién:** Evaluador
**Pantalla:** `/evaluacion/:id`
**Qué hace:**

1. Ve el listado de ofertas recibidas
2. Evalúa cada oferta según los criterios definidos en el proceso
3. Puede:
   - Puntuar cada criterio
   - Agregar observaciones
   - Aprobar o rechazar cada oferta
4. Si se requiere acta de evaluación, la firma digitalmente

**Resultado:** Las ofertas quedan evaluadas y puntuadas.

---

#### Paso 14 — Comprador adjudica

**Quién:** Comprador
**Pantalla:** `/compras/:id/adjudicar`
**Qué hace:**

1. Ve los resultados de la evaluación
2. Selecciona al proveedor ganador (mejor relación precio-calidad)
3. Completa:
   - Monto adjudicado
   - Observaciones
4. Confirma la adjudicación
5. El proceso pasa a estado `Adjudicated`

**Resultado:** El proveedor ganador es notificado.

---

### Fase 5: Post-compra

#### Paso 15 — Generar contrato

**Quién:** Comprador (o automático)
**Pantalla:** `/compras/:id`
**Qué hace:**

1. Una vez adjudicado, el sistema genera el **contrato**:
   - Usa la plantilla configurada para contratos
   - Reemplaza variables: `{{numero}}`, `{{monto}}`, `{{proveedor}}`, `{{organismo}}`
   - Genera el PDF automáticamente
2. El contrato se crea en estado `Draft`
3. Se puede firmar digitalmente → pasa a `Active`
4. El proceso pasa a estado `Contracted`

**Resultado:** El contrato está firmado y activo.

---

#### Paso 16 — Emitir orden de compra

**Quién:** Comprador
**Pantalla:** `/compras/:id`
**Qué hace:**

1. Desde el contrato activo, genera la **orden de compra**
2. La orden especifica:
   - Número de orden
   - Monto
   - Fecha de entrega estimada
   - Observaciones
3. Se genera el PDF de la orden de compra
4. El proceso pasa a estado `PurchaseOrderIssued`

**Resultado:** El proveedor recibe la orden para comenzar la entrega.

---

#### Paso 17 — Confirmar recepción

**Quién:** Comprador
**Pantalla:** `/compras/:id`
**Qué hace:**

1. Cuando el proveedor entrega los bienes/servicios:
   - Registra la **confirmación de recepción**
   - Puede ser total o parcial (por ítem)
   - Estado: `Accepted`, `AcceptedWithObservations` o `Rejected`
   - Adjunta documentación si es necesario
2. Si hay recepciones parciales, se acumulan hasta completar todos los ítems
3. Cuando todos los ítems están recibidos → proceso pasa a `Received`

**Resultado:** El proceso de compra está completo.

---

#### Paso 18 — Registrar pagos

**Quién:** Comprador
**Pantalla:** `/compras/:id`
**Qué hace:**

1. Desde el contrato, registra los **pagos**:
   - Monto del pago
   - Fecha
   - Si hubo penalización por demora
   - Días de retraso (si aplica)
2. Se registra cada pago contra el contrato

**Resultado:** Queda registrada toda la trazabilidad financiera.

---

### Fase 6: Auditoría y control

#### Paso 19 — Auditor consulta la trazabilidad

**Quién:** Auditor
**Pantalla:** `/auditoria`
**Qué hace:**

1. Consulta todos los eventos de auditoría con:
   - Filtros por empresa, entidad, acción, fechas
   - Cadena de hash SHA256 (tamper-proof)
2. Consulta logs de acceso:
   - Inicios de sesión exitosos/fallidos
   - Intentos de MFA
   - Refresh de tokens
3. Exporta la información para informes

**Resultado:** Trazabilidad completa de todas las operaciones.

---

## 4. Guía rápida por rol

### SuperAdmin

```
1. IR A /tenants/nuevo
2. COMPLETAR: nombre, subdominio, logo, color
3. COMPLETAR: datos del admin inicial
4. GUARDAR la contraseña temporal del modal
5. ENTREGAR credenciales al Admin de la empresa
```

### Admin

```
─ CONFIGURACIÓN ─
1. IR A /configuracion
2. CREAR modalidades de contratación
3. CREAR circuitos de aprobación
4. CREAR plantillas de documentos

─ USUARIOS ─
5. IR A /usuarios/nuevo
6. CREAR Compradores, Evaluadores, Autoridades, Auditores
```

### Comprador

```
─ PROCESO DE COMPRA ─
1. IR A /compras/nuevo
2. COMPLETAR asistente (8 pasos)
3. PUBLICAR proceso

─ SUBASTA ─
4. IR A /subasta/:procesoId
5. INICIAR subasta
6. CERRAR subasta cuando corresponda

─ ADJUDICACIÓN ─
7. IR A /compras/:id/adjudicar
8. SELECCIONAR ganador

─ POST-COMPRA ─
9. GENERAR contrato
10. EMITIR orden de compra
11. CONFIRMAR recepción
12. REGISTRAR pagos
```

### Proveedor

```
─ REGISTRO ─
1. IR A /registro-proveedor
2. COMPLETAR formulario
3. ESPERAR verificación

─ DATOS FISCALES ─
4. IR A /proveedor/arca
5. COMPLETAR datos de vinculación ARCA

─ DOCUMENTACIÓN ─
6. IR A /proveedor/documentacion
7. SUBIR documentos PDF

─ PARTICIPAR ─
8. IR A /proveedor/oportunidades
9. ACEPTAR invitación a proceso
10. IR A /proveedor/subastas/:auctionId
11. OFERTAR en la subasta en vivo
```

### Evaluador

```
─ EVALUAR OFERTAS ─
1. IR A /evaluacion
2. SELECCIONAR proceso
3. PUNTUAR cada oferta según criterios

─ EVALUAR PROVEEDORES ─
4. IR A /evaluacion-proveedores
5. REVISAR documentación
6. APROBAR / RECHAZAR / OBSERVAR
```

### Autoridad

```
1. IR A /adjudicaciones
2. REVISAR procesos pendientes
3. APROBAR o RECHAZAR
```

### Auditor

```
1. IR A /auditoria
2. FILTRAR por fechas, entidad, acción
3. REVISAR cadena de auditoría
4. VER detalle de cada evento en /auditoria/:id
```

---

## 5. Estados del proceso de compra

Los estados se muestran al usuario con labels en español. Entre paréntesis se indica el valor interno del backend.

```
                    ┌──────────┐
                    │ Borrador │  Creado por Comprador (borrador)
                    │ (Draft)  │
                    └────┬─────┘
                         │ Publicar
                    ┌────▼──────────┐
                    │   Pendiente   │  Pendiente de aprobación (circuito)
                    │   de aprob.   │  (PendingApproval)
                    └────┬──────────┘
                         │ Aprobar
              ┌──────────┼──────────┐
              │          │          │
         ┌────▼───┐ ┌───▼────┐     │
         │Aprobado│ │Rechaz. │     │  Rechazado con motivo
         │(Approv)│ │(Reject)│     │
         └────┬───┘ └────────┘     │
              │                    │
    ┌─────────┼─────────┐          │
    │         │         │          │
┌───▼────┐ ┌──▼─────┐   │          │  Si no requiere subasta
│En      │ │(direct │   │          │
│subasta │ │to Eval)│   │          │
│(InAuct)│ └────────┘   │          │
└───┬────┘              │          │
    │ Cerrar            │          │
    │         ┌─────────┘          │
    │         │                    │
┌───▼────────▼──┐                 │
│ Evaluación    │  Evaluación de ofertas
│ (Evaluation)  │
└───────┬───────┘
        │ Adjudicar
   ┌────▼──────┐
   │Adjudicada │  Ganador seleccionado
   │(Adjudic.) │
   └────┬──────┘
        │ Contrato
   ┌────▼──────┐
   │Contratado │  Contrato firmado
   │(Contract) │
   └────┬──────┘
        │ Orden de compra
   ┌────▼─────────┐
   │ Orden de     │  Orden de compra emitida
   │ compra (POI) │
   └────┬─────────┘
        │ Recepción
   ┌────▼──────┐
   │ Recibido  │  Bienes/servicios recibidos
   │ (Received)│
   └───────────┘

OTROS ESTADOS TERMINALES:
  ┌───────────┐
  │ Desierta  │  Sin ofertas en la subasta
  │(Deserted) │
  └───────────┘

  ┌────────────────────┐
  │ Suspendida         │  Suspendido por impugnación
  │(SuspendedByChall.) │
  └────────────────────┘

  ┌──────────┐
  │ Cerrado  │  Proceso cerrado manualmente
  │ (Closed) │
  └──────────┘

  ┌──────────┐
  │Cancelado │  Proceso cancelado
  └──────────┘
```

### Resumen de estados

| Estado | Valor backend | Significado | ¿Siguiente paso? |
|--------|--------------|-------------|------------------|
| Borrador | `Draft` | Borrador, en edición | Publicar |
| Pendiente de aprobación | `PendingApproval` | Esperando aprobación del circuito | Aprobar o rechazar |
| Aprobado | `Approved` | Aprobado | Iniciar subasta o evaluar |
| Rechazado | `Rejected` | Rechazado por el circuito | — (terminal) |
| En subasta | `InAuction` | Subasta en curso | Cerrar subasta |
| Evaluación | `Evaluation` | Evaluando ofertas | Adjudicar |
| Adjudicada | `Adjudicated` | Ganador seleccionado | Generar contrato |
| Desierta | `Deserted` | Sin ofertas | — (terminal) |
| Suspendida | `SuspendedByChallenge` | Suspendido | — (terminal) |
| Contratado | `Contracted` | Contrato firmado | Emitir orden de compra |
| Orden de compra | `PurchaseOrderIssued` | Orden emitida | Recibir bienes |
| Recibido | `Received` | Bienes recibidos | — (terminal exitoso) |
| Cerrado | `Closed` | Cerrado manualmente | — (terminal) |
| Cancelada | — | Proceso cancelado | — (terminal) |

---

## 6. Preguntas frecuentes

**¿Cómo obtengo mis credenciales como proveedor?**
El registro es autogestionado desde `/registro-proveedor`. Una vez creado, recibirás un email con tus credenciales cuando el organismo verifique tu cuenta.

**¿Cuánto tarda la verificación ARCA?**
La verificación es manual por parte del organismo. Actualmente la simulación verifica automáticamente los CUIT que no terminan en `-0`.

**¿Puedo editar un proceso de compra después de publicado?**
No. Una vez publicado, el proceso queda en estado `PendingApproval`. Si necesitas cambios, debes cancelarlo y crear uno nuevo.

**¿Qué pasa si nadie oferta en la subasta?**
La subasta queda declarada `Deserted`. El proceso no puede continuar y debe reiniciarse.

**¿Se pueden recibir entregas parciales?**
Sí. Las confirmaciones de recepción permiten recibir parcialmente por ítem. Se acumulan hasta completar el total.

**¿Cómo se genera el PDF del contrato?**
Usa la plantilla configurada en `/configuracion` (sección Plantillas). Si no hay plantilla configurada, usa una plantilla por defecto.

**¿Qué es el umbral PAB?**
Es el Precio Aceptable Base. Cuando una oferta cruza este umbral hacia abajo, el sistema la marca como potencialmente riesgosa (oferta muy baja).

**¿Cuánto dura el refresh token?**
30 días. Es rotativo: cada vez que se refresca, el anterior se invalida y se genera uno nuevo.

**¿Puedo tener MFA?**
Sí. Desde `/perfil` puedes configurar MFA con Google Authenticator o cualquier app TOTP escaneando un QR.
