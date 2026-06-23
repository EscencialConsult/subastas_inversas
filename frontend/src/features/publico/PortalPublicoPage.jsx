import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  Award,
  Building2,
  CalendarClock,
  FileText,
  LogIn,
  Radio,
  Search,
  ShieldCheck,
} from 'lucide-react'
import {
  abrirSseSubasta,
  listarAdjudicacionesPublicas,
  listarProcesosPublicos,
  listarSubastasPublicasEnVivo,
} from '../../api/publicApi.js'
import { formatearPesos, formatearFecha } from '../../utils/formatear.js'

const TABS = {
  PROCESOS: 'procesos',
  ADJUDICACIONES: 'adjudicaciones',
  SUBASTAS: 'subastas',
}

const TAB_INFO = {
  [TABS.PROCESOS]: {
    titulo: 'Procesos publicados',
    descripcion: 'Consulta convocatorias y procesos de compra visibles para la ciudadania.',
  },
  [TABS.ADJUDICACIONES]: {
    titulo: 'Adjudicaciones',
    descripcion: 'Revisa proveedores adjudicados, montos y fecha de adjudicacion.',
  },
  [TABS.SUBASTAS]: {
    titulo: 'Subastas en vivo',
    descripcion: 'Sigue el estado de las subastas inversas activas con actualizacion en tiempo real.',
  },
}

