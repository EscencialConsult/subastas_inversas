// Dominio del proceso de compra (alineado al documento oficial).
//
// Flujo según el doc:
//   1. El COMPRADOR crea el proceso (borrador) y lo PUBLICA (no hay aprobación previa).
//   2. Se abre la SUBASTA; al cerrarla queda CERRADA.
//   3. El COMPRADOR ADJUDICA (propone al ganador) -> ADJUDICADA.
//   4. La AUTORIDAD APRUEBA la adjudicación (según monto) -> APROBADA.
//
// El Evaluador NO participa de este circuito: su tarea es validar la
// documentación de los proveedores (módulo de proveedores).

export const ESTADO_PROCESO = {
  BORRADOR: 'borrador',
  PUBLICADO: 'publicado',
  EN_SUBASTA: 'en_subasta',
  CERRADA: 'cerrada',
  ADJUDICADA: 'adjudicada',
  APROBADA: 'aprobada',
  DESIERTA: 'desierta',
  SUSPENDIDA: 'suspendida',
  CANCELADA: 'cancelada',
}

// Cada estado: etiqueta para mostrar y clase del badge (color).
export const ESTADO_INFO = {
  [ESTADO_PROCESO.BORRADOR]: { label: 'Borrador', clase: 'badge--off' },
  [ESTADO_PROCESO.PUBLICADO]: { label: 'Publicado', clase: 'badge--info' },
  [ESTADO_PROCESO.EN_SUBASTA]: { label: 'En subasta', clase: 'badge--warn' },
  [ESTADO_PROCESO.CERRADA]: { label: 'Subasta cerrada', clase: 'badge--info' },
  [ESTADO_PROCESO.ADJUDICADA]: {
    label: 'Adjudicada (pend. aprobación)',
    clase: 'badge--warn',
  },
  [ESTADO_PROCESO.APROBADA]: { label: 'Aprobada', clase: 'badge--ok' },
  [ESTADO_PROCESO.DESIERTA]: { label: 'Desierta', clase: 'badge--off' },
  [ESTADO_PROCESO.SUSPENDIDA]: { label: 'Suspendida por impugnacion', clase: 'badge--warn' },
  [ESTADO_PROCESO.CANCELADA]: { label: 'Cancelada', clase: 'badge--off' },
}

export function etiquetaEstado(estado) {
  return ESTADO_INFO[estado]?.label ?? estado
}

export function claseEstado(estado) {
  return ESTADO_INFO[estado]?.clase ?? 'badge--off'
}

// Solo se puede editar mientras es borrador: una vez publicado, el proceso
// queda "congelado" para no alterar lo que los proveedores van a ofertar.
export function esEditable(estado) {
  return estado === ESTADO_PROCESO.BORRADOR
}
