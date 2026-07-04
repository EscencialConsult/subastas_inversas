import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import {
  suscribirSubastaPublica,
  type PublicAuctionMapped,
  type PublicAwardMapped,
  type PublicProcessMapped,
} from '../../../shared/api/publicoApi'
import { etiquetaEstado } from '../../../domain/compras'
import { getErrorMessage } from '../../../shared/query/queryClient'
import { Alert } from '../../../shared/ui/Alert'
import { Button } from '../../../shared/ui/Button'
import { DataTable, type DataTableColumn } from '../../../shared/ui/DataTable'
import { FormSection } from '../../../shared/ui/FormSection'
import { LoadingState } from '../../../shared/ui/StateViews'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { PageShell } from '../../../shared/ui/PageShell'
import { StatusBadge } from '../../../shared/ui/StatusBadge'
import { obtenerProcesoPublicoQuery, publicoKeys } from '../data/publicoData'

interface PublicProcessDetail extends PublicProcessMapped {
  cerradoEn?: string | null
  especificacionesHash: string
  items: PublicProcessItem[]
  subasta: PublicAuctionMapped | null
  adjudicaciones: PublicAwardMapped[]
}

interface PublicProcessItem extends Record<string, unknown> {
  id?: string
  descripcion?: string
  cantidad?: number
  unidad?: string
  precioUnitarioEstimado?: number
  totalEstimado?: number
}

export function ProcesoPublicoPage() {
  const { procesoId } = useParams()
  const navigate = useNavigate()
  const [subasta, setSubasta] = useState<PublicAuctionMapped | null>(null)
  const [liveError, setLiveError] = useState('')
  const [actualizadoEn, setActualizadoEn] = useState<string | null>(null)

  const procesoQuery = useQuery({
    queryKey: publicoKeys.proceso(procesoId),
    queryFn: () => obtenerProcesoPublicoQuery({ procesoId }) as Promise<PublicProcessDetail>,
    enabled: Boolean(procesoId),
  })

  useEffect(() => {
    if (!procesoQuery.data) return
    setSubasta(procesoQuery.data.subasta)
    setActualizadoEn(new Date().toISOString())
  }, [procesoQuery.data])

  useEffect(() => {
    if (!subasta?.eventsUrl) return undefined

    return suscribirSubastaPublica({
      eventsUrl: subasta.eventsUrl,
      onSnapshot: (snapshot) => {
        setSubasta((actual) => ({ ...actual, ...snapshot }) as PublicAuctionMapped)
        setActualizadoEn(new Date().toISOString())
        setLiveError('')
      },
      onError: () => setLiveError('No se pudo mantener la conexion en vivo. La ficha conserva la ultima informacion recibida.'),
    })
  }, [subasta?.eventsUrl])

  const ahorro = useMemo(() => {
    if (!subasta) return 0
    return Math.max(0, Number(subasta.precioBase ?? 0) - Number(subasta.precioActual ?? 0))
  }, [subasta])

  if (procesoQuery.isLoading) return <LoadingState label="Cargando ficha publica..." />

  const proceso = procesoQuery.data ?? null
  const error = liveError || getErrorMessage(procesoQuery.error, '')

  if (error && !proceso) {
    return (
      <PageShell>
        <Alert variant="error">{error}</Alert>
      </PageShell>
    )
  }

  if (!proceso) {
    return (
      <PageShell>
        <Alert variant="error">Proceso publico no encontrado.</Alert>
      </PageShell>
    )
  }

  return (
    <PageShell width="wide">
      <PageHeader
        eyebrow="Ficha publica del proceso"
        title={<><code>{proceso.codigo}</code> {proceso.titulo}</>}
        description={proceso.descripcion || 'Sin descripcion publica cargada.'}
        actions={<Button variant="ghost" onClick={() => navigate('/portal')}>Volver al portal</Button>}
        meta={<StatusBadge status={proceso.estado} label={etiquetaEstado(proceso.estado)} />}
      />

      {error && <Alert variant="error">{error}</Alert>}

      <section className="grid gap-3 md:grid-cols-3">
        <MetricCard label="Organismo" value={proceso.empresa} />
        <MetricCard label="Presupuesto estimado" value={formatearPesos(proceso.presupuestoEstimado)} featured />
        <MetricCard label="Publicado" value={formatearFecha(proceso.publicadoEn ?? proceso.creadoEn)} />
      </section>

      <FormSection title="Datos del expediente" description="Informacion visible para seguimiento ciudadano.">
        <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-5">
          <Info label="Codigo" value={proceso.codigo} />
          <Info label="Estado" value={etiquetaEstado(proceso.estado)} />
          <Info label="Creado" value={formatearFecha(proceso.creadoEn)} />
          <Info label="Cierre" value={formatearFecha(proceso.cerradoEn)} />
          <Info label="Hash de pliego" value={proceso.especificacionesHash || 'No informado'} mono />
        </dl>
      </FormSection>

      <ItemsSection items={proceso.items} />

      <FormSection
        title="Subasta en vivo"
        description="Actualizacion por SSE con precio actual, lances y ranking publico."
        actions={subasta ? <Button variant="secondary" onClick={() => navigate(`/portal/subasta/${proceso.id}`)}>Ver pantalla de subasta</Button> : null}
      >
        {subasta ? (
          <div className="space-y-4">
            <section className="grid gap-3 md:grid-cols-4">
              <MetricCard label="Precio actual" value={formatearPesos(subasta.precioActual)} featured />
              <MetricCard label="Ahorro estimado" value={formatearPesos(ahorro)} />
              <MetricCard label="Lances" value={String(subasta.cantidadLances)} />
              <MetricCard label="Ultima actualizacion" value={formatearFechaHora(actualizadoEn)} />
            </section>
            <Ranking ranking={subasta.ranking ?? []} />
          </div>
        ) : (
          <EmptyText text="Este proceso no tiene subasta publicada." />
        )}
      </FormSection>

      <Resultados adjudicaciones={proceso.adjudicaciones} />
    </PageShell>
  )
}

