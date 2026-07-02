import {
  exportarAuditoriaCsvFirmado,
  listarAlertasRiesgo,
  listarBitacoraAccesos,
  obtenerPanelRiesgoAuditoria,
  verificarIntegridad,
} from '../../../shared/api/auditoriaApi'
import { listarProcesosParaAuditoria } from '../../../shared/api/comprasApi'

export interface AuditoriaQueryParams {
  tenantId?: string | null
  busqueda?: string
  estado?: string
  emailAcceso?: string
  exitoAcceso?: string
  severidadAlerta?: string
}

export const auditoriaKeys = {
  all: ['auditoria'] as const,
  panel: (tenantId?: string | null) => [...auditoriaKeys.all, 'panel', tenantId ?? ''] as const,
  list: (params: AuditoriaQueryParams) => [...auditoriaKeys.all, 'list', params] as const,
  integrity: (tenantId?: string | null) => [...auditoriaKeys.all, 'integrity', tenantId ?? ''] as const,
}

export async function auditoriaQuery(params: AuditoriaQueryParams) {
  const tenantId = params.tenantId ?? undefined
  const [procesos, accesos, alertas, panelRiesgo] = await Promise.all([
    listarProcesosParaAuditoria({
      tenantId: tenantId ?? '',
      busqueda: params.busqueda ?? '',
      estado: params.estado ?? '',
    }),
    listarBitacoraAccesos({
      tenantId,
      email: params.emailAcceso ?? '',
      exito: params.exitoAcceso ?? '',
    }),
    listarAlertasRiesgo({
      tenantId,
      severidad: params.severidadAlerta ?? '',
    }),
    obtenerPanelRiesgoAuditoria({ tenantId }),
  ])

  return { procesos, accesos, alertas, panelRiesgo }
}

export function verificarIntegridadMutation({ tenantId }: { tenantId?: string | null }) {
  return verificarIntegridad({ tenantId: tenantId ?? undefined })
}

export function exportarAuditoriaMutation({ tenantId }: { tenantId?: string | null }) {
  return exportarAuditoriaCsvFirmado({ tenantId: tenantId ?? undefined })
}
