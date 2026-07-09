import { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { getErrorMessage } from '../../shared/query/queryClient'
import { Alert } from '../../shared/ui/Alert'
import { Button } from '../../shared/ui/Button'
import { Spinner } from '../../shared/ui/Spinner'
import { PageHeader } from '../../shared/ui/PageHeader'
import { PageShell } from '../../shared/ui/PageShell'
import { dashboardKeys, obtenerPanelQuery } from './data/dashboardData'

interface PanelCard {
  label: string
  valor: unknown
}

interface PanelKpi {
  label: string
  valor: unknown
  ayuda?: string
}

interface GraficoItem {
  label: string
  valor: unknown
  display?: unknown
  detalle?: string
}

interface PanelGrafico {
  titulo: string
  descripcion?: string
  tipo: 'ranking' | 'bar'
  items: GraficoItem[]
}

interface ListaItem {
  texto: string
  valor: unknown
}

interface PanelLista {
  titulo: string
  items: ListaItem[]
}

interface FeedItem {
  id: string
  to: string
  tipo: string
  titulo: string
  detalle?: string
  fecha: string
}

interface AccionItem {
  to: string
  texto: string
}

interface PanelData {
  titulo: string
  nota?: string
  cards?: PanelCard[]
  kpis?: PanelKpi[]
  graficos?: PanelGrafico[]
  listas?: PanelLista[]
  feed?: FeedItem[]
  acciones?: AccionItem[]
}

export function PanelPage() {
  const { usuario: usuarioData, tenant, rol } = useAuth()

  const panelQuery = useQuery({
    queryKey: dashboardKeys.panel(rol, usuarioData?.tenantId),
    queryFn: () => obtenerPanelQuery({ rol, tenantId: usuarioData?.tenantId ?? '' }),
    enabled: Boolean(usuarioData),
  })

  if (!usuarioData) return <PageShell><Alert variant="error">Sesión no disponible.</Alert></PageShell>
  const usuario = usuarioData

  const panel = panelQuery.data as PanelData | undefined
  const error = getErrorMessage(panelQuery.error, '')

  if (panelQuery.isLoading) {
    return (
      <PageShell>
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      </PageShell>
    )
  }

  if (!panel) return <PageShell><Alert variant="error">{error}</Alert></PageShell>

  return (
    <PageShell>
      <PageHeader
        title={`Hola, ${usuario.nombre}`}
        description={
          <>
            {panel.titulo}
            {tenant && <> &middot; {tenant.nombre}</>}
          </>
        }
      />

      {panel.nota && <Alert variant="info">{panel.nota}</Alert>}

      {panel.cards && panel.cards.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {panel.cards.map((c) => (
            <article key={c.label} className="rounded-md border border-border bg-surface p-4 shadow-sm">
              <span className="block text-2xl font-bold text-text">{c.valor as ReactNode}</span>
              <span className="block text-sm text-text-muted">{c.label}</span>
            </article>
          ))}
        </div>
      )}

      {panel.kpis && panel.kpis.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {panel.kpis.map((kpi) => (
            <article key={kpi.label} className="rounded-md border border-border bg-surface p-4 shadow-sm">
              <span className="block text-sm text-text-muted">{kpi.label}</span>
              <strong className="mt-1 block text-xl font-semibold text-text">{kpi.valor as ReactNode}</strong>
              {kpi.ayuda && <span className="mt-0.5 block text-xs text-text-muted">{kpi.ayuda}</span>}
            </article>
          ))}
        </div>
      )}

      {panel.graficos && panel.graficos.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2">
          {panel.graficos.map((grafico) => (
            <section key={grafico.titulo} className="rounded-md border border-border bg-surface p-5 shadow-sm">
              <div className="mb-4">
                <h2 className="text-base font-semibold text-text">{grafico.titulo}</h2>
                {grafico.descripcion && (
                  <p className="mt-0.5 text-sm text-text-muted">{grafico.descripcion}</p>
                )}
              </div>
              {grafico.items.length === 0 ? (
                <p className="text-sm text-text-muted">Sin datos.</p>
              ) : grafico.tipo === 'ranking' ? (
                <RankingChart items={grafico.items} />
              ) : (
                <BarChart items={grafico.items} />
              )}
            </section>
          ))}
        </div>
      )}

      {panel.listas && panel.listas.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2">
          {panel.listas.map((lista) => (
            <section key={lista.titulo} className="rounded-md border border-border bg-surface p-5 shadow-sm">
              <h2 className="mb-3 text-base font-semibold text-text">{lista.titulo}</h2>
              {lista.items.length === 0 ? (
                <p className="text-sm text-text-muted">Sin datos.</p>
              ) : (
                <ul className="space-y-2">
                  {lista.items.map((it) => (
                    <li key={it.texto} className="flex items-center justify-between text-sm">
                      <span className="text-text">{it.texto}</span>
                      <span className="font-semibold text-text-muted">{it.valor as ReactNode}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      {panel.feed && panel.feed.length > 0 && (
        <section className="rounded-md border border-border bg-surface p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-text">Actividad reciente</h2>
            <p className="mt-0.5 text-sm text-text-muted">Últimos movimientos relevantes de compras y subastas.</p>
          </div>
          <div className="divide-y divide-border">
            {panel.feed.map((item) => (
              <Link
                key={item.id}
                to={item.to}
                className="flex flex-wrap items-center gap-3 py-3 text-sm transition-colors hover:bg-background/50 first:pt-0 last:pb-0"
              >
                <span className="rounded-md bg-muted/50 px-2 py-0.5 text-xs font-medium text-text-muted">
                  {item.tipo}
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block text-text">{item.titulo}</strong>
                  {item.detalle && <small className="block text-text-muted">{item.detalle}</small>}
                </span>
                <span className="shrink-0 text-xs text-text-muted">
                  {formatearFecha(item.fecha)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {panel.acciones && panel.acciones.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {panel.acciones.map((a) => (
            <Button key={a.to} as={Link} to={a.to}>
              {a.texto}
            </Button>
          ))}
        </div>
      )}
    </PageShell>
  )
}

function BarChart({ items }: { items: GraficoItem[] }) {
  const max = Math.max(...items.map((item) => Number(item.valor) || 0), 1)

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const valor = Number(item.valor) || 0
        const width = `${Math.max(4, (valor / max) * 100)}%`
        return (
          <div key={item.label}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-text">{item.label}</span>
              <strong className="text-text-muted">{(item.display ?? valor) as ReactNode}</strong>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted/50" aria-hidden="true">
              <span
                className="block h-full rounded-full bg-primary transition-all"
                style={{ width }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function RankingChart({ items }: { items: GraficoItem[] }) {
  const max = Math.max(...items.map((item) => Number(item.valor) || 0), 1)

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const valor = Number(item.valor) || 0
        const width = `${Math.max(5, (valor / max) * 100)}%`
        return (
          <article key={`${item.label}-${index}`} className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded bg-muted/50 text-xs font-bold text-text-muted">
                #{index + 1}
              </span>
              <strong className="text-sm text-text">{item.label}</strong>
              {item.detalle && <small className="ml-1 text-text-muted">{item.detalle}</small>}
            </div>
            <span className="shrink-0 text-sm font-semibold text-text-muted">
              {(item.display ?? valor) as ReactNode}
            </span>
            <div className="h-1.5 w-full flex-1 overflow-hidden rounded-full bg-muted/50 md:w-32" aria-hidden="true">
              <span className="block h-full rounded-full bg-primary" style={{ width }} />
            </div>
          </article>
        )
      })}
    </div>
  )
}

function formatearFecha(fecha: string) {
  if (!fecha) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(fecha))
}