export function PortalPublicoPage() {
  const [tab, setTab] = useState(TABS.PROCESOS)
  const [busqueda, setBusqueda] = useState('')
  const [procesos, setProcesos] = useState([])
  const [adjudicaciones, setAdjudicaciones] = useState([])
  const [subastas, setSubastas] = useState([])
  const [subastaViva, setSubastaViva] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const timer = setTimeout(async () => {
      setCargando(true)
      setError('')
      try {
        if (tab === TABS.PROCESOS) {
          setProcesos(await listarProcesosPublicos({ busqueda }))
        }
        if (tab === TABS.ADJUDICACIONES) {
          setAdjudicaciones(await listarAdjudicacionesPublicas({ busqueda }))
        }
        if (tab === TABS.SUBASTAS) {
          const live = await listarSubastasPublicasEnVivo()
          setSubastas(live)
          setSubastaViva((actual) => live.find((s) => s.id === actual?.id) ?? live[0] ?? null)
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setCargando(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [tab, busqueda])

  useEffect(() => {
    if (tab !== TABS.SUBASTAS || !subastaViva?.id) return undefined

    let source = null

    const connect = () => {
      if (source) return
      source = abrirSseSubasta(
        subastaViva.id,
        (auction) => setSubastaViva((actual) => ({ ...actual, ...auction })),
        () => {},
      )
    }

    const disconnect = () => {
      if (source) {
        source.close()
        source = null
      }
    }

    if (document.visibilityState === 'visible') {
      connect()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        connect()
      } else {
        disconnect()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      disconnect()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [tab, subastaViva?.id])

  const metricas = useMemo(() => {
    const presupuestoPublicado = procesos.reduce((total, p) => total + Number(p.estimatedBudget || 0), 0)
    const montoAdjudicado = adjudicaciones.reduce((total, a) => total + Number(a.amount || 0), 0)
    const organismos = new Set([
      ...procesos.map((p) => p.companyName).filter(Boolean),
      ...adjudicaciones.map((a) => a.companyName).filter(Boolean),
      ...subastas.map((s) => s.companyName).filter(Boolean),
    ])

    return {
      procesos: procesos.length,
      adjudicaciones: adjudicaciones.length,
      subastas: subastas.length,
      organismos: organismos.size,
      presupuestoPublicado,
      montoAdjudicado,
    }
  }, [procesos, adjudicaciones, subastas])

  const info = TAB_INFO[tab]

  return (
    <main className="portal-publico">
      <section className="portal-shell">
        <header className="portal-hero">
          <div className="portal-hero__contenido">
            <span className="portal-hero__eyebrow">
              <ShieldCheck size={16} />
              Portal Publico
            </span>
            <h1>SICST MAX</h1>
            <p>
              Consulta publica de procesos de compra, adjudicaciones y subastas inversas en vivo.
              La informacion se presenta sin iniciar sesion para facilitar control, trazabilidad y
              seguimiento ciudadano.
            </p>
          </div>

          <div className="portal-hero__acciones">
            <Link className="btn btn--texto" to="/login">
              <LogIn size={17} />
              Ingresar
            </Link>
          </div>
        </header>

        <ResumenPortal metricas={metricas} />

        <section className="portal-panel">
          <div className="portal-panel__header">
            <div>
              <span className="portal-panel__label">Consulta publica</span>
              <h2>{info.titulo}</h2>
              <p>{info.descripcion}</p>
            </div>
            {tab !== TABS.SUBASTAS && (
              <label className="portal-search">
                <Search size={18} />
                <input
                  placeholder="Buscar por codigo, titulo, organismo o proveedor"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </label>
            )}
          </div>

          <div className="portal-tabs" aria-label="Secciones del portal publico">
            <TabButton active={tab === TABS.PROCESOS} onClick={() => setTab(TABS.PROCESOS)} icon={FileText}>
              Procesos
            </TabButton>
            <TabButton active={tab === TABS.ADJUDICACIONES} onClick={() => setTab(TABS.ADJUDICACIONES)} icon={Award}>
              Adjudicaciones
            </TabButton>
            <TabButton active={tab === TABS.SUBASTAS} onClick={() => setTab(TABS.SUBASTAS)} icon={Radio}>
              Subastas en vivo
            </TabButton>
          </div>

          {error && <div className="alerta alerta--error">{error}</div>}
          {cargando ? <p className="estado-cargando">Cargando informacion publica...</p> : null}

          {!cargando && tab === TABS.PROCESOS && <TablaProcesos procesos={procesos} />}
          {!cargando && tab === TABS.ADJUDICACIONES && <TablaAdjudicaciones adjudicaciones={adjudicaciones} />}
          {!cargando && tab === TABS.SUBASTAS && (
            <SubastasEnVivo subastas={subastas} seleccionada={subastaViva} onSeleccionar={setSubastaViva} />
          )}
        </section>
      </section>
    </main>
  )
}

function ResumenPortal({ metricas }) {
  return (
    <section className="portal-summary" aria-label="Resumen del portal publico">
      <MetricCard icon={FileText} label="Procesos publicados" value={metricas.procesos} detail={formatearPesos(metricas.presupuestoPublicado)} />
      <MetricCard icon={Award} label="Adjudicaciones" value={metricas.adjudicaciones} detail={formatearPesos(metricas.montoAdjudicado)} />
      <MetricCard icon={Radio} label="Subastas en vivo" value={metricas.subastas} detail="Actualizacion SSE" highlight />
      <MetricCard icon={Building2} label="Organismos" value={metricas.organismos} detail="Con informacion publica" />
    </section>
  )
}

function MetricCard({ icon: Icon, label, value, detail, highlight = false }) {
  return (
    <article className={`portal-metric ${highlight ? 'portal-metric--highlight' : ''}`}>
      <span className="portal-metric__icon"><Icon size={19} /></span>
      <span className="portal-metric__label">{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  )
}

function TabButton({ active, onClick, icon: Icon, children }) {
  return (
    <button type="button" className={active ? 'btn btn--primario' : 'btn btn--texto'} onClick={onClick}>
      <Icon size={17} />
      {children}
    </button>
  )
}

function TablaProcesos({ procesos }) {
  if (procesos.length === 0) {
    return (
      <div className="estado-vacio">
        <p>No hay procesos publicados para los filtros seleccionados.</p>
      </div>
    )
  }

  return (
    <div className="portal-table-wrap">
      <table className="tabla portal-table">
        <thead>
          <tr>
            <th>Proceso</th>
            <th>Organismo</th>
            <th>Estado</th>
            <th>Publicacion</th>
            <th>Presupuesto</th>
          </tr>
        </thead>
        <tbody>
          {procesos.map((p) => (
            <tr key={p.id}>
              <td>
                <div className="portal-record">
                  <code>{p.code}</code>
                  <strong>{p.title}</strong>
                  {p.description && <span>{p.description}</span>}
                </div>
              </td>
              <td>{p.companyName}</td>
              <td><span className="badge badge--info">{p.status}</span></td>
              <td>{formatearFecha(p.publishedAt)}</td>
              <td className="portal-money">{formatearPesos(p.estimatedBudget)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TablaAdjudicaciones({ adjudicaciones }) {
  if (adjudicaciones.length === 0) {
    return (
      <div className="estado-vacio">
        <p>No hay adjudicaciones publicadas para los filtros seleccionados.</p>
      </div>
    )
  }

  return (
    <div className="portal-table-wrap">
      <table className="tabla portal-table">
        <thead>
          <tr>
            <th>Proceso</th>
            <th>Organismo</th>
            <th>Proveedor adjudicado</th>
            <th>Fecha</th>
            <th>Monto</th>
          </tr>
        </thead>
        <tbody>
          {adjudicaciones.map((a) => (
            <tr key={a.id}>
              <td>
                <div className="portal-record">
                  <code>{a.processCode}</code>
                  <strong>{a.processTitle}</strong>
                  {a.observations && <span>{a.observations}</span>}
                </div>
              </td>
              <td>{a.companyName}</td>
              <td>{a.supplierName}</td>
              <td>{formatearFecha(a.adjudicatedAt)}</td>
              <td className="portal-money">{formatearPesos(a.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SubastasEnVivo({ subastas, seleccionada, onSeleccionar }) {
  if (subastas.length === 0) {
    return (
      <div className="estado-vacio">
        <p>No hay subastas en vivo en este momento.</p>
      </div>
    )
  }

  return (
    <div className="portal-live-card">
      <div className="portal-live-card__selector">
        <label>
          <span>Subasta activa</span>
          <select value={seleccionada?.id ?? ''} onChange={(e) => onSeleccionar(subastas.find((s) => s.id === e.target.value))}>
            {subastas.map((s) => (
              <option key={s.id} value={s.id}>{s.processCode} - {s.processTitle}</option>
            ))}
          </select>
        </label>
        <span className="badge badge--ok">En vivo</span>
      </div>

      {seleccionada && (
        <div className="portal-live">
          <div className="portal-live__detail">
            <div className="portal-record">
              <code>{seleccionada.processCode}</code>
              <strong>{seleccionada.processTitle}</strong>
              <span>{seleccionada.companyName}</span>
            </div>
            <dl className="portal-live__grid">
              <div>
                <dt><Building2 size={15} /> Organismo</dt>
                <dd>{seleccionada.companyName}</dd>
              </div>
              <div>
                <dt><Activity size={15} /> Lances recibidos</dt>
                <dd>{seleccionada.bidCount}</dd>
              </div>
              <div>
                <dt><CalendarClock size={15} /> Cierre previsto</dt>
                <dd>{formatearFechaHora(seleccionada.endsAt)}</dd>
              </div>
              <div>
                <dt><FileText size={15} /> Estado</dt>
                <dd>{seleccionada.status}</dd>
              </div>
            </dl>
          </div>

          <aside className="portal-live__price">
            <span>Precio actual</span>
            <strong>{formatearPesos(seleccionada.currentPrice)}</strong>
            <small>Precio base: {formatearPesos(seleccionada.basePrice)}</small>
          </aside>
        </div>
      )}
    </div>
  )
}

function formatearFechaHora(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}
