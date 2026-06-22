// Dominio del proceso de compra.
//
// Un proceso de compra recorre estados (es lo que el documento llama el circuito).
// El comprador lo arma como BORRADOR y lo envía a aprobación; de ahí en más
// avanza por el circuito (aprobación → subasta → evaluación → adjudicación).

export const ESTADO_PROCESO = {
  BORRADOR: 'borrador',
  PENDIENTE_APROBACION: 'pendiente_aprobacion',
  APROBADO: 'aprobado',
  RECHAZADO: 'rechazado',
  EN_SUBASTA: 'en_subasta',
  EVALUACION: 'evaluacion',
  ADJUDICADO: 'adjudicado',
  CANCELADO: 'cancelado',
}

// Cada estado: etiqueta para mostrar y clase del badge (color).
export const ESTADO_INFO = {
  [ESTADO_PROCESO.BORRADOR]: { label: 'Borrador', clase: 'badge--off' },
  [ESTADO_PROCESO.PENDIENTE_APROBACION]: {
    label: 'Pendiente de aprobación',
    clase: 'badge--warn',
  },
  [ESTADO_PROCESO.APROBADO]: { label: 'Aprobado', clase: 'badge--ok' },
  [ESTADO_PROCESO.RECHAZADO]: { label: 'Rechazado', clase: 'badge--error' },
  [ESTADO_PROCESO.EN_SUBASTA]: { label: 'En subasta', clase: 'badge--info' },
  [ESTADO_PROCESO.EVALUACION]: { label: 'En evaluación', clase: 'badge--info' },
  [ESTADO_PROCESO.ADJUDICADO]: { label: 'Adjudicado', clase: 'badge--ok' },
  [ESTADO_PROCESO.CANCELADO]: { label: 'Cancelado', clase: 'badge--off' },
}

export function etiquetaEstado(estado) {
  return ESTADO_INFO[estado]?.label ?? estado
}

export function claseEstado(estado) {
  return ESTADO_INFO[estado]?.clase ?? 'badge--off'
}

// Solo se puede editar mientras es borrador: una vez enviado a aprobación,
// el proceso queda "congelado" para no alterar lo que se está autorizando.
export function esEditable(estado) {
  return estado === ESTADO_PROCESO.BORRADOR
}
