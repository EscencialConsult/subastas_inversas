import { useEffect, useState } from 'react'
import { Building2, BadgeCheck, Clock, Mail, MapPin, X } from 'lucide-react'
import { useAuth } from '../../auth/useAuth.js'
import { obtenerProveedorDeUsuario } from '../../api/proveedoresApi.js'
import { iniciales } from '../../utils/iniciales.js'

const ESTADO = {
  pendiente: { texto: 'Pendiente de verificación', clase: 'badge--off', icon: Clock },
  verificado: { texto: 'Verificado', clase: 'badge--ok', icon: BadgeCheck },
  rechazado: { texto: 'Rechazado', clase: 'badge--off', icon: X },
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

  if (cargando) return <p className="estado-cargando">Cargando...</p>
  if (error && !proveedor) return <div className="alerta alerta--error">{error}</div>

  const estado = ESTADO[proveedor?.estado] ?? ESTADO.pendiente
  const EstadoIcon = estado.icon

  return (
    <section className="form-pagina">
      <div className="encabezado">
        <h1>Mi cuenta de proveedor</h1>
      </div>

      {error && <div className="alerta alerta--error">{error}</div>}

      <div className="perfil__resumen">
        <span className="perfil__avatar">
          {iniciales(proveedor.razonSocial)}
        </span>
        <div className="perfil__resumen-info">
          <span className="perfil__resumen-nombre">{proveedor.razonSocial}</span>
          <span className="perfil__resumen-detalle">
            <EstadoIcon size={15} />
            {estado.texto}
            <span aria-hidden="true">·</span>
            CUIT {proveedor.cuit}
          </span>
        </div>
      </div>

      <div className="perfil__seccion">
        <div className="perfil__seccion-header">
          <span className="perfil__seccion-icon">
            <Building2 size={18} />
          </span>
          <div>
            <h2>Datos de la empresa</h2>
            <p>Información registrada en tu perfil de proveedor</p>
          </div>
        </div>

        <div className="proveedor-home__datos">
          <div className="proveedor-home__dato">
            <span className="proveedor-home__dato-label">Razón social</span>
            <span className="proveedor-home__dato-valor">{proveedor.razonSocial}</span>
          </div>
          <div className="proveedor-home__dato">
            <span className="proveedor-home__dato-label">CUIT</span>
            <span className="proveedor-home__dato-valor">{proveedor.cuit}</span>
          </div>
          <div className="proveedor-home__dato">
            <span className="proveedor-home__dato-label">
              <Mail size={14} /> Email
            </span>
            <span className="proveedor-home__dato-valor">{usuario.email}</span>
          </div>
          <div className="proveedor-home__dato">
            <span className="proveedor-home__dato-label">
              <MapPin size={14} /> Provincia
            </span>
            <span className="proveedor-home__dato-valor">{proveedor.provincia}</span>
          </div>
          <div className="proveedor-home__dato">
            <span className="proveedor-home__dato-label">
              <MapPin size={14} /> Localidad
            </span>
            <span className="proveedor-home__dato-valor">{proveedor.localidad}</span>
          </div>
          <div className="proveedor-home__dato">
            <span className="proveedor-home__dato-label">Estado</span>
            <span className="proveedor-home__dato-valor">
              <span className={`badge ${estado.clase}`}>
                <EstadoIcon size={13} /> {estado.texto}
              </span>
            </span>
          </div>
        </div>

        {proveedor.estado === 'pendiente' && (
          <div className="proveedor-home__aviso">
            <Clock size={16} />
            <span>
              Tu cuenta está creada pero todavía no fue verificada. Una vez verificada
              por ARCA vas a poder participar de las subastas.
            </span>
          </div>
        )}
      </div>
    </section>
  )
}
