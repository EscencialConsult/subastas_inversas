import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { getErrorMessage } from '../../shared/query/queryClient'
import { Alert } from '../../shared/ui/Alert'
import { Badge } from '../../shared/ui/Badge'
import { Button } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'
import { EmptyState } from '../../shared/ui/EmptyState'
import { Input } from '../../shared/ui/Input'
import { PageHeader } from '../../shared/ui/PageHeader'
import { PageShell } from '../../shared/ui/PageShell'
import { Pagination, usePagination } from '../../shared/ui/Pagination'
import { Spinner } from '../../shared/ui/Spinner'
import { Table } from '../../shared/ui/Table'
import { oportunidadesProveedorQuery, proveedoresKeys, responderInvitacionMutation } from './data/proveedoresData'

const ESTADO_INVITACION = {
  pendiente: { texto: 'Pendiente', variant: 'warning' as const },
  aceptada: { texto: 'Aceptada', variant: 'success' as const },
  rechazada: { texto: 'Rechazada', variant: 'error' as const },
}

const ESTADO_SUBASTA = {
  Scheduled: { texto: 'Programada', variant: 'info' as const },
  Open: { texto: 'Abierta', variant: 'success' as const },
  Closed: { texto: 'Cerrada', variant: 'neutral' as const },
  Cancelled: { texto: 'Cancelada', variant: 'error' as const },
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
  const invitacionesRows = invitaciones.map((invitacion) => ({ ...invitacion })) as Array<Record<string, unknown>>
  const subastasRows = subastas.map((subasta) => ({ ...subasta })) as Array<Record<string, unknown>>
  const { paginatedItems: invitacionesPaginadas, setPage: setInvPage, setPageSize: setInvPageSize, ...invPaginacion } = usePagination(invitacionesRows)
  const { paginatedItems: subastasPaginadas, setPage: setSubPage, setPageSize: setSubPageSize, ...subPaginacion } = usePagination(subastasRows)

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

  if (oportunidadesQuery.isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    )
  }

  const error = getErrorMessage(oportunidadesQuery.error, '')
  if (error) return <Alert variant="error">{error}</Alert>

  return (
    <PageShell as="section" width="wide" className="px-0 py-0">
      <PageHeader
        title="Oportunidades comerciales"
        description="Gestiona invitaciones a procesos y accede a subastas disponibles."
      />

      <Card hover={false} padding="md" className="space-y-4">
        <h2 className="m-0 text-lg font-semibold text-text">Invitaciones a procesos</h2>
        {errorComercial && <Alert variant="error">{errorComercial}</Alert>}

        {invitaciones.length === 0 ? (
          <EmptyState title="Sin invitaciones" description="Todavia no recibiste invitaciones de compradores." />
        ) : (
          <>
            <Table
              data={invitacionesPaginadas}
              sortable={false}
              columns={[
                {
                  header: 'Proceso',
                  accessor: 'tituloProceso',
                  render: (value, invitacion) => (
                    <span>
                      <code>{String(invitacion.codigoProceso || '---')}</code> {String(value ?? '')}
                    </span>
                  ),
                },
                {
                  header: 'Fecha',
                  accessor: 'invitadoEn',
                  render: (value) => formatearFecha(value),
                },
                {
                  header: 'Estado',
                  accessor: 'estado',
                  render: (value, invitacion) => {
                    const estadoInvitacion = ESTADO_INVITACION[String(value)] ?? ESTADO_INVITACION.pendiente
                    return (
                      <div>
                        <Badge variant={estadoInvitacion.variant}>{estadoInvitacion.texto}</Badge>
                        {value === 'rechazada' && invitacion.rejectionReason && (
                          <div className="mt-1 text-xs text-text-muted">
                            Motivo: {String(invitacion.rejectionReason)}
                          </div>
                        )}
                      </div>
                    )
                  },
                },
                {
                  header: '',
                  accessor: 'id',
                  render: (_value, invitacion) => {
                    const invitacionId = String(invitacion.id)
                    if (invitacion.estado !== 'pendiente') return null

                    if (rechazandoId === invitacionId) {
                      return (
                        <div className="grid min-w-[220px] gap-2">
                          <Input
                            placeholder="Motivo del rechazo"
                            value={motivoRechazoText}
                            onChange={(event) => setMotivoRechazoText(event.target.value)}
                            fieldClassName="mb-0"
                          />
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="danger"
                              size="sm"
                              onClick={() => manejarConfirmarRechazo(invitacionId)}
                              disabled={respondiendoId === invitacionId}
                            >
                              Confirmar
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={manejarCancelarRechazo}
                              disabled={respondiendoId === invitacionId}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      )
                    }

                    return (
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => manejarRespuestaInvitacion(invitacionId, true)}
                          disabled={respondiendoId === invitacionId}
                        >
                          Aceptar
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => iniciarRechazo(invitacionId)}
                          disabled={respondiendoId === invitacionId}
                        >
                          Rechazar
                        </Button>
                      </div>
                    )
                  },
                  sortKey: false,
                },
              ]}
            />
            {invitacionesPaginadas.length > 0 && <Pagination {...invPaginacion} onPageChange={setInvPage} onPageSizeChange={setInvPageSize} />}
          </>
        )}
      </Card>

      <Card hover={false} padding="md" className="space-y-4">
        <h2 className="m-0 text-lg font-semibold text-text">Subastas disponibles</h2>
        {subastas.length === 0 ? (
          <EmptyState title="Sin subastas" description="Las subastas van a aparecer aca cuando el comprador las inicie." />
        ) : (
          <>
            <Table
              data={subastasPaginadas}
              sortable={false}
              columns={[
                {
                  header: 'Proceso',
                  accessor: 'titulo',
                  render: (value, subasta) => (
                    <span>
                      <code>{String(subasta.codigo)}</code> {String(value ?? '')}
                    </span>
                  ),
                },
                {
                  header: 'Precio actual',
                  accessor: 'precioActual',
                  render: (value) => formatearPesos(Number(value) || 0),
                },
                {
                  header: 'Inicio',
                  accessor: 'inicioISO',
                  render: (value) => formatearFecha(value),
                },
                {
                  header: 'Cierre',
                  accessor: 'finISO',
                  render: (value) => formatearFecha(value),
                },
                {
                  header: 'Estado',
                  accessor: 'estado',
                  render: (value) => {
                    const estadoSubasta = ESTADO_SUBASTA[String(value)] ?? {
                      texto: String(value ?? '---'),
                      variant: 'neutral' as const,
                    }
                    return <Badge variant={estadoSubasta.variant}>{estadoSubasta.texto}</Badge>
                  },
                },
                {
                  header: 'Oferta',
                  accessor: 'id',
                  render: (_value, subasta) => {
                    const abierta = subasta.estado === 'Open' && new Date(String(subasta.inicioISO)).getTime() <= ahoraMs
                    return abierta ? (
                      <Button type="button" size="sm" onClick={() => navigate(`/proveedor/subastas/${subasta.id}`)}>
                        Entrar
                      </Button>
                    ) : (
                      <span className="text-xs text-text-muted">
                        {subasta.estado === 'Scheduled' ? 'Aun no abre' : 'Sin ofertas abiertas'}
                      </span>
                    )
                  },
                  sortKey: false,
                },
              ]}
            />
            {subastasPaginadas.length > 0 && <Pagination {...subPaginacion} onPageChange={setSubPage} onPageSizeChange={setSubPageSize} />}
          </>
        )}
      </Card>
    </PageShell>
  )
}

function formatearFecha(fechaIso) {
  if (!fechaIso) return '---'
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(String(fechaIso)))
}

function formatearPesos(monto) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(monto)
}
