import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext.jsx'
import {
  listarInvitacionesDeProveedor,
  listarSubastasProveedor,
  obtenerProveedorDeUsuario,
  responderInvitacion,
} from '../../api/proveedoresApi.js'

const ESTADO_INVITACION = {
  pendiente: { texto: 'Pendiente', clase: 'badge--warn' },
  aceptada: { texto: 'Aceptada', clase: 'badge--ok' },
  rechazada: { texto: 'Rechazada', clase: 'badge--error' },
}

const ESTADO_SUBASTA = {
  Scheduled: { texto: 'Programada', clase: 'badge--info' },
  Open: { texto: 'Abierta', clase: 'badge--ok' },
  Closed: { texto: 'Cerrada', clase: 'badge--off' },
  Cancelled: { texto: 'Cancelada', clase: 'badge--error' },
}

export function ProveedorOportunidadesPage() {
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const [proveedor, setProveedor] = useState(null)
  const [invitaciones, setInvitaciones] = useState([])
  const [subastas, setSubastas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [respondiendoId, setRespondiendoId] = useState(null)
  const [rechazandoId, setRechazandoId] = useState(null)
  const [motivoRechazoText, setMotivoRechazoText] = useState('')
  const [error, setError] = useState('')
  const [errorComercial, setErrorComercial] = useState('')
  const [ahoraMs, setAhoraMs] = useState(() => Date.now())

  useEffect(() => {
    const intervalo = setInterval(() => setAhoraMs(Date.now()), 1000)
    return () => clearInterval(intervalo)
  }, [])

  useEffect(() => {
    obtenerProveedorDeUsuario({ usuarioId: usuario.id })
      .then((data) => {
        setProveedor(data)
        return Promise.all([
          listarInvitacionesDeProveedor({ proveedorId: data.id }),
          listarSubastasProveedor({ proveedorId: data.id }),
        ])
      })
      .then(([invitacionesProveedor, subastasProveedor]) => {
        setInvitaciones(invitacionesProveedor)
        setSubastas(subastasProveedor)
      })
      .catch((err) => setError(err.message))
      .finally(() => {
        setCargando(false)
      })
  }, [usuario.id])

  const manejarRespuestaInvitacion = async (invitacionId, aceptar, motivo = null) => {
    setRespondiendoId(invitacionId)
    setErrorComercial('')
    try {
      const invitacion = await responderInvitacion({
        invitacionId,
        proveedorId: proveedor.id,
        aceptar,
        rejectionReason: motivo,
      })

      setInvitaciones((actual) =>
        actual.map((item) => (item.id === invitacionId ? invitacion : item)),
      )
    } catch (err) {
      setErrorComercial(err.message)
    } finally {
      setRespondiendoId(null)
    }
  }

  const iniciarRechazo = (invitacionId) => {
    setRechazandoId(invitacionId)
    setMotivoRechazoText('')
    setErrorComercial('')
  }

  const manejarCancelarRechazo = () => {
    setRechazandoId(null)
    setMotivoRechazoText('')
  }

  const manejarConfirmarRechazo = async (invitacionId) => {
    if (!motivoRechazoText.trim()) {
      setErrorComercial('El motivo del rechazo es obligatorio.')
      return
    }
    await manejarRespuestaInvitacion(invitacionId, false, motivoRechazoText.trim())
    setRechazandoId(null)
    setMotivoRechazoText('')
  }

  if (cargando) return <p className="estado-cargando">Cargando...</p>
  if (error) return <div className="alerta alerta--error">{error}</div>

  return (
    <section className="form-pagina proveedor-home">
      <div className="encabezado">
        <h1>Oportunidades Comerciales</h1>
      </div>

      <div className="form">
        <h2 className="form__titulo">Invitaciones a procesos</h2>
        {errorComercial && <div className="alerta alerta--error">{errorComercial}</div>}

        {invitaciones.length === 0 ? (
          <p className="form__seccion-ayuda">Todavia no recibiste invitaciones de compradores.</p>
        ) : (
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Proceso</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {invitaciones.map((invitacion) => {
                  const estadoInvitacion =
                    ESTADO_INVITACION[invitacion.estado] ?? ESTADO_INVITACION.pendiente
                  return (
                    <tr key={invitacion.id}>
                      <td>
                        <code>{invitacion.codigoProceso || '---'}</code> {invitacion.tituloProceso}
                      </td>
                      <td>{formatearFecha(invitacion.invitadoEn)}</td>
                      <td>
                        <span className={`badge ${estadoInvitacion.clase}`}>
                          {estadoInvitacion.texto}
                        </span>
                        {invitacion.estado === 'rechazada' && invitacion.rejectionReason && (
                          <div className="campo__ayuda" style={{ marginTop: '0.25rem' }}>
                            Motivo: {invitacion.rejectionReason}
                          </div>
                        )}
                      </td>
                      <td className="tabla__acciones">
                        {invitacion.estado === 'pendiente' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {rechazandoId === invitacion.id ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: '200px' }}>
                                <input
                                  type="text"
                                  placeholder="Motivo del rechazo (obligatorio)"
                                  value={motivoRechazoText}
                                  onChange={(e) => setMotivoRechazoText(e.target.value)}
                                  className="campo"
                                  style={{ padding: '4px', fontSize: '0.875rem' }}
                                />
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  <button
                                    className="btn btn--texto"
                                    type="button"
                                    onClick={() => manejarConfirmarRechazo(invitacion.id)}
                                    disabled={respondiendoId === invitacion.id}
                                    style={{ color: 'var(--color-error)' }}
                                  >
                                    Confirmar
                                  </button>
                                  <button
                                    className="btn btn--texto"
                                    type="button"
                                    onClick={manejarCancelarRechazo}
                                    disabled={respondiendoId === invitacion.id}
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                  className="btn btn--texto"
                                  type="button"
                                  onClick={() => manejarRespuestaInvitacion(invitacion.id, true)}
                                  disabled={respondiendoId === invitacion.id}
                                >
                                  Aceptar
                                </button>
                                <button
                                  className="btn btn--texto"
                                  type="button"
                                  onClick={() => iniciarRechazo(invitacion.id)}
                                  disabled={respondiendoId === invitacion.id}
                                >
                                  Rechazar
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="form">
        <h2 className="form__titulo">Subastas disponibles</h2>
        {subastas.length === 0 ? (
          <p className="form__seccion-ayuda">
            Las subastas van a aparecer aca cuando el comprador las inicie.
          </p>
        ) : (
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Proceso</th>
                  <th>Precio actual</th>
                  <th>Inicio</th>
                  <th>Cierre</th>
                  <th>Estado</th>
                  <th>Oferta</th>
                </tr>
              </thead>
              <tbody>
                {subastas.map((subasta) => {
                  const estadoSubasta = ESTADO_SUBASTA[subasta.estado] ?? {
                    texto: subasta.estado,
                    clase: 'badge--off',
                  }
                  const abierta = subasta.estado === 'Open' && new Date(subasta.inicioISO).getTime() <= ahoraMs
                  return (
                    <tr key={subasta.id}>
                      <td>
                        <code>{subasta.codigo}</code> {subasta.titulo}
                      </td>
                      <td>{formatearPesos(subasta.precioActual)}</td>
                      <td>{formatearFecha(subasta.inicioISO)}</td>
                      <td>{formatearFecha(subasta.finISO)}</td>
                      <td>
                        <span className={`badge ${estadoSubasta.clase}`}>{estadoSubasta.texto}</span>
                      </td>
                      <td>
                        {abierta ? (
                          <div className="tabla__acciones">
                            <button
                              className="btn btn--primario"
                              type="button"
                              onClick={() => navigate(`/proveedor/subastas/${subasta.id}`)}
                            >
                              Entrar
                            </button>
                          </div>
                        ) : (
                          <span className="campo__ayuda">
                            {subasta.estado === 'Scheduled' ? 'Aun no abre' : 'Sin ofertas abiertas'}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

function formatearFecha(fechaIso) {
  if (!fechaIso) return '---'
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(fechaIso))
}

function formatearPesos(monto) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(monto)
}