function ItemsSection({ items }: { items: PublicProcessItem[] }) {
  const columns: Array<DataTableColumn<PublicProcessItem>> = [
    { header: 'Descripcion', accessor: 'descripcion' },
    { header: 'Cantidad', cell: (row) => `${row.cantidad ?? '-'} ${row.unidad ?? ''}` },
    { header: 'Precio unitario', cell: (row) => row.precioUnitarioEstimado ? formatearPesos(row.precioUnitarioEstimado) : 'Sin dato' },
    { header: 'Total estimado', cell: (row) => row.totalEstimado ? formatearPesos(row.totalEstimado) : 'Sin dato' },
  ]

  return (
    <FormSection title="Renglones publicados" description="Bienes o servicios incluidos en el proceso.">
      <DataTable columns={columns} rows={items} getRowId={(row, index) => row.id ?? String(index)} emptyTitle="Sin renglones" emptyDescription="No hay renglones publicados." />
    </FormSection>
  )
}

function Ranking({ ranking }: { ranking: NonNullable<PublicAuctionMapped['ranking']> }) {
  if (ranking.length === 0) return <EmptyText text="Todavia no hay lances publicados." />

  return (
    <div className="space-y-3">
      {ranking.map((item) => (
        <PublicRow
          key={`${item.posicion}-${item.nombre}`}
          code={`#${item.posicion}`}
          title={item.nombre}
          description={`${item.cantidadLances} lances`}
          value={formatearPesos(item.monto)}
          detail={formatearFechaHora(item.ultimoLanceEn)}
        />
      ))}
    </div>
  )
}

function Resultados({ adjudicaciones }: { adjudicaciones: PublicAwardMapped[] }) {
  return (
    <FormSection title="Resultados" description="Adjudicaciones publicadas para este proceso.">
      {adjudicaciones.length === 0 ? (
        <EmptyText text="Todavia no hay resultados adjudicados publicados." />
      ) : (
        <div className="space-y-3">
          {adjudicaciones.map((adjudicacion) => (
            <PublicRow
              key={adjudicacion.id}
              code={formatearFecha(adjudicacion.adjudicadoEn)}
              title={adjudicacion.proveedor}
              description={adjudicacion.observaciones || 'Sin observaciones publicadas.'}
              value={formatearPesos(adjudicacion.monto)}
              detail="Monto adjudicado"
            />
          ))}
        </div>
      )}
    </FormSection>
  )
}

function MetricCard({ label, value, featured = false }: { label: string; value: string; featured?: boolean }) {
  return (
    <article className="rounded-md border border-border bg-surface px-5 py-4 shadow-sm">
      <span className="text-sm font-medium text-text-muted">{label}</span>
      <strong className={['mt-2 block text-xl font-semibold', featured ? 'text-primary' : 'text-text'].join(' ')}>{value}</strong>
    </article>
  )
}

function Info({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="font-medium text-text-muted">{label}</dt>
      <dd className={['mt-1 font-semibold text-text', mono ? 'font-mono break-all' : ''].join(' ')}>{value}</dd>
    </div>
  )
}

function PublicRow({ code, title, description, value, detail }: { code: string; title: string; description: string; value: string; detail: string }) {
  return (
    <article className="grid gap-3 rounded-md border border-border bg-background p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div>
        <code className="text-xs font-semibold text-primary">{code}</code>
        <h3 className="mt-1 text-base font-semibold text-text">{title}</h3>
        <p className="mt-1 text-sm text-text-muted">{description}</p>
      </div>
      <div className="md:text-right">
        <span className="block text-base font-semibold text-text">{value}</span>
        <small className="text-text-muted">{detail}</small>
      </div>
    </article>
  )
}

function EmptyText({ text }: { text: string }) {
  return <p className="rounded-md border border-dashed border-border bg-background px-5 py-8 text-center text-sm text-text-muted">{text}</p>
}

function formatearPesos(monto?: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(monto ?? 0))
}

function formatearFecha(fecha?: string | null) {
  if (!fecha) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(fecha))
}

function formatearFechaHora(fecha?: string | null) {
  if (!fecha) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(fecha))
}
