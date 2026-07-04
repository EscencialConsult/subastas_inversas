import { ReactNode, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  type PublicAuctionMapped,
  type PublicAwardMapped,
  type PublicProcessMapped,
} from '../../../shared/api/publicoApi'
import { ESTADO_INFO, etiquetaEstado } from '../../../domain/compras'
import { getErrorMessage } from '../../../shared/query/queryClient'
import { Alert } from '../../../shared/ui/Alert'
import { Button } from '../../../shared/ui/Button'
import { LoadingState } from '../../../shared/ui/StateViews'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { PageShell } from '../../../shared/ui/PageShell'
import { StatusBadge } from '../../../shared/ui/StatusBadge'
import { portalPublicoQuery, publicoKeys } from '../data/publicoData'

type TabId = 'procesos' | 'subastas' | 'adjudicaciones'

const ESTADO_BADGE: Record<string, 'neutral' | 'info' | 'warning' | 'success' | 'error'> = {
  borrador: 'neutral',
  publicado: 'info',
  en_subasta: 'warning',
  cerrada: 'info',
  adjudicada: 'warning',
  aprobada: 'success',
  desierta: 'neutral',
  cancelada: 'error',
}

export function PortalPublicoPage() {
  const navigate = useNavigate()
  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState('')
  const [tabActiva, setTabActiva] = useState<TabId>('procesos')

  const portalQuery = useQuery({
    queryKey: publicoKeys.portal({ busqueda, estado }),
    queryFn: () => portalPublicoQuery({ busqueda, estado }),
    placeholderData: (previousData) => previousData,
  })

  const procesos: PublicProcessMapped[] = portalQuery.data?.procesos ?? []
  const subastas: PublicAuctionMapped[] = portalQuery.data?.subastas ?? []
  const adjudicaciones: PublicAwardMapped[] = portalQuery.data?.adjudicaciones ?? []
  const cargando = portalQuery.isLoading || portalQuery.isFetching
  const error = getErrorMessage(portalQuery.error, '')

  const metricas = useMemo(
    () => [
      { label: 'Procesos publicados', value: procesos.length, help: 'Disponibles para consulta' },
      { label: 'Subastas publicadas', value: subastas.length, help: 'Activas y finalizadas' },
      { label: 'Adjudicaciones', value: adjudicaciones.length, help: 'Resultados publicados' },
    ],
    [adjudicaciones.length, procesos.length, subastas.length],
  )

  const tabs = useMemo(
    () => [
      { id: 'procesos' as const, label: 'Procesos', total: procesos.length },
      { id: 'subastas' as const, label: 'Subastas', total: subastas.length },
      { id: 'adjudicaciones' as const, label: 'Adjudicaciones', total: adjudicaciones.length },
    ],
    [adjudicaciones.length, procesos.length, subastas.length],
  )

  return (
    <PageShell width="wide">
      <PageHeader
        eyebrow="Compra publica abierta y verificable"
        title="Consultas de compras, subastas y adjudicaciones publicas"
        description="Informacion actualizada del sistema SICST para seguir procesos publicados, subastas en vivo y resultados adjudicados sin iniciar sesion."
        actions={(
          <>
            <Button onClick={() => navigate('/registro-proveedor')}>Registrarme como proveedor</Button>
            <Button variant="secondary" onClick={() => navigate('/login')}>Ingresar al sistema</Button>
          </>
        )}
      />

      {error && <Alert variant="error">{error}</Alert>}

      <section className="grid gap-3 md:grid-cols-3">
        {metricas.map((metrica) => (
          <article className="rounded-md border border-border bg-surface px-5 py-4 shadow-sm" key={metrica.label}>
            <span className="text-sm font-medium text-text-muted">{metrica.label}</span>
            <strong className="mt-2 block text-3xl font-semibold text-text">{metrica.value}</strong>
            <p className="mt-1 text-sm text-text-muted">{metrica.help}</p>
          </article>
        ))}
      </section>

      <div className="rounded-md border border-border bg-surface shadow-sm">
        <div className="flex flex-wrap gap-2 border-b border-border px-4 py-3" role="tablist" aria-label="Secciones del portal publico">
          {tabs.map((tab) => {
            const activa = tabActiva === tab.id
            return (
              <button
                key={tab.id}
                className={[
                  'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  activa ? 'bg-primary text-white' : 'text-text-muted hover:bg-background hover:text-text',
                ].join(' ')}
                role="tab"
                type="button"
                aria-selected={activa}
                onClick={() => setTabActiva(tab.id)}
              >
                <span>{tab.label}</span>
                <span className={activa ? 'text-white/80' : 'text-text-muted'}>{tab.total}</span>
              </button>
            )
          })}
        </div>

        <div className="p-5">
          {tabActiva === 'procesos' && (
            <PanelTab
              title="Procesos disponibles para consultar"
              description="Compras publicadas con estado, presupuesto estimado y organismo responsable."
              actions={(
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
                  <input
                    className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none focus:border-primary focus:shadow-focus"
                    placeholder="Buscar codigo, titulo o empresa"
                    value={busqueda}
                    onChange={(event) => setBusqueda(event.target.value)}
                  />
                  <select
                    className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none focus:border-primary focus:shadow-focus"
                    value={estado}
                    onChange={(event) => setEstado(event.target.value)}
                  >
                    <option value="">Todos los estados</option>
                    {Object.entries(ESTADO_INFO).map(([clave, info]) => (
                      <option key={clave} value={clave}>
                        {info.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            >
              {cargando ? (
                <LoadingState label="Cargando procesos..." />
              ) : procesos.length === 0 ? (
                <EmptyMessage title="Todavia no hay procesos publicados" text="Cuando existan procesos abiertos, en subasta o adjudicados van a aparecer en esta seccion." />
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {procesos.map((proceso) => (
                    <article className="rounded-md border border-border bg-background p-4" key={proceso.id}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <code className="text-xs font-semibold text-primary">{proceso.codigo}</code>
                        <StatusBadge status={proceso.estado} label={etiquetaEstado(proceso.estado)} variant={ESTADO_BADGE[proceso.estado] ?? 'neutral'} />
                      </div>
                      <h3 className="mt-3 text-base font-semibold text-text">{proceso.titulo}</h3>
                      <p className="mt-2 line-clamp-3 text-sm text-text-muted">{proceso.descripcion || 'Sin descripcion publica cargada.'}</p>
                      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                        <Dato label="Organismo" value={proceso.empresa} />
                        <Dato label="Presupuesto" value={formatearPesos(proceso.presupuestoEstimado)} />
                        <Dato label="Publicado" value={formatearFecha(proceso.publicadoEn ?? proceso.creadoEn)} />
                      </dl>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button variant="secondary" onClick={() => navigate(`/portal/procesos/${proceso.id}`)}>Ver ficha</Button>
                        {proceso.tieneSubasta && <Button onClick={() => navigate(`/portal/subasta/${proceso.id}`)}>Ver subasta</Button>}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </PanelTab>
          )}

          {tabActiva === 'subastas' && (
            <PanelTab title="Subastas publicadas" description="Seguimiento anonimo de precios, lances y cierres de subastas activas o finalizadas.">
              {cargando ? <LoadingState label="Buscando subastas..." /> : subastas.length === 0 ? (
                <EmptyMessage title="No hay subastas publicadas" text="Cuando existan procesos con subasta, van a aparecer aca para seguimiento de precio y lances." />
              ) : (
                <div className="space-y-3">
                  {subastas.map((subasta) => (
                    <PublicRow
                      key={subasta.id}
                      code={subasta.codigo}
                      title={subasta.titulo}
                      description={subasta.empresa}
                      value={formatearPesos(subasta.precioActual)}
                      detail={`${subasta.finalizada ? 'Finalizada' : 'Activa'} - ${subasta.cantidadLances} lances`}
                      action="Ver detalle"
                      onClick={() => navigate(`/portal/procesos/${subasta.procesoId}`)}
                    />
                  ))}
                </div>
              )}
            </PanelTab>
          )}

          {tabActiva === 'adjudicaciones' && (
            <PanelTab title="Resultados adjudicados" description="Adjudicaciones publicadas para consulta de proveedores, montos y fechas.">
              {cargando ? <LoadingState label="Cargando adjudicaciones..." /> : adjudicaciones.length === 0 ? (
                <EmptyMessage title="Todavia no hay adjudicaciones publicadas" text="Cuando se registren adjudicaciones, el resultado del proceso va a quedar visible aca." />
              ) : (
                <div className="space-y-3">
                  {adjudicaciones.map((adjudicacion) => (
                    <PublicRow
                      key={adjudicacion.id}
                      code={adjudicacion.codigo}
                      title={adjudicacion.titulo}
                      description={`${adjudicacion.empresa} - ${adjudicacion.proveedor}`}
                      value={formatearPesos(adjudicacion.monto)}
                      detail={formatearFecha(adjudicacion.adjudicadoEn)}
                    />
                  ))}
                </div>
              )}
            </PanelTab>
          )}
        </div>
      </div>
    </PageShell>
  )
}

function PanelTab({
  title,
  description,
  actions,
  children,
}: {
  title: string
  description: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text">{title}</h2>
          <p className="mt-1 text-sm text-text-muted">{description}</p>
        </div>
        {actions}
      </div>
      {children}
    </section>
  )
}

function Dato({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-text-muted">{label}</dt>
      <dd className="mt-1 font-semibold text-text">{value}</dd>
    </div>
  )
}

function PublicRow({
  code,
  title,
  description,
  value,
  detail,
  action,
  onClick,
}: {
  code: string
  title: string
  description: string
  value: string
  detail: string
  action?: string
  onClick?: () => void
}) {
  return (
    <article className="grid gap-3 rounded-md border border-border bg-background p-4 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
      <div>
        <code className="text-xs font-semibold text-primary">{code}</code>
        <h3 className="mt-1 text-base font-semibold text-text">{title}</h3>
        <p className="mt-1 text-sm text-text-muted">{description}</p>
      </div>
      <div className="md:text-right">
        <span className="block text-base font-semibold text-text">{value}</span>
        <small className="text-text-muted">{detail}</small>
      </div>
      {action && <Button variant="link" onClick={onClick}>{action}</Button>}
    </article>
  )
}

function EmptyMessage({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-background px-6 py-10 text-center">
      <h3 className="text-base font-semibold text-text">{title}</h3>
      <p className="mt-2 text-sm text-text-muted">{text}</p>
    </div>
  )
}

function formatearPesos(monto: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(Number(monto ?? 0))
}

function formatearFecha(fecha?: string) {
  if (!fecha) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(fecha))
}
