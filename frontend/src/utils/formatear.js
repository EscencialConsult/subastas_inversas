/**
 * @param {number} monto
 * @returns {string}
 */
export function formatearPesos(monto) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(monto)
}

/**
 * @param {string} fechaIso
 * @returns {string}
 */
export function formatearFecha(fechaIso) {
  if (!fechaIso) return '—'
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(fechaIso))
}

/**
 * @param {number} ms
 * @returns {string}
 */
export function formatearTiempo(ms) {
  const total = Math.max(0, Math.floor((ms ?? 0) / 1000))
  const min = String(Math.floor(total / 60)).padStart(2, '0')
  const seg = String(total % 60).padStart(2, '0')
  return `${min}:${seg}`
}
