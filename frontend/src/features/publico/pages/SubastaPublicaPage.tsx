import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { suscribirSubastaPublica, type PublicAuctionMapped } from '../../../shared/api/publicoApi'
import { getErrorMessage } from '../../../shared/query/queryClient'
import { Alert } from '../../../shared/ui/Alert'
import { Button } from '../../../shared/ui/Button'
import { FormSection } from '../../../shared/ui/FormSection'
import { LoadingState } from '../../../shared/ui/StateViews'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { PageShell } from '../../../shared/ui/PageShell'
import { StatusBadge } from '../../../shared/ui/StatusBadge'
import { obtenerSubastaPublicaQuery, publicoKeys } from '../data/publicoData'

const REFRESCO_MS = 12_000

export function SubastaPublicaPage() {
  const { procesoId } = useParams()
  const navigate = useNavigate()
  const [snapshot, setSnapshot] = useState<PublicAuctionMapped | null>(null)
  const [liveError, setLiveError] = useState('')
  const [restante, setRestante] = useState<number | null>(null)
  const [ahoraMs, setAhoraMs] = useState(() => Date.now())

  const subastaQuery = useQuery({
    queryKey: publicoKeys.subasta(procesoId),
    queryFn: () => obtenerSubastaPublicaQuery({ procesoId }),
    enabled: Boolean(procesoId),
    refetchInterval: REFRESCO_MS,
  })

  useEffect(() => {
    if (!subastaQuery.data) return
    setSnapshot(subastaQuery.data)
  }, [subastaQuery.data])

  const subasta = snapshot

  useEffect(() => {
    if (!subasta?.eventsUrl) return undefined
    return suscribirSubastaPublica({
      eventsUrl: subasta.eventsUrl,
      onSnapshot: (snapshot) => {
        setSnapshot((actual) => ({ ...actual, ...snapshot, disponible: true }) as PublicAuctionMapped)
        setLiveError('')
      },
      onError: () => setLiveError('No se pudo mantener la conexion en vivo. Seguimos actualizando la vista periodicamente.'),
    })
  }, [subasta?.eventsUrl])

  useEffect(() => {
    if (!subasta?.cierreEn || !subasta.inicioEn) return undefined
    const inicio = new Date(subasta.inicioEn).getTime()
    const cierre = new Date(subasta.cierreEn).getTime()
    const tick = () => {
      const ahora = Date.now()
      setAhoraMs(ahora)
      setRestante(ahora < inicio ? inicio - ahora : cierre - ahora)
    }
    tick()
    const intervalo = setInterval(tick, 1000)
    return () => clearInterval(intervalo)
  }, [subasta])

  const ahorro = useMemo(() => {
    if (!subasta) return 0
    return Math.max(0, Number(subasta.precioBase ?? 0) - Number(subasta.precioActual ?? 0))
  }, [subasta])

  if (subastaQuery.isLoading) return <LoadingState label="Cargando subasta..." />
  const error = liveError || getErrorMessage(subastaQuery.error, '')
  if (error && !subasta) return <PageShell><Alert variant="error">{error}</Alert></PageShell>

  if (!subasta?.disponible) {
    return (
      <PageShell>
        <PageHeader title="Subasta no disponible" description="No hay una subasta publica activa para este proceso." actions={<Button variant="ghost" onClick={() => navigate('/portal')}>Volver al portal</Button>} />
      </PageShell>
    )
  }

  const inicioMs = new Date(subasta.inicioEn ?? 0).getTime()
  const programada = Boolean(subasta.programada) || ahoraMs < inicioMs
  const cerrada = !programada && restante !== null && restante <= 0
  const estado = cerrada ? { label: 'Finalizada', status: 'closed' } : programada ? { label: 'Programada', status: 'scheduled' } : { label: 'Activa', status: 'active' }

  return (
    <PageShell width="wide">
      <PageHeader
        eyebrow="Seguimiento publico anonimo"
        title={<><code>{subasta.codigo}</code> {subasta.titulo}</>}
        description={subasta.empresa}
        actions={<Button variant="ghost" onClick={() => navigate('/portal')}>Volver al portal</Button>}
        meta={<StatusBadge status={estado.status} label={estado.label} />}
      />

      {error && <Alert variant="error">{error}</Alert>}
      <Alert variant="info">Se muestran precios, tiempos y cantidad de lances. La identidad de los oferentes no se expone en esta etapa.</Alert>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard label="Precio actual" value={formatearPesos(subasta.precioActual)} featured />
        <MetricCard label="Presupuesto base" value={formatearPesos(subasta.precioBase)} />
        <MetricCard label="Ahorro estimado" value={formatearPesos(ahorro)} />
        <MetricCard label={programada ? 'Inicia en' : 'Tiempo restante'} value={cerrada ? 'Finalizada' : formatearTiempo(restante)} />
        <MetricCard label="Lances registrados" value={String(subasta.cantidadLances)} />
        <MetricCard label="Actualizacion" value={subastaQuery.isFetching ? 'Actualizando...' : 'Automatica'} />
      </section>

      <FormSection title="Resumen de la subasta" description="Informacion publica de referencia para el seguimiento del proceso.">
        <dl className="grid gap-4 text-sm md:grid-cols-3">
          <Info label="Inicio" value={formatearFechaHora(subasta.inicioEn)} />
          <Info label="Mejor precio actual" value={formatearPesos(subasta.precioActual)} />
          <Info label="Cierre previsto" value={formatearFechaHora(subasta.cierreEn)} />
        </dl>
      </FormSection>

      <FormSection
        title="Ranking de lances"
        description={subasta.identidadesReveladas ? 'La subasta finalizo y las identidades ya estan publicadas.' : 'Durante la subasta, los oferentes se muestran con alias anonimos.'}
      >
        {subasta.ranking?.length ? (
          <div className="space-y-3">
            {subasta.ranking.map((item) => (
              <article key={`${item.posicion}-${item.nombre}`} className="grid gap-3 rounded-md border border-border bg-background p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div>
                  <code className="text-xs font-semibold text-primary">#{item.posicion}</code>
                  <h3 className="mt-1 text-base font-semibold text-text">{item.nombre}</h3>
                  <p className="mt-1 text-sm text-text-muted">{item.cantidadLances} lances - ultimo {formatearFechaHora(item.ultimoLanceEn)}</p>
                </div>
                <div className="md:text-right">
                  <span className="block text-base font-semibold text-text">{formatearPesos(item.monto)}</span>
                  <small className="text-text-muted">Mejor oferta</small>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="rounded-md border border-dashed border-border bg-background px-5 py-8 text-center text-sm text-text-muted">Todavia no hay lances registrados.</p>
        )}
      </FormSection>
    </PageShell>
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-medium text-text-muted">{label}</dt>
      <dd className="mt-1 font-semibold text-text">{value}</dd>
    </div>
  )
}

function formatearPesos(monto?: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(monto ?? 0))
}

function formatearTiempo(ms: number | null) {
  const total = Math.max(0, Math.floor((ms ?? 0) / 1000))
  const horas = String(Math.floor(total / 3600)).padStart(2, '0')
  const min = String(Math.floor((total % 3600) / 60)).padStart(2, '0')
  const seg = String(total % 60).padStart(2, '0')
  return `${horas}:${min}:${seg}`
}

function formatearFechaHora(fecha?: string | null) {
  if (!fecha) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(fecha))
}
