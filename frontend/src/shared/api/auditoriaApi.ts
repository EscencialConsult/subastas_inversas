import { apiFetch } from './client'
import type { components } from './schema'

type AccessLogResponse = components["schemas"]["AccessLogDto"]
type RiskAlertResponse = components["schemas"]["RiskAlertDto"]
type IntegrityVerificationResponse = components["schemas"]["IntegrityVerificationDto"]
type RiskDashboardResponse = components["schemas"]["RiskDashboardDto"]
type ExportSignedCsvResponse = Record<string, unknown>

const EVENTOS_ACCESO: Record<string, string> = {
  LoginSucceeded: 'Login exitoso',
  LoginFailed: 'Login fallido',
  MfaRequired: 'MFA requerido',
  MfaSucceeded: 'MFA exitoso',
  MfaFailed: 'MFA fallido',
  RefreshSucceeded: 'Refresh exitoso',
  RefreshFailed: 'Refresh fallido',
  Logout: 'Logout',
}

export interface ListarBitacoraQueryParams {
  tenantId?: string
  email?: string
  exito?: string
}

export interface AccessLogMapped {
  id: string
  email: string
  evento: string
  eventoTexto: string
  exito: boolean
  motivo?: string | null
  ip?: string | null
  userAgent?: string | null
  fecha: string
}

export async function listarBitacoraAccesos({ tenantId, email = '', exito = '' }: ListarBitacoraQueryParams = {}): Promise<AccessLogMapped[]> {
  const params = new URLSearchParams()
  if (tenantId) params.set('companyId', tenantId)
  if (email.trim()) params.set('email', email.trim())
  if (exito) params.set('success', String(exito === 'ok'))

  const qs = params.toString()
  const data = await apiFetch<AccessLogResponse[]>(`/audit/events/access-logs${qs ? `?${qs}` : ''}`)
  return (Array.isArray(data) ? data : []).map((item) => ({
    id: item.id ?? '',
    email: item.email ?? '',
    evento: String(item.eventType ?? ''),
    eventoTexto: EVENTOS_ACCESO[String(item.eventType ?? '')] ?? String(item.eventType ?? ''),
    exito: Boolean(item.success),
    motivo: item.failureReason,
    ip: item.ipAddress,
    userAgent: item.userAgent,
    fecha: item.occurredAtUtc ?? '',
  }))
}

export interface ListarAlertasQueryParams {
  tenantId?: string
  procesoId?: string
  severidad?: string
}

export interface RiskAlertMapped {
  tenantId: string
  procesoId: string
  codigoProceso: string
  tituloProceso: string
  subastaId?: string | null
  codigo: string
  severidad: string
  mensaje: string
  valor: number
  unidad: string
  detectadaEn: string
}

export async function listarAlertasRiesgo({ tenantId, procesoId = '', severidad = '' }: ListarAlertasQueryParams = {}): Promise<RiskAlertMapped[]> {
  const params = new URLSearchParams()
  if (tenantId) params.set('companyId', tenantId)
  if (procesoId) params.set('purchaseProcessId', procesoId)
  if (severidad) params.set('severity', severidad)

  const qs = params.toString()
  const data = await apiFetch<RiskAlertResponse[]>(`/audit/events/risk-alerts${qs ? `?${qs}` : ''}`)
  return (Array.isArray(data) ? data : []).map((item) => ({
    tenantId: item.companyId ?? '',
    procesoId: item.purchaseProcessId ?? '',
    codigoProceso: item.processCode ?? '',
    tituloProceso: item.processTitle ?? '',
    subastaId: item.auctionId,
    codigo: item.code ?? '',
    severidad: item.severity ?? '',
    mensaje: item.message ?? '',
    valor: item.metricValue ?? 0,
    unidad: item.metricUnit ?? '',
    detectadaEn: item.detectedAtUtc ?? '',
  }))
}

export interface IntegrityFindingMapped {
  alcance?: string | null
  entidad?: string | null
  entidadId?: string | null
  severidad?: string | null
  mensaje?: string | null
  hashEsperado?: string | null
  hashActual?: string | null
}

export interface IntegrityVerificationMapped {
  esValida: boolean
  verificadaEn: string
  eventosAuditoria: number
  cadenasLances: number
  lances: number
  firmas: number
  documentos: number
  hallazgos: IntegrityFindingMapped[]
}

export async function verificarIntegridad({ tenantId }: { tenantId?: string } = {}): Promise<IntegrityVerificationMapped> {
  const params = new URLSearchParams()
  if (tenantId) params.set('companyId', tenantId)

  const qs = params.toString()
  const data = await apiFetch<IntegrityVerificationResponse>(`/audit/events/integrity${qs ? `?${qs}` : ''}`)
  return {
    esValida: Boolean(data.isValid),
    verificadaEn: data.verifiedAtUtc ?? '',
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

export interface RiskProcessMapped {
  procesoId: string
  codigo: string
  titulo: string
  alertas: number
  altas: number
  medias: number
  info: number
}

export interface RiskDashboardMapped {
  generadoEn: string
  totalProcesos: number
  totalSubastas: number
  totalAlertas: number
  alertasAltas: number
  alertasMedias: number
  alertasInfo: number
  procesosConAlertas: number
  integridadValida: boolean
  hallazgosIntegridad: number
  procesosRiesgo: RiskProcessMapped[]
}

export async function obtenerPanelRiesgoAuditoria({ tenantId }: { tenantId?: string } = {}): Promise<RiskDashboardMapped> {
  const params = new URLSearchParams()
  if (tenantId) params.set('companyId', tenantId)

  const qs = params.toString()
  const data = await apiFetch<RiskDashboardResponse>(`/audit/events/risk-dashboard${qs ? `?${qs}` : ''}`)
  return {
    generadoEn: data.generatedAtUtc ?? '',
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
      procesoId: p.purchaseProcessId ?? '',
      codigo: p.processCode ?? '',
      titulo: p.processTitle ?? '',
      alertas: p.alertsCount ?? 0,
      altas: p.highRiskAlerts ?? 0,
      medias: p.mediumRiskAlerts ?? 0,
      info: p.infoRiskAlerts ?? 0,
    })),
  }
}

export interface ExportSignedCsvMapped {
  nombreArchivo?: string | null
  generadoEn: string
  contenidoCsv?: string | null
  sha256?: string | null
  firma?: string | null
  algoritmo?: string | null
}

export async function exportarAuditoriaCsvFirmado({ tenantId }: { tenantId?: string } = {}): Promise<ExportSignedCsvMapped> {
  const params = new URLSearchParams()
  if (tenantId) params.set('companyId', tenantId)

  const qs = params.toString()
  const data = await apiFetch<ExportSignedCsvResponse>(`/audit/events/export/signed-csv${qs ? `?${qs}` : ''}`)
  return {
    nombreArchivo: data.fileName as string | undefined,
    generadoEn: (data.generatedAtUtc as string) ?? '',
    contenidoCsv: data.csvContent as string | undefined,
    sha256: data.sha256Hash as string | undefined,
    firma: data.signature as string | undefined,
    algoritmo: data.signatureAlgorithm as string | undefined,
  }
}
