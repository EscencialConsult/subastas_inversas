import { apiFetch } from './client'

const EVENTOS_ACCESO = {
  LoginSucceeded: 'Login exitoso',
  LoginFailed: 'Login fallido',
  MfaRequired: 'MFA requerido',
  MfaSucceeded: 'MFA exitoso',
  MfaFailed: 'MFA fallido',
  RefreshSucceeded: 'Refresh exitoso',
  RefreshFailed: 'Refresh fallido',
  Logout: 'Logout',
}

export async function listarBitacoraAccesos({ tenantId, email = '', exito = '' } = {}) {
  const params = new URLSearchParams()
  if (tenantId) params.set('companyId', tenantId)
  if (email.trim()) params.set('email', email.trim())
  if (exito) params.set('success', exito === 'ok')

  const qs = params.toString()
  const data = await apiFetch(`/audit/events/access-logs${qs ? `?${qs}` : ''}`)
  return (Array.isArray(data) ? data : []).map((item) => ({
    id: item.id,
    email: item.email,
    evento: item.eventType,
    eventoTexto: EVENTOS_ACCESO[item.eventType] ?? item.eventType,
    exito: item.success,
    motivo: item.failureReason,
    ip: item.ipAddress,
    userAgent: item.userAgent,
    fecha: item.occurredAtUtc,
  }))
}

export async function listarAlertasRiesgo({ tenantId, procesoId = '', severidad = '' } = {}) {
  const params = new URLSearchParams()
  if (tenantId) params.set('companyId', tenantId)
  if (procesoId) params.set('purchaseProcessId', procesoId)
  if (severidad) params.set('severity', severidad)

  const qs = params.toString()
  const data = await apiFetch(`/audit/events/risk-alerts${qs ? `?${qs}` : ''}`)
  return (Array.isArray(data) ? data : []).map((item) => ({
    tenantId: item.companyId,
    procesoId: item.purchaseProcessId,
    codigoProceso: item.processCode,
    tituloProceso: item.processTitle,
    subastaId: item.auctionId,
    codigo: item.code,
    severidad: item.severity,
    mensaje: item.message,
    valor: item.metricValue,
    unidad: item.metricUnit,
    detectadaEn: item.detectedAtUtc,
  }))
}

export async function verificarIntegridad({ tenantId } = {}) {
  const params = new URLSearchParams()
  if (tenantId) params.set('companyId', tenantId)

  const qs = params.toString()
  const data = await apiFetch(`/audit/events/integrity${qs ? `?${qs}` : ''}`)
  return {
    esValida: Boolean(data.isValid),
    verificadaEn: data.verifiedAtUtc,
    eventosAuditoria: data.auditEventsChecked ?? 0,
    cadenasLances: data.bidChainsChecked ?? 0,
    lances: data.bidsChecked ?? 0,
    firmas: data.signaturesChecked ?? 0,
    documentos: data.documentsChecked ?? 0,
    hallazgos: (data.findings ?? []).map((finding) => ({
      alcance: finding.scope,
      entidad: finding.entityName,
      entidadId: finding.entityId,
      severidad: finding.severity,
      mensaje: finding.message,
      hashEsperado: finding.expectedHash,
      hashActual: finding.actualHash,
    })),
  }
}

export async function obtenerPanelRiesgoAuditoria({ tenantId } = {}) {
  const params = new URLSearchParams()
  if (tenantId) params.set('companyId', tenantId)

  const qs = params.toString()
  const data = await apiFetch(`/audit/events/risk-dashboard${qs ? `?${qs}` : ''}`)
  return {
    generadoEn: data.generatedAtUtc,
    totalProcesos: data.totalProcesses ?? 0,
    totalSubastas: data.totalAuctions ?? 0,
    totalAlertas: data.totalAlerts ?? 0,
    alertasAltas: data.highRiskAlerts ?? 0,
    alertasMedias: data.mediumRiskAlerts ?? 0,
    alertasInfo: data.infoRiskAlerts ?? 0,
    procesosConAlertas: data.processesWithAlerts ?? 0,
    integridadValida: Boolean(data.integrityIsValid),
    hallazgosIntegridad: data.integrityFindings ?? 0,
    procesosRiesgo: (data.topRiskProcesses ?? []).map((p) => ({
      procesoId: p.purchaseProcessId,
      codigo: p.processCode,
      titulo: p.processTitle,
      alertas: p.alertsCount,
      altas: p.highRiskAlerts,
      medias: p.mediumRiskAlerts,
      info: p.infoRiskAlerts,
    })),
  }
}

export async function exportarAuditoriaCsvFirmado({ tenantId } = {}) {
  const params = new URLSearchParams()
  if (tenantId) params.set('companyId', tenantId)

  const qs = params.toString()
  const data = await apiFetch(`/audit/events/export/signed-csv${qs ? `?${qs}` : ''}`)
  return {
    nombreArchivo: data.fileName,
    generadoEn: data.generatedAtUtc,
    contenidoCsv: data.csvContent,
    sha256: data.sha256Hash,
    firma: data.signature,
    algoritmo: data.signatureAlgorithm,
  }
}
