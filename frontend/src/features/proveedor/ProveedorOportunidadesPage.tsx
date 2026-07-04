import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { getErrorMessage } from '../../shared/query/queryClient'
import { Alert } from '../../shared/ui/Alert'
import { Spinner } from '../../shared/ui/Spinner'
import { oportunidadesProveedorQuery, proveedoresKeys, responderInvitacionMutation } from './data/proveedoresData'

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
  const queryClient = useQueryClient()
  const [respondiendoId, setRespondiendoId] = useState(null)
  const [rechazandoId, setRechazandoId] = useState(null)
  const [motivoRechazoText, setMotivoRechazoText] = useState('')
  const [errorComercial, setErrorComercial] = useState('')
  const [ahoraMs, setAhoraMs] = useState(() => Date.now())

  useEffect(() => {
    const intervalo = setInterval(() => setAhoraMs(Date.now()), 1000)
    return () => clearInterval(intervalo)
  }, [])

  const oportunidadesQuery = useQuery({
    queryKey: proveedoresKeys.opportunities(usuario.id),
    queryFn: () => oportunidadesProveedorQuery({ usuarioId: usuario.id }),
    enabled: Boolean(usuario.id),
  })

  const responderMutation = useMutation({
    mutationFn: responderInvitacionMutation,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: proveedoresKeys.opportunities(usuario.id) })
    },
  })

  const proveedor = oportunidadesQuery.data?.proveedor
  const invitaciones = oportunidadesQuery.data?.invitaciones ?? []
  const subastas = oportunidadesQuery.data?.subastas ?? []

  const manejarRespuestaInvitacion = async (invitacionId, aceptar, motivo = null) => {
    setRespondiendoId(invitacionId)
    setErrorComercial('')
    try {
      await responderMutation.mutateAsync({
        invitacionId,
        proveedorId: proveedor.id,
        aceptar,
        rejectionReason: motivo,
      })
    } catch (err) {
      setErrorComercial(getErrorMessage(err))
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

  if (oportunidadesQuery.isLoading) return <div className="flex justify-center py-12"><Spinner /></div>
  const error = getErrorMessage(oportunidadesQuery.error, '')
  if (error) return <Alert variant="error">{error}</Alert>

  return (
    <section className="space-y-6">
      <div className="encabezado">
        <h1>Oportunidades Comerciales</h1>
      </div>

      <div className="rounded-md border border-border bg-surface p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-text">Invitaciones a procesos</h2>
        {errorComercial && <Alert variant="error">{errorComercial}</Alert>}

        {invitaciones.length === 0 ? (
          <p className="text-sm text-text-muted">Todavia no recibiste invitaciones de compradores.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border bg-surface shadow-sm">
            <table className="min-w-full divide-y divide-border text-sm">
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
                      <td className="flex flex-wrap justify-end gap-2">
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
                                    className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60"
                                    type="button"
                                    onClick={() => manejarConfirmarRechazo(invitacion.id)}
                                    disabled={respondiendoId === invitacion.id}
                                    style={{ color: 'var(--color-error)' }}
                                  >
                                    Confirmar
                                  </button>
                                  <button
                                    className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60"
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
                                  className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60"
                                  type="button"
                                  onClick={() => manejarRespuestaInvitacion(invitacion.id, true)}
                                  disabled={respondiendoId === invitacion.id}
                                >
                                  Aceptar
                                </button>
                                <button
                                  className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60"
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

      <div className="rounded-md border border-border bg-surface p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-text">Subastas disponibles</h2>
        {subastas.length === 0 ? (
          <p className="text-sm text-text-muted">
            Las subastas van a aparecer aca cuando el comprador las inicie.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border bg-surface shadow-sm">
            <table className="min-w-full divide-y divide-border text-sm">
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
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
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
