// Simula la latencia y la forma de una API real.
//
// Cuando exista el backend, se reemplaza el cuerpo de estas funciones por
// llamadas fetch() reales y las pantallas no se tocan.

const LATENCIA_MS = 350

export function simularRed(resolver) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(resolver())
      } catch (error) {
        reject(error)
      }
    }, LATENCIA_MS)
  })
}

// Error con forma uniforme para que las pantallas muestren el mensaje sin adivinar.
export class ApiError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}
