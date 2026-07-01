import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { obtenerProcesoPublico, suscribirSubastaPublica } from '../../api/publicoApi'
import { etiquetaEstado } from '../../domain/compras'
import { Alert } from '../../components/ui/Alert'

const ESTADO_BADGE = {
  borrador: 'badge--off',
  publicado: 'badge--info',
  en_subasta: 'badge--warn',
  cerrada: 'badge--info',
  adjudicada: 'badge--warn',
  aprobada: 'badge--ok',
  desierta: 'badge--off',
  suspendida: 'badge--error',
}

export function ProcesoPublicoPage() {
  const { procesoId } = useParams()
  const navigate = useNavigate()
  const [proceso, setProceso] = useState(null)
  const [subasta, setSubasta] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [actualizadoEn, setActualizadoEn] = useState(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      const data = await obtenerProcesoPublico({ procesoId })
      setProceso(data)
      setSubasta(data.subasta)
      setActualizadoEn(new Date().toISOString())
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }, [procesoId])

  useEffect(() => {
    const inicio = setTimeout(() => cargar(), 0)
    return () => clearTimeout(inicio)
  }, [cargar])

  useEffect(() => {
    if (!subasta?.eventsUrl) return undefined

    return suscribirSubastaPublica({
      eventsUrl: subasta.eventsUrl,
      onSnapshot: (snapshot) => {
        setSubasta((actual) => ({ ...actual, ...snapshot }))
        setActualizadoEn(new Date().toISOString())
        setError('')
      },
      onError: () => {
        setError('No se pudo mantener la conexion en vivo. La ficha conserva la ultima informacion recibida.')
      },
    })
  }, [subasta?.eventsUrl])

  const ahorro = useMemo(() => {
    if (!subasta) return 0
    return Math.max(0, Number(subasta.precioBase ?? 0) - Number(subasta.precioActual ?? 0))
  }, [subasta])

  if (cargando) return <Estado texto="Cargando ficha publica..." />
  if (error && !proceso) return <Alert variant="error">{error}</Alert>
  if (!proceso) return <Estado texto="Proceso publico no encontrado." />

  return (
    <section className="flex flex-col gap-24">
      <div className="hero" style={{ padding: '24px 32px' }}>
        <button className="btn btn--texto" onClick={() => navigate('/portal')}>
          Volver al portal
        </button>
        <div className="panel-header mt-12 mb-0">
          <div>
            <span className="hero__tag">Ficha publica del proceso</span>
            <h1 className="hero__title" style={{ fontSize: 34 }}>
              <code className="card__code">{proceso.codigo}</code>{' '}
              {proceso.titulo}
            </h1>
            <p className="hero__desc">{proceso.descripcion || 'Sin descripcion publica cargada.'}</p>
          </div>
          <span className={`badge ${ESTADO_BADGE[proceso.estado] ?? 'badge--off'}`}>
            {etiquetaEstado(proceso.estado)}
          </span>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="metric-grid">
        <MetricCard etiqueta="Organismo" valor={proceso.empresa} />
        <MetricCard etiqueta="Presupuesto estimado" valor={formatearPesos(proceso.presupuestoEstimado)} destacado />
        <MetricCard etiqueta="Publicado" valor={formatearFecha(proceso.publicadoEn ?? proceso.creadoEn)} />
      </div>

      <section className="form">
        <div className="panel-header">
          <div>
            <h2 className="panel-header__title">Datos del expediente</h2>
            <p className="panel-header__desc">Informacion visible para seguimiento ciudadano.</p>
          </div>
        </div>
        <div className="auditoria-datos">
          <Dato etiqueta="Codigo" valor={proceso.codigo} />
          <Dato etiqueta="Estado" valor={etiquetaEstado(proceso.estado)} />
          <Dato etiqueta="Creado" valor={formatearFecha(proceso.creadoEn)} />
          <Dato etiqueta="Cierre" valor={formatearFecha(proceso.cerradoEn)} />
          <Dato etiqueta="Hash de pliego" valor={proceso.especificacionesHash || 'No informado'} full />
        </div>
      </section>

      <section className="form">
        <div className="panel-header">
          <div>
            <h2 className="panel-header__title">Renglones publicados</h2>
            <p className="panel-header__desc">Bienes o servicios incluidos en el proceso.</p>
          </div>
        </div>
        {proceso.items.length === 0 ? (
          <Estado texto="No hay renglones publicados." />
        ) : (
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Descripcion</th>
                  <th>Cantidad</th>
                  <th>Precio unitario</th>
                  <th>Total estimado</th>
                </tr>
              </thead>
              <tbody>
                {proceso.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.descripcion}</td>
                    <td>{item.cantidad} {item.unidad}</td>
                    <td>{item.precioUnitarioEstimado ? formatearPesos(item.precioUnitarioEstimado) : 'Sin dato'}</td>
                    <td>{item.totalEstimado ? formatearPesos(item.totalEstimado) : 'Sin dato'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="form">
        <div className="panel-header">
          <div>
            <h2 className="panel-header__title">Subasta en vivo</h2>
            <p className="panel-header__desc">
              Actualizacion por SSE con precio actual, lances y ranking publico.
            </p>
          </div>
          {subasta && (
            <button
              className="btn btn--secundario"
              onClick={() => navigate(`/portal/subasta/${proceso.id}`)}
            >
              Ver pantalla de subasta
            </button>
          )}
        </div>
        {subasta ? (
          <div className="flex flex-col gap-16">
            <div className="metric-grid">
              <MetricCard etiqueta="Precio actual" valor={formatearPesos(subasta.precioActual)} destacado />
              <MetricCard etiqueta="Ahorro estimado" valor={formatearPesos(ahorro)} />
              <MetricCard etiqueta="Lances" valor={subasta.cantidadLances} />
              <MetricCard etiqueta="Ultima actualizacion" valor={formatearFechaHora(actualizadoEn)} />
            </div>
            {subasta.ranking?.length > 0 ? (
              <div className="flex flex-col gap-12">
                {subasta.ranking.map((item) => (
                  <article className="row-item" key={`${item.posicion}-${item.nombre}`}>
                    <div>
                      <code className="row-item__code">#{item.posicion}</code>
                      <h3 className="row-item__title">{item.nombre}</h3>
                      <p className="row-item__desc">{item.cantidadLances} lances</p>
                    </div>
                    <div className="text-right">
                      <span className="row-item__value">{formatearPesos(item.monto)}</span>
                      <small className="row-item__detail">{formatearFechaHora(item.ultimoLanceEn)}</small>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <Estado texto="Todavia no hay lances publicados." />
            )}
          </div>
        ) : (
          <Estado texto="Este proceso no tiene subasta publicada." />
        )}
      </section>

      <section className="form">
        <div className="panel-header">
          <div>
            <h2 className="panel-header__title">Resultados</h2>
            <p className="panel-header__desc">Adjudicaciones publicadas para este proceso.</p>
          </div>
        </div>
        {proceso.adjudicaciones.length === 0 ? (
          <Estado texto="Todavia no hay resultados adjudicados publicados." />
        ) : (
          <div className="flex flex-col gap-12">
            {proceso.adjudicaciones.map((adjudicacion) => (
              <article className="row-item" key={adjudicacion.id}>
                <div>
                  <code className="row-item__code">{formatearFecha(adjudicacion.adjudicadoEn)}</code>
                  <h3 className="row-item__title">{adjudicacion.proveedor}</h3>
                  <p className="row-item__desc">{adjudicacion.observaciones || 'Sin observaciones publicadas.'}</p>
                </div>
                <div className="text-right">
                  <span className="row-item__value">{formatearPesos(adjudicacion.monto)}</span>
                  <small className="row-item__detail">Monto adjudicado</small>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
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

function Dato({ etiqueta, valor, full = false }) {
  return (
    <div className={`auditoria-dato ${full ? 'auditoria-dato--full' : ''}`}>
      <span className="auditoria-dato__label">{etiqueta}</span>
      <span className="auditoria-dato__valor">{valor}</span>
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

function formatearFecha(fecha) {
  if (!fecha) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(fecha))
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
