export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5185'
const CLAVE_STORAGE = 'sicst.sesion'

export class ApiError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiFetch(endpoint, options = {}) {
  const url = `${API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
  const isFormData = options.body instanceof FormData
  
  // Set default headers
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...options.headers,
  }

  // Get token from localStorage if logged in
  try {
    const sesionCruda = localStorage.getItem(CLAVE_STORAGE)
    if (sesionCruda) {
      const sesion = JSON.parse(sesionCruda)
      if (sesion?.token) {
        headers['Authorization'] = `Bearer ${sesion.token}`
      }
    }
  } catch (e) {
    console.error('Error al leer el token de autenticación:', e)
  }

  const fetchOptions = {
    ...options,
    headers,
  }

  let respuesta
  try {
    respuesta = await fetch(url, fetchOptions)
  } catch {
    throw new ApiError('No se pudo conectar con el servidor. Verificá que el backend esté corriendo.', 503)
  }

  let cuerpo = null
  const tipoContenido = respuesta.headers.get('content-type')
  if (tipoContenido && tipoContenido.includes('application/json')) {
    cuerpo = await respuesta.json()
  } else {
    const texto = await respuesta.text()
    if (texto) {
      try {
        cuerpo = JSON.parse(texto)
      } catch {
        cuerpo = texto
      }
    }
  }

  if (!respuesta.ok) {
    // Si el backend devolvió un objeto de error estructurado con la propiedad "message"
    const mensaje = cuerpo?.message || (typeof cuerpo === 'string' ? cuerpo : 'Ocurrió un error inesperado.')
    throw new ApiError(mensaje, respuesta.status)
  }

  return cuerpo
}
