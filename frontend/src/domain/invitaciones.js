export const ESTADO_INVITACION = {
  PENDING: 0,
  ACCEPTED: 1,
  REJECTED: 2,
}

const INVITACION_INFO = {
  [ESTADO_INVITACION.PENDING]: { label: 'Pendiente', clase: 'badge--warn' },
  [ESTADO_INVITACION.ACCEPTED]: { label: 'Aceptada', clase: 'badge--ok' },
  [ESTADO_INVITACION.REJECTED]: { label: 'Rechazada', clase: 'badge--error' },
}

export function etiquetaEstadoInvitacion(estado) {
  return INVITACION_INFO[estado]?.label ?? 'Desconocido'
}

export function claseEstadoInvitacion(estado) {
  return INVITACION_INFO[estado]?.clase ?? 'badge--off'
}
