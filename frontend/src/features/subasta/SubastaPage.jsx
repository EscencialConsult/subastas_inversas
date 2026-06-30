// Monitor de subasta para el comprador.

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext.jsx'
import { obtenerProceso } from '../../api/comprasApi.js'
import {
  cerrarSubasta,
  mejorOferta,
  obtenerSubastaDeProceso,
  simularLance,
} from '../../api/subastasApi.js'

const ESTADO_SUBASTA = {
  Scheduled: { texto: 'Programada', clase: 'badge--info' },
  Open: { texto: 'Abierta', clase: 'badge--ok' },
  Closed: { texto: 'Cerrada', clase: 'badge--off' },
}

export function SubastaPage() {
  const { procesoId } = useParams()
  const { tenantId } = useAuth()
  const navigate = useNavigate()

  const [proceso, setProceso] = useState(null)
  const [subasta, setSubasta] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [restante, setRestante] = useState(null)
  const [ahoraMs, setAhoraMs] = useState(() => Date.now())

  async function cargar() {
    try {
      const [p, s] = await Promise.all([
        obtenerProceso({ tenantId, id: procesoId }),
        obtenerSubastaDeProceso({ tenantId, procesoId }),
      ])
      setProceso(p)
      setSubasta(s)
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(cargar, 0)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, procesoId])

  useEffect(() => {
    if (!subasta) return
    const inicio = new Date(subasta.inicioISO).getTime()
    const cierre = new Date(subasta.finISO).getTime()
    const tick = () => {
      const ahora = Date.now()
      setAhoraMs(ahora)
      setRestante(ahora < inicio ? inicio - ahora : cierre - ahora)
    }
    tick()
    const intervalo = setInterval(tick, 1000)
    return () => clearInterval(intervalo)
  }, [subasta])

  async function nuevoLance() {
    try {
      const s = await simularLance({ tenantId, procesoId })
      setSubasta(s)
    } catch (err) {
      setError(err.message)
    }
  }

  async function cerrar() {
    setError('')
    try {
      await cerrarSubasta({ tenantId, procesoId })
      navigate('/compras')
    } catch (err) {
      setError(err.message)
    }
  }

  if (cargando) return <p className="estado-cargando">Cargando subasta...</p>
  if (!subasta || !proceso) return <div className="alerta alerta--error">{error}</div>

  const inicio = new Date(subasta.inicioISO).getTime()
  const programada = subasta.estado === 'Scheduled' || ahoraMs < inicio
  const abierta = subasta.estado === 'Open' && !programada
  const cerrada = subasta.estado === 'Closed' || (!programada && restante !== null && restante <= 0)
  const estado = cerrada ? ESTADO_SUBASTA.Closed : programada ? ESTADO_SUBASTA.Scheduled : ESTADO_SUBASTA.Open
  const mejor = mejorOferta(subasta)
  const lancesOrdenados = [...subasta.lances].reverse()

  return (
    <section>
      <div className="alerta alerta--info">
        La apertura y el cierre se ejecutan automaticamente por el servidor.
      </div>

      {error && <div className="alerta alerta--error">{error}</div>}

      <div className="encabezado">
        <h1>
          Subasta - <code>{proceso.codigo}</code>
        </h1>
        <button className="btn btn--texto" onClick={() => navigate('/compras')}>
          Volver
        </button>
      </div>
      <p className="proceso__descripcion">{proceso.titulo}</p>

      <div className="subasta__panel">
        <div className="subasta__card">
          <span className="subasta__label">Estado</span>
          <span className={`badge ${estado.clase}`}>{estado.texto}</span>
        </div>
        <div className="subasta__card">
          <span className="subasta__label">Mejor oferta actual</span>
          <span className="subasta__valor subasta__valor--destacado">
            {formatearPesos(mejor)}
          </span>
        </div>
        <div className="subasta__card">
          <span className="subasta__label">Precio base</span>
          <span className="subasta__valor">{formatearPesos(subasta.precioBase)}</span>
        </div>
        <div className="subasta__card">
          <span className="subasta__label">{programada ? 'Inicia en' : 'Tiempo restante'}</span>
          <span className="subasta__valor">
            {cerrada ? 'Finalizada' : formatearTiempo(restante)}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginTop: '15px', marginBottom: '25px', background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }}>
        <div>
          <span className="texto-muted" style={{ fontWeight: '600' }}>Decremento requerido: </span>
          <strong>{subasta.decrementoMinimo}%</strong>
        </div>
        <div style={{ height: '16px', borderLeft: '1px solid #cbd5e1' }} />
        <div>
          <span className="texto-muted" style={{ fontWeight: '600' }}>Extension de ultimo minuto: </span>
          <strong>{subasta.autoExtensionMinutes} min</strong>
        </div>
        {subasta.pabThreshold > 0 && (
          <>
            <div style={{ height: '16px', borderLeft: '1px solid #cbd5e1' }} />
            <div>
              <span className="texto-muted" style={{ fontWeight: '600' }}>Umbral PAB: </span>
              <strong style={{ color: '#e11d48' }}>{formatearPesos(subasta.pabThreshold)}</strong>
            </div>
          </>
        )}
        <div style={{ height: '16px', borderLeft: '1px solid #cbd5e1' }} />
        <div>
          <span className="texto-muted" style={{ fontWeight: '600' }}>Inicio: </span>
          <strong>{new Date(subasta.inicioISO).toLocaleString()}</strong>
        </div>
        {subasta.actaCierreHash && (
          <>
            <div style={{ height: '16px', borderLeft: '1px solid #cbd5e1' }} />
            <div>
              <span className="texto-muted" style={{ fontWeight: '600' }}>Hash acta cierre: </span>
              <code title={subasta.actaCierreHash}>{subasta.actaCierreHash.slice(0, 12)}...</code>
            </div>
          </>
        )}
      </div>

      {cerrada && (
        <div className="form">
          <div className="encabezado">
            <div>
              <h2 className="form__titulo">Acta de cierre y cuadro comparativo</h2>
              <p className="form__seccion-ayuda">
                Ahorro obtenido: {formatearPesos(subasta.ahorroMonto)} ({Number(subasta.ahorroPorcentaje ?? 0).toFixed(2)}%)
              </p>
            </div>
            {subasta.actaCierreUrl && (
              <a className="btn btn--primario" href={subasta.actaCierreUrl} target="_blank" rel="noreferrer">
                Descargar acta
              </a>
            )}
          </div>
          <table className="tabla">
            <thead>
              <tr>
                <th>#</th>
                <th>Proveedor</th>
                <th>Mejor oferta</th>
                <th>Lances</th>
                <th>Ahorro</th>
              </tr>
            </thead>
            <tbody>
              {(subasta.cuadroComparativo ?? []).map((fila) => (
                <tr key={fila.proveedorId}>
                  <td>{fila.posicion}</td>
                  <td>{fila.proveedor}</td>
                  <td>{formatearPesos(fila.mejorMonto)}</td>
                  <td>{fila.cantidadLances}</td>
                  <td>{formatearPesos(fila.ahorroMonto)} ({Number(fila.ahorroPorcentaje ?? 0).toFixed(2)}%)</td>
                </tr>
              ))}
              {(subasta.cuadroComparativo ?? []).length === 0 && (
                <tr>
                  <td colSpan="5">No se registraron lances para comparar.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="encabezado">
        <h2 className="form__titulo">Lances ({subasta.lances.length})</h2>
        <div className="tabla__acciones">
          {abierta && !cerrada && (
            <button className="btn btn--texto" onClick={nuevoLance}>
              Simular lance de proveedor
            </button>
          )}
          {abierta && !cerrada && (
            <button className="btn btn--primario" onClick={cerrar}>
              Cerrar subasta y enviar a evaluacion
            </button>
          )}
          {programada && <span className="campo__ayuda">La subasta se abrira automaticamente.</span>}
        </div>
      </div>

      <table className="tabla">
        <thead>
          <tr>
            <th>Proveedor</th>
            <th>Monto</th>
            <th>Cuando</th>
          </tr>
        </thead>
        <tbody>
          {lancesOrdenados.map((l) => (
            <tr key={l.id}>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{l.proveedor}</span>
                  {l.isPab && (
                    <span
                      className="badge badge--error"
                      style={{ fontSize: '10px', padding: '1px 6px', fontWeight: 'bold' }}
                      title="Esta oferta esta por debajo del umbral de Precio Anormalmente Bajo (PAB)"
                    >
                      PAB
                    </span>
                  )}
                </div>
              </td>
              <td>
                <span style={{ color: l.isPab ? '#e11d48' : 'inherit', fontWeight: l.isPab ? 'bold' : 'normal' }}>
                  {formatearPesos(l.monto)}
                </span>
              </td>
              <td>{l.hace}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

function formatearPesos(monto) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(monto)
}

function formatearTiempo(ms) {
  const total = Math.max(0, Math.floor((ms ?? 0) / 1000))
  const min = String(Math.floor(total / 60)).padStart(2, '0')
  const seg = String(total % 60).padStart(2, '0')
  return `${min}:${seg}`
}
