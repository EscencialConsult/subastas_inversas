import React from 'react'

/**
 * Componente unificado para renderizar estados de carga, error y vacío.
 * @param {object} props
 * @param {boolean} props.loading
 * @param {string|null} props.error
 * @param {boolean} props.empty
 * @param {string} [props.emptyMessage]
 * @param {React.ReactNode} props.children
 */
export function StateHandler({ 
  loading, 
  error, 
  empty, 
  emptyMessage = 'No se encontraron datos.', 
  children 
}) {
  if (loading) {
    return <p className="estado-cargando">Cargando...</p>
  }

  if (error) {
    return (
      <div className="alerta alerta--error">
        {error}
      </div>
    )
  }

  if (empty) {
    return <p className="estado-vacio">{emptyMessage}</p>
  }

  return <>{children}</>
}
