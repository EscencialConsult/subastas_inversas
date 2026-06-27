import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  listarAdjudicacionesPublicas,
  listarProcesosPublicos,
  listarSubastasPublicas,
} from '../../api/publicoApi.js'
import { ESTADO_INFO, etiquetaEstado } from '../../domain/compras.js'

const ESTADO_BADGE = {
  borrador: 'badge--off',
  publicado: 'badge--info',
  en_subasta: 'badge--warn',
  cerrada: 'badge--info',
  adjudicada: 'badge--warn',
  aprobada: 'badge--ok',
  desierta: 'badge--off',
  cancelada: 'badge--error',
}

export function PortalPublicoPage() {
  const navigate = useNavigate()
  const [procesos, setProcesos] = useState([])
  const [subastas, setSubastas] = useState([])
  const [adjudicaciones, setAdjudicaciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState('')
  const [tabActiva, setTabActiva] = useState('procesos')

  const cargarDatos = useCallback(async (filtros) => {
    setCargando(true)
    setError('')
    try {
      const [procesosData, subastasData, adjudicacionesData] = await Promise.all([
        listarProcesosPublicos(filtros),
        listarSubastasPublicas(),
        listarAdjudicacionesPublicas({ busqueda: filtros.busqueda }),
      ])
      setProcesos(procesosData)
      setSubastas(subastasData)
      setAdjudicaciones(adjudicacionesData)
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      cargarDatos({ busqueda, estado })
    }, 250)
    return () => clearTimeout(t)
  }, [busqueda, cargarDatos, estado])

  const metricas = useMemo(
    () => [
      {
        etiqueta: 'Procesos publicados',
        valor: procesos.length,
        ayuda: 'Disponibles para consulta',
        inicial: 'P',
        variante: 'metric-card--primary',
      },
      {
        etiqueta: 'Subastas publicadas',
        valor: subastas.length,
        ayuda: 'Activas y finalizadas',
        inicial: 'S',
        variante: 'metric-card--success',
      },
      {
        etiqueta: 'Adjudicaciones',
        valor: adjudicaciones.length,
        ayuda: 'Resultados publicados',
        inicial: 'A',
        variante: 'metric-card--info',
      },
    ],
    [adjudicaciones.length, procesos.length, subastas.length],
  )

  const tabs = useMemo(
    () => [
      { id: 'procesos', label: 'Procesos', total: procesos.length },
      { id: 'subastas', label: 'Subastas', total: subastas.length },
      { id: 'adjudicaciones', label: 'Adjudicaciones', total: adjudicaciones.length },
    ],
    [adjudicaciones.length, procesos.length, subastas.length],
  )

  return (
    <section className="flex flex--col gap-24">
      <div className="hero">
        <div className="hero__inner">
          <div>
            <span className="hero__tag">Compra publica abierta y verificable</span>
            <h1 className="hero__title">
              Consultas de compras, subastas y adjudicaciones publicas
            </h1>
            <p className="hero__desc">
              Informacion actualizada del sistema SICST para seguir procesos publicados,
              subastas en vivo y resultados adjudicados sin iniciar sesion.
            </p>
          </div>
          <div className="hero__actions">
            <button
              className="btn btn--primario"
              onClick={() => navigate('/registro-proveedor')}
            >
              Registrarme como proveedor
            </button>
            <button
              className="btn btn--secundario"
              onClick={() => navigate('/login')}
            >
              Ingresar al sistema
            </button>
          </div>
        </div>
      </div>

      {error && <div className="alerta alerta--error">{error}</div>}

      <div className="metric-grid">
        {metricas.map((metrica) => (
          <article className={`metric-card ${metrica.variante}`} key={metrica.etiqueta}>
            <div className="metric-card__header">
              <div>
                <span className="metric-card__label">{metrica.etiqueta}</span>
                <p className="metric-card__help">{metrica.ayuda}</p>
              </div>
              <span className="metric-card__badge">{metrica.inicial}</span>
            </div>
            <strong className="metric-card__value">{metrica.valor}</strong>
          </article>
        ))}
      </div>

      <div className="tabs">
        <div className="tabs__header" role="tablist" aria-label="Secciones del portal publico">
          {tabs.map((tab) => {
            const activa = tabActiva === tab.id
            return (
              <button
                key={tab.id}
                className={`tabs__btn ${activa ? 'tabs__btn--active' : ''}`}
                role="tab"
                type="button"
                aria-selected={activa}
                onClick={() => setTabActiva(tab.id)}
              >
                <span>{tab.label}</span>
                <span className="tabs__count">{tab.total}</span>
              </button>
            )
          })}
        </div>

        <div className="tabs__content">
          {tabActiva === 'procesos' && (
            <PanelTab
              titulo="Procesos disponibles para consultar"
              descripcion="Compras publicadas con estado, presupuesto estimado y organismo responsable."
              acciones={
                <div className="busqueda">
                  <input
                    placeholder="Buscar codigo, titulo o empresa"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                  />
                  <select
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                  >
                    <option value="">Todos los estados</option>
                    {Object.entries(ESTADO_INFO).map(([clave, info]) => (
                      <option key={clave} value={clave}>
                        {info.label}
                      </option>
                    ))}
                  </select>
                </div>
              }
            >
              {cargando ? (
                <Estado titulo="Cargando procesos" texto="Estamos consultando la informacion publica disponible." />
              ) : procesos.length === 0 ? (
                <Estado
                  titulo="Todavia no hay procesos publicados"
                  texto="Cuando existan procesos abiertos, en subasta o adjudicados van a aparecer en esta seccion."
                  inicial="P"
                />
              ) : (
                <div className="card-grid">
                  {procesos.map((proceso) => (
                    <article className="card" key={proceso.id}>
                      <div className="card__header">
                        <code className="card__code">{proceso.codigo}</code>
                        <Badge estado={proceso.estado} />
                      </div>
                      <h3 className="card__title">{proceso.titulo}</h3>
                      <p className="card__desc">
                        {proceso.descripcion || 'Sin descripcion publica cargada.'}
                      </p>
                      <dl className="card__meta">
                        <Dato etiqueta="Organismo" valor={proceso.empresa} />
                        <Dato etiqueta="Presupuesto" valor={formatearPesos(proceso.presupuestoEstimado)} />
                        <Dato etiqueta="Publicado" valor={formatearFecha(proceso.publicadoEn ?? proceso.creadoEn)} />
                      </dl>
                      {proceso.tieneSubasta && (
                        <div className="card__action">
                          <button
                            className="btn btn--primario"
                            onClick={() => navigate(`/portal/subasta/${proceso.id}`)}
                          >
                            Ver subasta
                          </button>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </PanelTab>
          )}

          {tabActiva === 'subastas' && (
            <PanelTab
              titulo="Subastas publicadas"
              descripcion="Seguimiento anonimo de precios, lances y cierres de subastas activas o finalizadas."
            >
              {cargando ? (
                <Estado titulo="Buscando subastas" texto="Revisando procesos con subastas publicadas." />
              ) : subastas.length === 0 ? (
                <Estado
                  titulo="No hay subastas publicadas"
                  texto="Cuando existan procesos con subasta, van a aparecer aca para seguimiento de precio y lances."
                  inicial="S"
                />
              ) : (
                <div className="flex flex--col gap-12">
                  {subastas.map((subasta) => (
                    <FilaPublica
                      key={subasta.id}
                      codigo={subasta.codigo}
                      titulo={subasta.titulo}
                      descripcion={subasta.empresa}
                      valor={formatearPesos(subasta.precioActual)}
                      detalle={`${subasta.finalizada ? 'Finalizada' : 'Activa'} - ${subasta.cantidadLances} lances`}
                      accion="Ver detalle"
                      onClick={() => navigate(`/portal/subasta/${subasta.procesoId}`)}
                    />
                  ))}
                </div>
              )}
            </PanelTab>
          )}

          {tabActiva === 'adjudicaciones' && (
            <PanelTab
              titulo="Resultados adjudicados"
              descripcion="Adjudicaciones publicadas para consulta de proveedores, montos y fechas."
            >
              {cargando ? (
                <Estado titulo="Cargando adjudicaciones" texto="Consultando resultados publicados." />
              ) : adjudicaciones.length === 0 ? (
                <Estado
                  titulo="Todavia no hay adjudicaciones publicadas"
                  texto="Cuando se registren adjudicaciones, el resultado del proceso va a quedar visible aca."
                  inicial="A"
                />
              ) : (
                <div className="flex flex--col gap-12">
                  {adjudicaciones.map((adjudicacion) => (
                    <FilaPublica
                      key={adjudicacion.id}
                      codigo={adjudicacion.codigo}
                      titulo={adjudicacion.titulo}
                      descripcion={`${adjudicacion.empresa} - ${adjudicacion.proveedor}`}
                      valor={formatearPesos(adjudicacion.monto)}
                      detalle={formatearFecha(adjudicacion.adjudicadoEn)}
                    />
                  ))}
                </div>
              )}
            </PanelTab>
          )}
        </div>
      </div>
    </section>
  )
}

function PanelTab({ titulo, descripcion, acciones, children }) {
  return (
    <section>
      <div className="panel-header">
        <div>
          <h2 className="panel-header__title">{titulo}</h2>
          <p className="panel-header__desc">{descripcion}</p>
        </div>
        {acciones}
      </div>
      {children}
    </section>
  )
}

function Badge({ estado }) {
  return (
    <span className={`badge ${ESTADO_BADGE[estado] ?? 'badge--off'}`}>
      {etiquetaEstado(estado)}
    </span>
  )
}

function Dato({ etiqueta, valor }) {
  return (
    <div>
      <dt className="text-xs text-suave" style={{ fontWeight: 600 }}>{etiqueta}</dt>
      <dd className="mt-4" style={{ fontWeight: 700 }}>{valor}</dd>
    </div>
  )
}

function FilaPublica({ codigo, titulo, descripcion, valor, detalle, accion, onClick }) {
  return (
    <article className="row-item">
      <div>
        <code className="row-item__code">{codigo}</code>
        <h3 className="row-item__title">{titulo}</h3>
        <p className="row-item__desc">{descripcion}</p>
      </div>
      <div className="text-right">
        <span className="row-item__value">{valor}</span>
        <small className="row-item__detail">{detalle}</small>
      </div>
      {accion && (
        <button className="row-item__action" onClick={onClick}>
          {accion}
        </button>
      )}
    </article>
  )
}

function Estado({ titulo, texto, inicial = 'i' }) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon">{inicial}</span>
      <h3 className="empty-state__title">{titulo}</h3>
      <p className="empty-state__text">{texto}</p>
    </div>
  )
}

function formatearPesos(monto) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(Number(monto ?? 0))
}

function formatearFecha(fecha) {
  if (!fecha) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(fecha))
}
