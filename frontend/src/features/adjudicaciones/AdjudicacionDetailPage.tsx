import { ReactNode, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { analisisSubasta } from '../../shared/api/subastasApi'
import { ESTADO_PROCESO } from '../../domain/compras'
import { getErrorMessage } from '../../shared/query/queryClient'
import { Alert } from '../../shared/ui/Alert'
import { Badge } from '../../shared/ui/Badge'
import { Button } from '../../shared/ui/Button'
import { DataTable, type DataTableColumn } from '../../shared/ui/DataTable'
import { FormActions } from '../../shared/ui/FormActions'
import { FormSection } from '../../shared/ui/FormSection'
import { LoadingState } from '../../shared/ui/StateViews'
import { PageHeader } from '../../shared/ui/PageHeader'
import { PageShell } from '../../shared/ui/PageShell'
import { Textarea } from '../../shared/ui/Textarea'
import {
  adjudicacionDetalleQuery,
  adjudicacionesKeys,
  aprobarAdjudicacionMutation,
  devolverAdjudicacionMutation,
  rechazarAdjudicacionMutation,
} from './data/adjudicacionesData'

interface Adjudicacion {
  proveedor: string
  monto: number
  fecha: string
  documentHash?: string
  immutableHash?: string
}

interface Oferta {
  id: string
  proveedor: string
  monto: number
}

interface ProcesoAdjudicacion {
  id: string
  codigo: string
  titulo: string
  estado: string
  adjudicacion?: Adjudicacion | null
  tieneSubasta?: boolean
}

export function AdjudicacionDetailPage() {
  const { id } = useParams()
  const { tenantId, usuario } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [accionMotivo, setAccionMotivo] = useState<string | null>(null)
  const [motivo, setMotivo] = useState('')

  const detalleQuery = useQuery({
    queryKey: adjudicacionesKeys.detail(tenantId, id),
    queryFn: () => adjudicacionDetalleQuery({ tenantId, id }),
    enabled: Boolean(tenantId && id),
  })

  const invalidateAdjudicaciones = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adjudicacionesKeys.lists() }),
      queryClient.invalidateQueries({ queryKey: adjudicacionesKeys.detail(tenantId, id) }),
    ])
  }

  const aprobarMutation = useMutation({ mutationFn: aprobarAdjudicacionMutation, onSuccess: invalidateAdjudicaciones })
  const rechazarMutation = useMutation({ mutationFn: rechazarAdjudicacionMutation, onSuccess: invalidateAdjudicaciones })
  const devolverMutation = useMutation({ mutationFn: devolverAdjudicacionMutation, onSuccess: invalidateAdjudicaciones })

  async function aprobar() {
    try {
      await aprobarMutation.mutateAsync({ tenantId, id, autoridadId: usuario.id })
      navigate('/adjudicaciones')
    } catch {
      // El error se muestra desde la mutation.
    }
  }

  async function confirmarRechazo() {
    try {
      if (accionMotivo === 'devolver') {
        await devolverMutation.mutateAsync({ tenantId, id, autoridadId: usuario.id, motivo })
      } else {
        await rechazarMutation.mutateAsync({ tenantId, id, autoridadId: usuario.id, motivo })
      }
      navigate('/adjudicaciones')
    } catch {
      // El error se muestra desde la mutation.
    }
  }

  if (detalleQuery.isLoading) return <LoadingState label="Cargando adjudicación..." />

  const error = getErrorMessage(detalleQuery.error ?? aprobarMutation.error ?? rechazarMutation.error ?? devolverMutation.error, '')
  const proceso = detalleQuery.data?.proceso as ProcesoAdjudicacion | undefined
  const subasta = detalleQuery.data?.subasta
  const ofertas = (detalleQuery.data?.ofertas ?? []) as Oferta[]
  const procesando = aprobarMutation.isPending || rechazarMutation.isPending || devolverMutation.isPending
  if (!proceso) return <Alert variant="error">{error}</Alert>

  const pendiente = proceso.estado === ESTADO_PROCESO.ADJUDICADA
  const estaDevolviendo = accionMotivo === 'devolver'
  const adj = proceso.adjudicacion
  const adjudicado = adj?.proveedor

  const analisis = subasta ? analisisSubasta(subasta) : null
  const masBaja = ofertas[0] ?? null
  const adjudicaNoEsLaMasBaja = adj && masBaja && !esOfertaAdjudicada(masBaja, adj)

  const ofertaColumns: Array<DataTableColumn<Oferta & Record<string, unknown>>> = [
    { header: 'Proveedor', accessor: 'proveedor' },
    {
      header: 'Monto',
      sortValue: (row) => row.monto,
      cell: (row) => formatearPesos(row.monto),
    },
    {
      header: '',
      align: 'right',
      cell: (row) => (
        <div className="flex flex-wrap justify-end gap-2">
          {ofertas[0]?.id === row.id && <Badge variant="neutral">Más baja</Badge>}
          {esOfertaAdjudicada(row, adj) && <Badge variant="success">Adjudicado</Badge>}
        </div>
      ),
    },
  ]

  return (
    <PageShell width="wide">
      <PageHeader
        title={<>Adjudicación · <code>{proceso.codigo}</code></>}
        description={proceso.titulo}
        actions={
          <Button variant="ghost" onClick={() => navigate('/adjudicaciones')}>
            Volver
          </Button>
        }
      />

      {error && <Alert variant="error">{error}</Alert>}

      <FormSection title="Adjudicación propuesta">
        <dl className="grid gap-3 sm:grid-cols-2">
          <InfoTerm label="Proveedor" value={adjudicado ?? '—'} />
          {adj && <InfoTerm label="Monto" value={formatearPesos(adj.monto)} />}
          {adj && <InfoTerm label="Propuesta el" value={adj.fecha} />}
          {adj?.documentHash && (
            <InfoTerm label="Hash acta" value={<code>{adj.documentHash.slice(0, 16)}</code>} />
          )}
          {adj?.immutableHash && (
            <InfoTerm label="Hash registro" value={<code>{adj.immutableHash.slice(0, 16)}</code>} />
          )}
        </dl>
      </FormSection>

      {analisis && (
        <FormSection title="Resultado de la subasta">
          <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <InfoTerm label="Proveedores que ofertaron" value={analisis.oferentes} />
            <InfoTerm label="Presupuesto base" value={formatearPesos(analisis.base)} />
            <InfoTerm label="Oferta más baja" value={formatearPesos(analisis.mejor)} />
            <InfoTerm label="Baja lograda" value={`${analisis.bajaPorcentaje.toFixed(1)}%`} />
          </dl>
        </FormSection>
      )}

      {adjudicaNoEsLaMasBaja && (
        <Alert variant="info">
          Atención: la adjudicación propuesta no es la oferta más baja
          ({masBaja?.proveedor}, {formatearPesos(masBaja?.monto)}). Revisá la
          justificación antes de aprobar.
        </Alert>
      )}

      <FormSection title="Ofertas">
        <DataTable
          columns={ofertaColumns}
          rows={ofertas as (Oferta & Record<string, unknown>)[]}
          getRowId={(row) => row.id}
          emptyTitle="Sin ofertas"
          emptyDescription="No se registraron ofertas en la subasta."
        />
      </FormSection>

      {pendiente && !accionMotivo && (
        <FormActions>
          <Button variant="danger" onClick={() => setAccionMotivo('rechazar')} disabled={procesando}>
            Rechazar
          </Button>
          <Button variant="secondary" onClick={() => setAccionMotivo('devolver')} disabled={procesando}>
            Devolver
          </Button>
          <Button onClick={aprobar} disabled={procesando}>
            {procesando ? 'Procesando…' : 'Aprobar adjudicación'}
          </Button>
        </FormActions>
      )}

      {pendiente && accionMotivo && (
        <FormSection title={estaDevolviendo ? 'Devolver adjudicación' : 'Rechazar adjudicación'}>
          <Textarea
            label={estaDevolviendo ? 'Motivo de la devolución' : 'Motivo del rechazo'}
            placeholder={
              estaDevolviendo
                ? 'Indicá qué debe corregir el equipo evaluador…'
                : 'Explicá por qué se rechaza la adjudicación…'
            }
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
          />
          <FormActions>
            <Button
              variant="ghost"
              onClick={() => {
                setAccionMotivo(null)
                setMotivo('')
              }}
              disabled={procesando}
            >
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmarRechazo} disabled={procesando}>
              {procesando
                ? 'Procesando…'
                : estaDevolviendo
                  ? 'Confirmar devolución'
                  : 'Confirmar rechazo'}
            </Button>
          </FormActions>
        </FormSection>
      )}

      {!pendiente && (
        <Alert variant="info">Esta adjudicación ya fue resuelta.</Alert>
      )}
    </PageShell>
  )
}

function InfoTerm({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-text-muted">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-text">{value}</dd>
    </div>
  )
}

function esOfertaAdjudicada(oferta: Oferta, adjudicacion?: Adjudicacion | null) {
  if (!oferta || !adjudicacion) return false
  return oferta.proveedor === adjudicacion.proveedor && Number(oferta.monto) === Number(adjudicacion.monto)
}

function formatearPesos(monto: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(monto)
}
