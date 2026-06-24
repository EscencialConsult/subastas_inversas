// Home del proveedor: ve su perfil de empresa y su estado de verificación.
// Es su "espacio propio": no ve nada de ningún tenant comprador.

import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthContext.jsx'
import { obtenerProveedorDeUsuario } from '../../api/proveedoresApi.js'

const ESTADO = {
  pendiente: { texto: 'Pendiente de verificación', clase: 'badge--off' },
  verificado: { texto: 'Verificado', clase: 'badge--ok' },
}

export function ProveedorHomePage() {
  const { usuario } = useAuth()
  const [proveedor, setProveedor] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    obtenerProveedorDeUsuario({ usuarioId: usuario.id })
      .then(setProveedor)
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false))
  }, [usuario.id])

  if (cargando) return <p className="estado-cargando">Cargando…</p>
  if (error) return <div className="alerta alerta--error">{error}</div>

  const estado = ESTADO[proveedor.estado] ?? ESTADO.pendiente

  return (
    <section className="form-pagina">
      <div className="encabezado">
        <h1>Mi cuenta de proveedor</h1>
      </div>

      <div className="form">
        <h2 className="form__titulo">Datos de la empresa</h2>
        <div className="perfil__solo-lectura">
          <span>Razón social: {proveedor.razonSocial}</span>
          <span>CUIT: {proveedor.cuit}</span>
          <span>Email: {usuario.email}</span>
        </div>

        <div className="proveedor__estado">
          <span>Estado:</span>
          <span className={`badge ${estado.clase}`}>{estado.texto}</span>
        </div>

        {proveedor.estado === 'pendiente' && (
          <p className="form__seccion-ayuda">
            Tu cuenta está creada pero todavía no fue verificada. Una vez verificada
            (control de tu situación en ARCA) vas a poder participar de las subastas.
          </p>
        )}
      </div>
    </section>
  )
}
