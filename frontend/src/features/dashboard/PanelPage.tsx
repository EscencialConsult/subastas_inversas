// Panel de inicio (dashboard). Es generico: pide al backend el resumen
// que corresponde al rol del usuario y lo dibuja. Asi, agregar/ajustar un panel
// es cambiar datos en dashboardApi, no esta pantalla.

import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { getErrorMessage } from '../../shared/query/queryClient'
import { Spinner } from '../../shared/ui/Spinner'
import { Alert } from '../../shared/ui/Alert'
import { dashboardKeys, obtenerPanelQuery } from './data/dashboardData'

export function PanelPage() {
  const { usuario, tenant, rol } = useAuth()
  const panelQuery = useQuery({
    queryKey: dashboardKeys.panel(rol, usuario.tenantId),
    queryFn: () => obtenerPanelQuery({ rol, tenantId: usuario.tenantId }),
  })

  const panel = panelQuery.data
  const error = getErrorMessage(panelQuery.error, '')

  if (panelQuery.isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>
  if (!panel) return <Alert variant="error">{error}</Alert>

  return (
    <section>
      <div className="panel-saludo">
        <h1>Hola, {usuario.nombre}</h1>
        <p>
          {panel.titulo}
          {tenant && ` · ${tenant.nombre}`}
        </p>
      </div>

      {panel.nota && <Alert variant="info">{panel.nota}</Alert>}

      {panel.cards?.length > 0 && (
        <div className="panel-cards">
          {panel.cards.map((c) => (
            <div key={c.label} className={`panel-card ${c.clase ?? ''}`}>
              <span className="panel-card__valor">{c.valor}</span>
              <span className="panel-card__label">{c.label}</span>
            </div>
          ))}
        </div>
      )}

      {panel.kpis?.length > 0 && (
        <div className="executive-kpis">
          {panel.kpis.map((kpi) => (
            <article className="executive-kpi" key={kpi.label}>
              <span className="executive-kpi__label">{kpi.label}</span>
              <strong className="executive-kpi__value">{kpi.valor}</strong>
              <span className="executive-kpi__help">{kpi.ayuda}</span>
            </article>
          ))}
        </div>
      )}

      {panel.graficos?.length > 0 && (
        <div className="executive-grid">
          {panel.graficos.map((grafico) => (
            <section className="executive-chart" key={grafico.titulo}>
              <div className="executive-chart__header">
                <h2>{grafico.titulo}</h2>
                {grafico.descripcion && <p>{grafico.descripcion}</p>}
              </div>
              {grafico.items.length === 0 ? (
                <p className="panel-lista__vacio">Sin datos.</p>
              ) : grafico.tipo === 'ranking' ? (
                <RankingChart items={grafico.items} />
              ) : (
                <BarChart items={grafico.items} />
              )}
            </section>
          ))}
        </div>
      )}

      {panel.listas?.length > 0 && (
        <div className="panel-listas-grid">
          {panel.listas.map((lista) => (
            <div key={lista.titulo} className="panel-lista">
              <h2 className="text-lg font-semibold text-text">{lista.titulo}</h2>
              {lista.items.length === 0 ? (
                <p className="panel-lista__vacio">Sin datos.</p>
              ) : (
                <ul className="panel-lista__items">
                  {lista.items.map((it) => (
                    <li key={it.texto}>
                      <span>{it.texto}</span>
                      <span className="panel-lista__valor">{it.valor}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {panel.feed?.length > 0 && (
        <section className="activity-feed">
          <div className="executive-chart__header">
            <h2>Actividad reciente</h2>
            <p>Ultimos movimientos relevantes de compras y subastas.</p>
          </div>
          <div className="activity-feed__items">
            {panel.feed.map((item) => (
              <Link className="activity-feed__item" key={item.id} to={item.to}>
                <span className="activity-feed__type">{item.tipo}</span>
                <span className="activity-feed__body">
                  <strong>{item.titulo}</strong>
                  <small>{item.detalle}</small>
                </span>
                <span className="activity-feed__date">{formatearFecha(item.fecha)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {panel.acciones?.length > 0 && (
        <div className="panel-acciones">
          {panel.acciones.map((a) => (
            <Link key={a.to} to={a.to} className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-60">
              {a.texto}
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}

function BarChart({ items }) {
  const max = Math.max(...items.map((item) => Number(item.valor) || 0), 1)

  return (
    <div className="bar-chart">
      {items.map((item) => {
        const valor = Number(item.valor) || 0
        const width = `${Math.max(4, (valor / max) * 100)}%`
        return (
          <div className="bar-chart__row" key={item.label}>
            <div className="bar-chart__meta">
              <span>{item.label}</span>
              <strong>{item.display ?? valor}</strong>
            </div>
            <div className="bar-chart__track" aria-hidden="true">
              <span className="bar-chart__bar" style={{ width }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function RankingChart({ items }) {
  const max = Math.max(...items.map((item) => Number(item.valor) || 0), 1)

  return (
    <div className="ranking-chart">
      {items.map((item, index) => {
        const valor = Number(item.valor) || 0
        const width = `${Math.max(5, (valor / max) * 100)}%`
        return (
          <article className="ranking-chart__item" key={`${item.label}-${index}`}>
            <div>
              <span className="ranking-chart__position">#{index + 1}</span>
              <strong>{item.label}</strong>
              {item.detalle && <small>{item.detalle}</small>}
            </div>
            <span className="ranking-chart__value">{item.display ?? valor}</span>
            <div className="bar-chart__track ranking-chart__track" aria-hidden="true">
              <span className="bar-chart__bar" style={{ width }} />
            </div>
          </article>
        )
      })}
    </div>
  )
}

function formatearFecha(fecha) {
  if (!fecha) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(fecha))
}
