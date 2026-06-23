import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/useAuth.js'
import { obtenerProveedorDeUsuario, listarInvitacionesDeProveedor, responderInvitacion } from '../../api/proveedoresApi.js'
import { ESTADO_INVITACION, etiquetaEstadoInvitacion, claseEstadoInvitacion } from '../../domain/invitaciones.js'

const ESTADO = {
  pendiente: { texto: 'Pendiente de verificacion', clase: 'badge--off' },
  verificado: { texto: 'Verificado', clase: 'badge--ok' },
  rechazado: { texto: 'Rechazado', clase: 'badge--off' },
}

export function ProveedorHomePage() {
  const { usuario } = useAuth()
  const [proveedor, setProveedor] = useState(null)
  const [invitaciones, setInvitaciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [respondiendo, setRespondiendo] = useState(null)

  useEffect(() => {
    obtenerProveedorDeUsuario({ usuarioId: usuario.id })
      .then((p) => {
        setProveedor(p)
        return listarInvitacionesDeProveedor({ proveedorId: p.id })
      })
      .then(setInvitaciones)
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false))
  }, [usuario.id])

  async function responder(invitacionId, aceptar) {
    if (!proveedor) return
    setRespondiendo(invitacionId)
    setError('')
    try {
      await responderInvitacion({ invitacionId, proveedorId: proveedor.id, aceptar })
      const actualizadas = await listarInvitacionesDeProveedor({ proveedorId: proveedor.id })
      setInvitaciones(actualizadas)
    } catch (err) {
      setError(err.message)
    } finally {
      setRespondiendo(null)
    }
  }

  if (cargando) return <p className="estado-cargando">Cargando...</p>
  if (error && !proveedor) return <div className="alerta alerta--error">{error}</div>

  const estado = ESTADO[proveedor?.estado] ?? ESTADO.pendiente
  const pendientes = invitaciones.filter((i) => i.status === ESTADO_INVITACION.PENDING)

  return (
    <section className="form-pagina">
      <div className="encabezado">
        <h1>Mi cuenta de proveedor</h1>
      </div>

      {error && <div className="alerta alerta--error">{error}</div>}

      <div className="form">
        <h2 className="form__titulo">Datos de la empresa</h2>
        <div className="perfil__solo-lectura">
          <span>Razon social: {proveedor.razonSocial}</span>
          <span>CUIT: {proveedor.cuit}</span>
          <span>Email: {usuario.email}</span>
          <span>Provincia: {proveedor.provincia}</span>
          <span>Localidad: {proveedor.localidad}</span>
        </div>

        <div className="proveedor__estado">
          <span>Estado:</span>
          <span className={`badge ${estado.clase}`}>{estado.texto}</span>
        </div>

        {proveedor.estado === 'pendiente' && (
          <p className="form__seccion-ayuda">
            Tu cuenta esta creada pero todavia no fue verificada. Una vez verificada
            por ARCA vas a poder participar de las subastas.
          </p>
        )}
      </div>

      {invitaciones.length > 0 && (
        <div className="form" style={{ marginTop: 20 }}>
          <h2 className="form__titulo">
            Invitaciones a procesos
            {pendientes.length > 0 && (
              <span className="badge badge--warn" style={{ marginLeft: 8 }}>
                {pendientes.length} pendiente{pendientes.length !== 1 ? 's' : ''}
              </span>
            )}
          </h2>
          <table className="tabla">
            <thead>
              <tr>
                <th>Proceso</th>
                <th>Codigo</th>
                <th>Invitado</th>
                <th>Estado</th>
                <th>Accion</th>
              </tr>
            </thead>
            <tbody>
              {invitaciones.map((inv) => (
                <tr key={inv.id}>
                  <td>{inv.processTitle}</td>
                  <td>{inv.processCode}</td>
                  <td>{inv.invitedAtUtc?.slice(0, 10)}</td>
                  <td>
                    <span className={`badge ${claseEstadoInvitacion(inv.status)}`}>
                      {etiquetaEstadoInvitacion(inv.status)}
                    </span>
                  </td>
                  <td>
                    {inv.status === ESTADO_INVITACION.PENDING ? (
                      <div className="tabla__acciones">
                        <button
                          className="btn btn--primario"
                          onClick={() => responder(inv.id, true)}
                          disabled={respondiendo === inv.id}
                          style={{ fontSize: 12, padding: '4px 10px' }}
                        >
                          Aceptar
                        </button>
                        <button
                          className="btn btn--peligro"
                          onClick={() => responder(inv.id, false)}
                          disabled={respondiendo === inv.id}
                          style={{ fontSize: 12, padding: '4px 10px' }}
                        >
                          Rechazar
                        </button>
                      </div>
                    ) : (
                      <span className="form__seccion-ayuda">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {invitaciones.length === 0 && proveedor && (
        <div className="estado-vacio" style={{ marginTop: 20 }}>
          <p>Todavia no recibiste invitaciones a procesos de compra.</p>
        </div>
      )}
    </section>
  )
}
