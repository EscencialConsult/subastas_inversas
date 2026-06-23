import { useState, useEffect } from 'react'

/**
 * Hook personalizado para manejar el ciclo de vida de peticiones API
 * @param {Function} fn Función asíncrona que realiza la petición API
 * @param {Array} deps Dependencias para volver a ejecutar el efecto
 * @param {boolean} condition Condición para ejecutar la petición inicial
 */
export function useApi(fn, deps = [], condition = true) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(condition)
  const [error, setError] = useState(null)

  const ejecutar = async (...args) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fn(...args)
      setData(res)
      return res
    } catch (err) {
      const msg = err.message || 'Error al procesar la solicitud'
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!condition) {
      setLoading(false)
      return undefined
    }

    let activo = true
    const cargar = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fn()
        if (activo) setData(res)
      } catch (err) {
        if (activo) setError(err.message || 'Error al cargar los datos')
      } finally {
        if (activo) setLoading(false)
      }
    }

    cargar()

    return () => {
      activo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, loading, error, setData, ejecutar }
}
