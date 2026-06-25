import { apiFetch } from './client.js'

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
