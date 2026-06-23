# Frontend SICST

Frontend React + Vite para SICST MAX, con portal publico, paneles internos por rol y experiencia visual basada en Tailwind CSS.

## Stack

- React 19
- Vite 8
- React Router
- Tailwind CSS 4 con `@tailwindcss/vite`
- `tw-animate-css`
- ESLint

## Como correr

Instalar dependencias:

```powershell
npm.cmd install
```

Levantar el servidor de desarrollo:

```powershell
npm.cmd run dev
```

URL habitual:

```text
http://localhost:5173/
```

Build de produccion:

```powershell
npm.cmd run build
```

Lint:

```powershell
npm.cmd run lint
```

## Rutas principales

- `/`: portal publico sin login.
- `/publico`: redirecciona al portal publico.
- `/login`: ingreso de usuarios internos/proveedores.
- `/inicio`: inicio autenticado.
- `/compras`: procesos de compra.
- `/adjudicaciones`: adjudicaciones.
- `/auditoria`: consulta de auditoria.
- `/proveedor`: vista de proveedor.
- `/proveedor/subasta/:id`: participacion del proveedor en una subasta.

## Cambios visuales recientes

Se reemplazo el estilo base del template por una capa visual propia con Tailwind.

Archivos principales:

- `vite.config.js`: agrega el plugin `tailwindcss()` a Vite.
- `src/index.css`: importa Tailwind, animaciones y define la base global.
- `src/App.css`: concentra los componentes visuales reutilizados por las pantallas existentes.
- `src/features/publico/PortalPublicoPage.jsx`: convierte la ruta `/` en una landing publica operativa.

## Tailwind y organizacion de estilos

El proyecto usa Tailwind v4. La entrada global esta en `src/index.css`:

```css
@import "tailwindcss";
@import "tw-animate-css";
```

Los estilos de componentes existentes se mantienen en `src/App.css` usando `@layer components` y `@apply`. Como Tailwind v4 necesita referencia para resolver utilities desde otro CSS, `App.css` comienza con:

```css
@reference "./index.css";
```

Esto permite conservar clases semanticas ya usadas en JSX, por ejemplo:

- `btn`, `btn--primario`, `btn--texto`, `btn--secundario`
- `layout`, `layout__header`, `layout__menu`, `layout__contenido`
- `tabla`, `tabla__acciones`, `tabla__fila--clickeable`
- `badge`, `badge--ok`, `badge--warn`, `badge--error`
- `form`, `form__seccion`, `form__acciones`
- `subasta-monitor`, `subasta-reloj`, `subasta__card`
- `modal`, `modal-overlay`
- `portal-publico`, `portal-hero`, `portal-tabs`, `portal-live`

La idea es que las pantallas sigan leyendo como dominio de negocio y que Tailwind quede encapsulado en la hoja de estilos comun.

## Portal publico

La ruta `/` funciona como landing publica sin autenticacion. Permite consultar:

- procesos publicados;
- adjudicaciones publicadas;
- subastas en vivo.

En subastas en vivo se mantiene la integracion SSE existente desde `src/api/publicApi.js`, y la UI destaca el precio actual en `portal-live__price`.

El boton `Ingresar` lleva a `/login`.

## Pantallas internas estilizadas

Los estilos reutilizables cubren:

- login;
- layout autenticado;
- menus laterales;
- listados administrativos;
- filtros y buscadores;
- formularios;
- tablas;
- badges de estado;
- modales;
- monitor de subastas;
- vista de proveedor para participar en lances.

Tambien se agregaron estilos para campos con prefijo, usados en la carga de monto de lance:

- `campo__input-group`
- `campo__prefijo`
- `campo__input`
- `campo__etiqueta`

## Verificacion realizada

Luego de la integracion visual se valido:

```powershell
npm.cmd run lint
npm.cmd run build
```

Ambos comandos pasan correctamente.

## Notas de mantenimiento

- Preferir reutilizar las clases semanticas existentes antes de agregar clases Tailwind largas directamente en JSX.
- Si una pantalla nueva necesita una variante comun, agregarla en `src/App.css` dentro de `@layer components`.
- Mantener el portal publico sin dependencias de autenticacion.
- Evitar estilos inline salvo casos muy puntuales; las nuevas variantes visuales deberian vivir en CSS.
- Al agregar nuevas pantallas, correr `npm.cmd run lint` y `npm.cmd run build`.
