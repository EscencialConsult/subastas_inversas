import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { obtenerSubastaPublica, suscribirSubastaPublica } from '../../shared/api/publicoApi'
import { Alert } from '../../shared/ui/Alert'

const REFRESCO_MS = 12000

export function SubastaPublicaPage() {
  const { procesoId } = useParams()
  const navigate = useNavigate()

  const [subasta, setSubasta] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [actualizando, setActualizando] = useState(false)
  const [error, setError] = useState('')
  const [restante, setRestante] = useState(null)
  const [ahoraMs, setAhoraMs] = useState(() => Date.now())

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
    if (!subasta?.eventsUrl) return undefined

    return suscribirSubastaPublica({
      eventsUrl: subasta.eventsUrl,
      onSnapshot: (snapshot) => {
        setSubasta((actual) => ({
          ...actual,
          ...snapshot,
          disponible: true,
        }))
        setError('')
      },
      onError: () => {
        setError('No se pudo mantener la conexion en vivo. Seguimos actualizando la vista periodicamente.')
      },
    })
  }, [subasta?.eventsUrl])

  useEffect(() => {
    if (!subasta?.cierreEn) return
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

  if (cargando) return <Estado texto="Cargando subasta..." />
  if (error && !subasta) return <Alert variant="error">{error}</Alert>

  if (!subasta?.disponible) {
    return (
      <section className="flex flex-col gap-24">
        <button
          className="btn btn--texto"
          style={{ alignSelf: 'flex-start' }}
          onClick={() => navigate('/portal')}
        >
          Volver al portal
        </button>
        <div className="text-center" style={{ maxWidth: 560, margin: '0 auto' }}>
          <span className="public-form__tag">Subasta no disponible</span>
          <h1 className="public-form__title mt-8" style={{ fontSize: 30 }}>
            No hay una subasta publica activa para este proceso
          </h1>
          <p className="public-form__desc mt-12" style={{ maxWidth: 480, margin: '12px auto 0' }}>
            Puede haber finalizado, no haber comenzado todavia o no estar publicada para
            seguimiento ciudadano.
          </p>
        </div>
      </section>
    )
  }

  const inicioMs = new Date(subasta.inicioEn).getTime()
  const programada = subasta.programada || ahoraMs < inicioMs
  const cerrada = !programada && restante !== null && restante <= 0
  const estadoBadge = cerrada
    ? { texto: 'Finalizada', clase: 'badge--off' }
    : programada
      ? { texto: 'Programada', clase: 'badge--info' }
      : { texto: 'Activa', clase: 'badge--ok' }

  return (
    <section className="flex flex-col gap-24">
      <div className="hero" style={{ padding: '24px 32px' }}>
        <div className="flex items-center justify-between">
          <div>
            <button
              className="btn btn--texto"
              onClick={() => navigate('/portal')}
            >
              Volver al portal
            </button>
            <span className="hero__tag" style={{ display: 'block', marginTop: 12 }}>
              Seguimiento publico anonimo
            </span>
            <h1 className="hero__title" style={{ fontSize: 30 }}>
              <code className="card__code">{subasta.codigo}</code>{' '}
              {subasta.titulo}
            </h1>
            <p className="hero__desc">{subasta.empresa}</p>
          </div>
          <span className={`badge ${estadoBadge.clase}`}>
            {estadoBadge.texto}
          </span>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      <Alert variant="info">Se muestran precios, tiempos y cantidad de lances. La identidad de los oferentes no se expone en esta etapa.</Alert>

      <div className="metric-grid">
        <MetricCard etiqueta="Precio actual" valor={formatearPesos(subasta.precioActual)} destacado />
        <MetricCard etiqueta="Presupuesto base" valor={formatearPesos(subasta.precioBase)} />
        <MetricCard etiqueta="Ahorro estimado" valor={formatearPesos(ahorro)} />
        <MetricCard
          etiqueta={programada ? 'Inicia en' : 'Tiempo restante'}
          valor={cerrada ? 'Finalizada' : formatearTiempo(restante)}
        />
        <MetricCard etiqueta="Lances registrados" valor={subasta.cantidadLances} />
        <MetricCard etiqueta="Actualizacion" valor={actualizando ? 'Actualizando...' : 'Automatica'} />
      </div>

      <div className="form">
        <div className="panel-header">
          <h2 className="panel-header__title">Resumen de la subasta</h2>
          <p className="panel-header__desc">
            Informacion publica de referencia para el seguimiento del proceso.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <TimelineItem etiqueta="Inicio" valor={formatearFechaHora(subasta.inicioEn)} />
          <TimelineItem etiqueta="Mejor precio actual" valor={formatearPesos(subasta.precioActual)} />
          <TimelineItem etiqueta="Cierre previsto" valor={formatearFechaHora(subasta.cierreEn)} />
        </div>
      </div>

      <div className="form">
        <div className="panel-header">
          <h2 className="panel-header__title">Ranking de lances</h2>
          <p className="panel-header__desc">
            {subasta.identidadesReveladas
              ? 'La subasta finalizo y las identidades ya estan publicadas.'
              : 'Durante la subasta, los oferentes se muestran con alias anonimos.'}
          </p>
        </div>
        {subasta.ranking?.length > 0 ? (
          <div className="flex flex-col gap-12">
            {subasta.ranking.map((item) => (
              <article className="row-item" key={`${item.posicion}-${item.nombre}`}>
                <div>
                  <code className="row-item__code">#{item.posicion}</code>
                  <h3 className="row-item__title">{item.nombre}</h3>
                  <p className="row-item__desc">
                    {item.cantidadLances} lances - ultimo {formatearFechaHora(item.ultimoLanceEn)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="row-item__value">{formatearPesos(item.monto)}</span>
                  <small className="row-item__detail">Mejor oferta</small>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <Estado texto="Todavia no hay lances registrados." />
        )}
      </div>
    </section>
  )
}

function MetricCard({ etiqueta, valor, destacado = false }) {
  return (
    <article className={`metric-card ${destacado ? 'metric-highlight' : ''}`}>
      <span className="metric-card__label">{etiqueta}</span>
      <strong className={`metric-card__value ${destacado ? 'text-ok' : ''}`}>
        {valor}
      </strong>
    </article>
  )
}

function TimelineItem({ etiqueta, valor }) {
  return (
    <div className="timeline-item">
      <span className="timeline-item__label">{etiqueta}</span>
      <strong className="timeline-item__value">{valor}</strong>
    </div>
  )
}

function Estado({ texto }) {
  return (
    <p className="empty-state" style={{ padding: 32 }}>
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
