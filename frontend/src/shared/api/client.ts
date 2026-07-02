export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5185'

let accessToken: string | null = null

type JsonBody = Record<string, unknown> | unknown[] | number | boolean | null

export interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  body?: BodyInit | JsonBody
}

export function setAccessToken(token?: string | null) {
  accessToken = token || null
}

export function clearAccessToken() {
  accessToken = null
}

export function getAccessToken() {
  return accessToken
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiFetch<T = unknown>(endpoint: string, options: ApiFetchOptions = {}): Promise<T> {
  const url = `${API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
  const isFormData = options.body instanceof FormData
  const body = normalizeBody(options.body)

  const headers = new Headers(options.headers)
  if (!isFormData && body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  const fetchOptions: RequestInit = {
    ...options,
    body,
    headers,
    credentials: options.credentials ?? 'include',
  }

  let respuesta: Response
  try {
    respuesta = await fetch(url, fetchOptions)
  } catch {
    throw new ApiError('No se pudo conectar con el servidor. Verifica que el backend este corriendo.', 503)
  }

  const cuerpo = await parseResponseBody(respuesta)

  if (!respuesta.ok) {
    const mensaje = resolveErrorMessage(cuerpo)
    throw new ApiError(mensaje, respuesta.status)
  }

  return cuerpo as T
}

function normalizeBody(body: ApiFetchOptions['body']): BodyInit | undefined {
  if (body === undefined) {
    return undefined
  }

  if (isBodyInit(body)) {
    return body
  }

  return JSON.stringify(body)
}

function isBodyInit(body: ApiFetchOptions['body']): body is BodyInit {
  return (
    typeof body === 'string' ||
    body instanceof FormData ||
    body instanceof URLSearchParams ||
    body instanceof Blob ||
    body instanceof ArrayBuffer ||
    ArrayBuffer.isView(body) ||
    body instanceof ReadableStream
  )
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const tipoContenido = response.headers.get('content-type')
  if (tipoContenido && tipoContenido.includes('application/json')) {
    return response.json()
  }

  const texto = await response.text()
  if (!texto) {
    return null
  }

  try {
    return JSON.parse(texto)
  } catch {
    return texto
  }
}

function resolveErrorMessage(body: unknown): string {
  if (typeof body === 'string') {
    return body
  }

  if (body && typeof body === 'object' && 'message' in body) {
    const message = (body as { message?: unknown }).message
    if (typeof message === 'string') {
      return message
    }
  }

  return 'Ocurrio un error inesperado.'
}
