import {
  exportarAuditoriaCsvFirmado,
  listarAlertasRiesgo,
  listarBitacoraAccesos,
  obtenerPanelRiesgoAuditoria,
  verificarIntegridad,
} from '../../../shared/api/auditoriaApi'
import {
  listarInvitacionesProcesoAudit,
  listarProcesosParaAuditoria,
  obtenerProcesoParaAuditoria,
  obtenerResultadosEvaluacionParaAuditoria,
} from '../../../shared/api/comprasApi'
import { obtenerSubastaDeProcesoParaAuditoria } from '../../../shared/api/subastasApi'
import { nombresPorIds } from '../../../shared/api/usersApi'

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
  detail: (tenantId?: string | null, id?: string | null) =>
    [...auditoriaKeys.all, 'detail', tenantId ?? '', id ?? ''] as const,
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

export async function auditoriaDetailQuery({ tenantId, id }: { tenantId?: string | null; id?: string | null }) {
  const companyId = tenantId ?? ''
  const procesoId = id ?? ''
  const proceso = await obtenerProcesoParaAuditoria({ tenantId: companyId, id: procesoId })

  const [subasta, invitaciones, evalResults, alertasRiesgo] = await Promise.all([
    obtenerSubastaDeProcesoParaAuditoria({ tenantId: companyId, procesoId }).catch(() => null),
    listarInvitacionesProcesoAudit({ tenantId: companyId, procesoId }).catch(() => []),
    obtenerResultadosEvaluacionParaAuditoria({ tenantId: companyId, procesoId }).catch(() => null),
    listarAlertasRiesgo({ tenantId: companyId, procesoId }).catch(() => []),
  ])

  const aprobacion = proceso.aprobacion as { autoridadId?: string } | null
  const ids = [
    proceso.compradorId,
    aprobacion?.autoridadId,
  ].filter(Boolean)
  const nombres = await nombresPorIds({ tenantId: companyId, ids })

  return { proceso, subasta, invitaciones, evalResults, alertasRiesgo, nombres }
}
