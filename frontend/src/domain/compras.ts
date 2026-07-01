// Dominio del proceso de compra.

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
} as const

export type EstadoProceso = (typeof ESTADO_PROCESO)[keyof typeof ESTADO_PROCESO]

export type EstadoBadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral'

interface EstadoMeta {
  label: string
  clase: EstadoBadgeVariant
}

export const ESTADO_INFO: Record<EstadoProceso, EstadoMeta> = {
  borrador: { label: 'Borrador', clase: 'neutral' },
  publicado: { label: 'Publicado', clase: 'info' },
  en_subasta: { label: 'En subasta', clase: 'warning' },
  cerrada: { label: 'Subasta cerrada', clase: 'info' },
  adjudicada: {
    label: 'Adjudicada (pend. aprobacion)',
    clase: 'warning',
  },
  aprobada: { label: 'Aprobada', clase: 'success' },
  desierta: { label: 'Desierta', clase: 'neutral' },
  suspendida: { label: 'Suspendida por impugnacion', clase: 'warning' },
  cancelada: { label: 'Cancelada', clase: 'neutral' },
}

export function etiquetaEstado(estado: EstadoProceso | string): string {
  return ESTADO_INFO[estado as EstadoProceso]?.label ?? estado
}

export function claseEstado(estado: EstadoProceso | string): EstadoBadgeVariant {
  return ESTADO_INFO[estado as EstadoProceso]?.clase ?? 'neutral'
}

export function esEditable(estado: EstadoProceso | string): boolean {
  return estado === ESTADO_PROCESO.BORRADOR
}
