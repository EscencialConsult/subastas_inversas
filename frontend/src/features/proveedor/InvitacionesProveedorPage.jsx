import { useEffect, useState } from 'react'
import { Check, X, Inbox, Clock, FileText, Hash, Calendar } from 'lucide-react'
import { useAuth } from '../../auth/useAuth.js'
import { obtenerProveedorDeUsuario, listarInvitacionesDeProveedor, responderInvitacion } from '../../api/proveedoresApi.js'
import { ESTADO_INVITACION, etiquetaEstadoInvitacion, claseEstadoInvitacion } from '../../domain/invitaciones.js'
import { formatearFecha } from '../../utils/formatear.js'

export function InvitacionesProveedorPage() {
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

  if (cargando) return <p className="estado-cargando">Cargando invitaciones...</p>
  if (error && !proveedor) return <div className="alerta alerta--error">{error}</div>

  const aceptadas = invitaciones.filter((i) => i.status === ESTADO_INVITACION.ACCEPTED)
  const pendientes = invitaciones.filter((i) => i.status === ESTADO_INVITACION.PENDING)
  const rechazadas = invitaciones.filter((i) => i.status === ESTADO_INVITACION.REJECTED)

  return (
    <section className="form-pagina">
      <div className="encabezado">
        <div>
          <span className="pagina-eyebrow">Proveedor</span>
          <h1>Invitaciones a procesos</h1>
          <p className="pagina-descripcion">
            Respondé a las invitaciones de los organismos compradores.
          </p>
        </div>
      </div>

      {error && <div className="alerta alerta--error">{error}</div>}

      <div className="subastas-prov__metricas">
        <div className="subastas-prov__metrica">
          <span><Inbox size={16} /></span>
          <small>Total</small>
          <strong>{invitaciones.length}</strong>
        </div>
        <div className="subastas-prov__metrica subastas-prov__metrica--warn">
          <span><Clock size={16} /></span>
          <small>Pendientes</small>
          <strong>{pendientes.length}</strong>
        </div>
        <div className="subastas-prov__metrica subastas-prov__metrica--ok">
          <span><Check size={16} /></span>
          <small>Aceptadas</small>
          <strong>{aceptadas.length}</strong>
        </div>
        <div className="subastas-prov__metrica subastas-prov__metrica--error">
          <span><X size={16} /></span>
          <small>Rechazadas</small>
          <strong>{rechazadas.length}</strong>
        </div>
      </div>

      {invitaciones.length === 0 ? (
        <div className="subastas-prov__empty">
          <span><Inbox size={26} /></span>
          <h2>Sin invitaciones</h2>
          <p>Todavía no recibiste invitaciones a procesos de compra.</p>
          <p className="text-xs text-slate-400">
            Cuando un organismo comprador te invite, vas a verlo acá.
          </p>
        </div>
      ) : (
        <div className="perfil__seccion">
          <div className="perfil__seccion-header">
            <span className="perfil__seccion-icon">
              <Inbox size={18} />
            </span>
            <div>
              <h2>Invitaciones a procesos</h2>
              <p>Respondé a las invitaciones de los organismos compradores</p>
            </div>
          </div>
          <div className="perfil__cuerpo">
            <table className="tabla">
              <thead>
                <tr>
                  <th><FileText size={14} /> Proceso</th>
                  <th><Hash size={14} /> Código</th>
                  <th><Calendar size={14} /> Invitado</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {invitaciones.map((inv) => (
                  <tr key={inv.id}>
                    <td className="font-semibold text-slate-900">{inv.processTitle}</td>
                    <td><code>{inv.processCode}</code></td>
                    <td className="text-sm text-slate-500">{formatearFecha(inv.invitedAtUtc)}</td>
                    <td>
                      <span className={`badge ${claseEstadoInvitacion(inv.status)}`}>
                        {etiquetaEstadoInvitacion(inv.status)}
                      </span>
                    </td>
                    <td>
                      {inv.status === ESTADO_INVITACION.PENDING ? (
                        <div className="proveedor-home__acciones">
                          <button
                            className="btn btn--primario btn--sm"
                            onClick={() => responder(inv.id, true)}
                            disabled={respondiendo === inv.id}
                          >
                            <Check size={14} />
                            Aceptar
                          </button>
                          <button
                            className="btn btn--peligro btn--sm"
                            onClick={() => responder(inv.id, false)}
                            disabled={respondiendo === inv.id}
                          >
                            <X size={14} />
                            Rechazar
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}
