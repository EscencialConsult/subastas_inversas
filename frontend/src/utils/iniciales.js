/**
 * @param {string} [nombre='']
 * @param {string} [apellido='']
 * @returns {string}
 */
export function iniciales(nombre = '', apellido = '') {
  return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase() || 'U'
}
