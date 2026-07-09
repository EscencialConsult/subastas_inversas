import { ReactNode } from 'react'

export const TIPOS_EVENTO = [
  { value: '', label: 'Todos los eventos' },
  { value: 'LoginSucceeded', label: 'Login exitoso' },
  { value: 'LoginFailed', label: 'Login fallido' },
  { value: 'MfaRequired', label: 'MFA requerido' },
  { value: 'MfaSucceeded', label: 'MFA exitoso' },
  { value: 'MfaFailed', label: 'MFA fallido' },
  { value: 'RefreshSucceeded', label: 'Refresh exitoso' },
  { value: 'RefreshFailed', label: 'Refresh fallido' },
  { value: 'Logout', label: 'Logout' },
]

export function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-text-muted">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-text">{value ?? '---'}</dd>
    </div>
  )
}

export function descargarArchivoCsv(exportacion: { contenidoCsv: string; nombreArchivo?: string }) {
  const blob = new Blob(['\ufeff' + exportacion.contenidoCsv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = exportacion.nombreArchivo || 'auditoria-firmada.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export function formatearFecha(fecha: unknown) {
  if (!fecha || typeof fecha !== 'string') return '-'
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(fecha))
}

export function etiquetaSeveridad(severidad: string) {
  const mapa: Record<string, string> = { high: 'Alta', medium: 'Media', info: 'Info' }
  return mapa[severidad] ?? severidad
}

export function claseSeveridad(severidad: string): 'error' | 'warning' | 'info' | 'neutral' {
  const mapa: Record<string, 'error' | 'warning' | 'info'> = { high: 'error', medium: 'warning', info: 'info' }
  return mapa[severidad] ?? 'neutral'
}

export function etiquetaAlcanceIntegridad(alcance: string) {
  const mapa: Record<string, string> = {
    audit_chain: 'Cadena de auditoría',
    bid_chain: 'Cadena de lances',
    auction_closing_act: 'Acta de cierre',
    evaluation_act: 'Acta de evaluación',
    award: 'Adjudicación',
    contract_signature: 'Contrato',
  }
  return mapa[alcance] ?? alcance
}
