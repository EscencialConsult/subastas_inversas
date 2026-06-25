// Subasta publica anonima: seguimiento ciudadano de precio, tiempo y lances.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { obtenerSubastaPublica } from '../../api/publicoApi.js'

const REFRESCO_MS = 12000

export function SubastaPublicaPage() {
  const { procesoId } = useParams()
  const navigate = useNavigate()

  const [subasta, setSubasta] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [actualizando, setActualizando] = useState(false)
  const [error, setError] = useState('')
  const [restante, setRestante] = useState(null)

  const cargar = useCallback(
    async ({ silencioso = false } = {}) => {
      if (silencioso) setActualizando(true)
      else setCargando(true)
      setError('')
      try {
        const data = await obtenerSubastaPublica({ procesoId })
        setSubasta(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setCargando(false)
        setActualizando(false)
      }
    },
    [procesoId],
  )

  useEffect(() => {
    const inicio = setTimeout(() => cargar(), 0)
    const intervalo = setInterval(() => cargar({ silencioso: true }), REFRESCO_MS)
    return () => {
      clearTimeout(inicio)
      clearInterval(intervalo)
    }
  }, [cargar])

  useEffect(() => {
    if (!subasta?.cierreEn) return
    const cierre = new Date(subasta.cierreEn).getTime()
    const tick = () => setRestante(cierre - Date.now())
    tick()
    const intervalo = setInterval(tick, 1000)
    return () => clearInterval(intervalo)
  }, [subasta])

  const ahorro = useMemo(() => {
    if (!subasta) return 0
    return Math.max(0, Number(subasta.precioBase ?? 0) - Number(subasta.precioActual ?? 0))
  }, [subasta])

  if (cargando) return <Estado texto="Cargando subasta..." />
  if (error && !subasta) return <Alerta tipo="error" texto={error} />

  if (!subasta?.disponible) {
    return (
      <section className="space-y-6">
        <button
          className="rounded-md px-3 py-2 text-sm font-bold text-sky-800 transition hover:bg-white"
          onClick={() => navigate('/portal')}
        >
          Volver al portal
        </button>
        <div className="mx-auto max-w-2xl rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
          <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
            Subasta no disponible
          </span>
          <h1 className="mt-3 text-3xl font-black tracking-normal text-slate-950">
            No hay una subasta publica activa para este proceso
          </h1>
          <p className="mt-3 leading-7 text-slate-600">
            Puede haber finalizado, no haber comenzado todavia o no estar publicada para
            seguimiento ciudadano.
          </p>
        </div>
      </section>
    )
  }

  const cerrada = restante !== null && restante <= 0

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-sky-100 bg-sky-50/70 p-6 shadow-sm lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <button
              className="-ml-3 rounded-md px-3 py-2 text-sm font-bold text-sky-800 transition hover:bg-white"
              onClick={() => navigate('/portal')}
            >
              Volver al portal
            </button>
            <span className="mt-3 block text-xs font-black uppercase tracking-[0.14em] text-teal-700">
              Seguimiento publico anonimo
            </span>
            <h1 className="mt-3 max-w-4xl text-3xl font-black tracking-normal text-slate-950 lg:text-4xl">
              <code className="rounded bg-slate-100 px-2 py-1 text-2xl text-sky-900">
                {subasta.codigo}
              </code>{' '}
              {subasta.titulo}
            </h1>
            <p className="mt-3 text-base font-medium text-slate-600">{subasta.empresa}</p>
          </div>
          <span
            className={`w-fit rounded-full px-3 py-1 text-sm font-black ring-1 ${
              cerrada
                ? 'bg-slate-100 text-slate-600 ring-slate-200'
                : 'bg-emerald-50 text-emerald-800 ring-emerald-200'
            }`}
          >
            {cerrada ? 'Finalizada' : 'Activa'}
          </span>
        </div>
      </div>

      {error && <Alerta tipo="error" texto={error} />}
      <Alerta texto="Se muestran precios, tiempos y cantidad de lances. La identidad de los oferentes no se expone en esta etapa." />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard etiqueta="Precio actual" valor={formatearPesos(subasta.precioActual)} destacado />
        <MetricCard etiqueta="Presupuesto base" valor={formatearPesos(subasta.precioBase)} />
        <MetricCard etiqueta="Ahorro estimado" valor={formatearPesos(ahorro)} />
        <MetricCard etiqueta="Tiempo restante" valor={cerrada ? 'Finalizada' : formatearTiempo(restante)} />
        <MetricCard etiqueta="Lances registrados" valor={subasta.cantidadLances} />
        <MetricCard etiqueta="Actualizacion" valor={actualizando ? 'Actualizando...' : 'Automatica'} />
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:p-6">
        <div className="mb-5">
          <h2 className="text-xl font-black text-slate-950">Resumen de la subasta</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Informacion publica de referencia para el seguimiento del proceso.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <TimelineItem etiqueta="Inicio" valor={formatearFechaHora(subasta.inicioEn)} />
          <TimelineItem etiqueta="Mejor precio actual" valor={formatearPesos(subasta.precioActual)} />
          <TimelineItem etiqueta="Cierre previsto" valor={formatearFechaHora(subasta.cierreEn)} />
        </div>
      </section>
    </section>
  )
}

function MetricCard({ etiqueta, valor, destacado = false }) {
  return (
    <article
      className={`rounded-lg border p-5 shadow-sm ${
        destacado
          ? 'border-teal-200 bg-teal-50'
          : 'border-slate-200 bg-white'
      }`}
    >
      <span className="text-sm font-semibold text-slate-500">{etiqueta}</span>
      <strong className={`mt-2 block text-3xl font-black ${destacado ? 'text-teal-800' : 'text-slate-950'}`}>
        {valor}
      </strong>
    </article>
  )
}

function TimelineItem({ etiqueta, valor }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <span className="text-sm font-semibold text-slate-500">{etiqueta}</span>
      <strong className="mt-1 block text-base font-black text-slate-950">{valor}</strong>
    </div>
  )
}

function Alerta({ texto, tipo = 'info' }) {
  const clases =
    tipo === 'error'
      ? 'border-rose-200 bg-rose-50 text-rose-700'
      : 'border-sky-200 bg-sky-50 text-sky-800'

  return <div className={`rounded-md border px-4 py-3 text-sm font-semibold ${clases}`}>{texto}</div>
}

function Estado({ texto }) {
  return (
    <p className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-semibold text-slate-500">
      {texto}
    </p>
  )
}

function formatearPesos(monto) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(Number(monto ?? 0))
}

function formatearTiempo(ms) {
  const total = Math.max(0, Math.floor((ms ?? 0) / 1000))
  const horas = String(Math.floor(total / 3600)).padStart(2, '0')
  const min = String(Math.floor((total % 3600) / 60)).padStart(2, '0')
  const seg = String(total % 60).padStart(2, '0')
  return `${horas}:${min}:${seg}`
}

function formatearFechaHora(fecha) {
  if (!fecha) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(fecha))
}
