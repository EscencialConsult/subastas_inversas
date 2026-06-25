// Portal ciudadano: vista publica de procesos, subastas y adjudicaciones.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  listarAdjudicacionesPublicas,
  listarProcesosPublicos,
  listarSubastasPublicas,
} from '../../api/publicoApi.js'
import { ESTADO_INFO, etiquetaEstado } from '../../domain/compras.js'

const ESTADO_BADGE = {
  borrador: 'bg-slate-100 text-slate-600 ring-slate-200',
  publicado: 'bg-sky-50 text-sky-800 ring-sky-200',
  en_subasta: 'bg-amber-50 text-amber-800 ring-amber-200',
  cerrada: 'bg-indigo-50 text-indigo-800 ring-indigo-200',
  adjudicada: 'bg-amber-50 text-amber-800 ring-amber-200',
  aprobada: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  desierta: 'bg-slate-100 text-slate-600 ring-slate-200',
  cancelada: 'bg-rose-50 text-rose-700 ring-rose-200',
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
        tono: 'text-sky-950',
        fondo: 'bg-sky-50 text-sky-800 ring-sky-100',
      },
      {
        etiqueta: 'Subastas publicadas',
        valor: subastas.length,
        ayuda: 'Activas y finalizadas',
        inicial: 'S',
        tono: 'text-teal-800',
        fondo: 'bg-teal-50 text-teal-800 ring-teal-100',
      },
      {
        etiqueta: 'Adjudicaciones',
        valor: adjudicaciones.length,
        ayuda: 'Resultados publicados',
        inicial: 'A',
        tono: 'text-indigo-950',
        fondo: 'bg-indigo-50 text-indigo-800 ring-indigo-100',
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
    <section className="space-y-5">
      <div className="overflow-hidden rounded-lg border border-sky-100 bg-white shadow-sm">
        <div className="grid gap-6 border-b border-slate-100 bg-sky-50/70 p-6 lg:grid-cols-[1fr_290px] lg:p-8">
          <div>
            <span className="text-xs font-black uppercase tracking-[0.16em] text-teal-700">
              Compra publica abierta y verificable
            </span>
            <h1 className="mt-3 max-w-4xl text-4xl font-black tracking-normal text-slate-950 lg:text-5xl">
              Consultas de compras, subastas y adjudicaciones publicas
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700">
              Informacion actualizada del sistema SICST para seguir procesos publicados,
              subastas en vivo y resultados adjudicados sin iniciar sesion.
            </p>
          </div>
          <div className="flex flex-col justify-center gap-3 rounded-md border border-white bg-white/85 p-4 shadow-sm">
            <button
              className="rounded-md bg-sky-700 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-sky-800"
              onClick={() => navigate('/registro-proveedor')}
            >
              Registrarme como proveedor
            </button>
            <button
              className="rounded-md border border-sky-100 px-4 py-3 text-sm font-black text-sky-900 transition hover:bg-sky-50"
              onClick={() => navigate('/login')}
            >
              Ingresar al sistema
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {metricas.map((metrica) => (
          <article
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            key={metrica.etiqueta}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-sm font-bold text-slate-600">{metrica.etiqueta}</span>
                <p className="mt-1 text-xs font-semibold text-slate-400">{metrica.ayuda}</p>
              </div>
              <span className={`grid h-9 w-9 place-items-center rounded-md text-sm font-black ring-1 ${metrica.fondo}`}>
                {metrica.inicial}
              </span>
            </div>
            <strong className={`mt-4 block text-4xl font-black leading-none ${metrica.tono}`}>
              {metrica.valor}
            </strong>
          </article>
        ))}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div
          className="flex gap-1 overflow-x-auto border-b border-slate-200 p-2"
          role="tablist"
          aria-label="Secciones del portal publico"
        >
          {tabs.map((tab) => {
            const activa = tabActiva === tab.id
            return (
              <button
                key={tab.id}
                className={`flex min-h-11 items-center gap-2 rounded-md px-4 py-2 text-sm font-black transition ${
                  activa
                    ? 'bg-sky-700 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-sky-900'
                }`}
                role="tab"
                type="button"
                aria-selected={activa}
                onClick={() => setTabActiva(tab.id)}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    activa ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {tab.total}
                </span>
              </button>
            )
          })}
        </div>

        <div className="p-5 lg:p-6">
          {tabActiva === 'procesos' && (
            <PanelTab
              titulo="Procesos disponibles para consultar"
              descripcion="Compras publicadas con estado, presupuesto estimado y organismo responsable."
              acciones={
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <input
                    className="min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-sky-600 focus:ring-2 focus:ring-sky-100 sm:min-w-72"
                    placeholder="Buscar codigo, titulo o empresa"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                  />
                  <select
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
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
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {procesos.map((proceso) => (
                    <article
                      className="flex min-h-72 flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md"
                      key={proceso.id}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <code className="rounded bg-slate-100 px-2 py-1 text-xs font-black text-sky-900">
                          {proceso.codigo}
                        </code>
                        <Badge estado={proceso.estado} />
                      </div>
                      <h3 className="mt-4 text-lg font-black leading-6 text-slate-950">
                        {proceso.titulo}
                      </h3>
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
                        {proceso.descripcion || 'Sin descripcion publica cargada.'}
                      </p>
                      <dl className="mt-5 grid gap-3 text-sm">
                        <Dato etiqueta="Organismo" valor={proceso.empresa} />
                        <Dato etiqueta="Presupuesto" valor={formatearPesos(proceso.presupuestoEstimado)} />
                        <Dato etiqueta="Publicado" valor={formatearFecha(proceso.publicadoEn ?? proceso.creadoEn)} />
                      </dl>
                      {proceso.tieneSubasta && (
                        <button
                          className="mt-auto rounded-md bg-sky-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-sky-800"
                          onClick={() => navigate(`/portal/subasta/${proceso.id}`)}
                        >
                          Ver subasta
                        </button>
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
                <div className="grid gap-3">
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
                <div className="grid gap-3">
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
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-950">{titulo}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">{descripcion}</p>
        </div>
        {acciones}
      </div>
      {children}
    </section>
  )
}

function Badge({ estado }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-black ring-1 ${
        ESTADO_BADGE[estado] ?? 'bg-slate-100 text-slate-600 ring-slate-200'
      }`}
    >
      {etiquetaEstado(estado)}
    </span>
  )
}

function Dato({ etiqueta, valor }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-slate-500">{etiqueta}</dt>
      <dd className="mt-0.5 font-bold text-slate-800">{valor}</dd>
    </div>
  )
}

function FilaPublica({ codigo, titulo, descripcion, valor, detalle, accion, onClick }) {
  return (
    <article className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center">
      <div>
        <code className="text-xs font-black text-sky-900">{codigo}</code>
        <h3 className="mt-1 text-base font-black text-slate-950">{titulo}</h3>
        <p className="mt-1 text-sm text-slate-600">{descripcion}</p>
      </div>
      <div className="sm:text-right">
        <span className="block text-lg font-black text-slate-950">{valor}</span>
        <small className="text-slate-500">{detalle}</small>
      </div>
      {accion && (
        <button
          className="rounded-md px-3 py-2 text-sm font-bold text-sky-800 transition hover:bg-white"
          onClick={onClick}
        >
          {accion}
        </button>
      )}
    </article>
  )
}

function Estado({ titulo, texto, inicial = 'i' }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <span className="mx-auto grid h-11 w-11 place-items-center rounded-md bg-white text-sm font-black text-slate-500 ring-1 ring-slate-200">
        {inicial}
      </span>
      <h3 className="mt-4 text-base font-black text-slate-800">{titulo}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">{texto}</p>
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
