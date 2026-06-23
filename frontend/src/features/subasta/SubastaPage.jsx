import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth.js'
import { obtenerProceso } from '../../api/comprasApi.js'
import {
  obtenerSubastaDeProceso,
  simularLance,
  cerrarSubasta,
  mejorOferta,
} from '../../api/subastasApi.js'

export function SubastaPage() {
  const { procesoId } = useParams()
  const { tenantId } = useAuth()
  const navigate = useNavigate()

  const [proceso, setProceso] = useState(null)
  const [subasta, setSubasta] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [accionando, setAccionando] = useState(false)
  const [error, setError] = useState('')
  const [restante, setRestante] = useState(null)
  const [ahora, setAhora] = useState(null)

  async function cargar() {
    setError('')
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
    const cierre = new Date(subasta.finISO).getTime()
    const tick = () => {
      const ahoraMs = Date.now()
      setAhora(ahoraMs)
      setRestante(cierre - ahoraMs)
    }
    tick()
    const intervalo = setInterval(tick, 1000)
    return () => clearInterval(intervalo)
  }, [subasta])

  const metricas = useMemo(() => {
    if (!subasta || restante === null) {
      return { cerrada: false, progreso: 0, mejor: 0, ahorro: 0 }
    }

    const inicio = new Date(subasta.inicioISO).getTime()
    const fin = new Date(subasta.finISO).getTime()
    const total = Math.max(1, fin - inicio)
    const transcurrido = Math.min(total, Math.max(0, (ahora ?? inicio) - inicio))
    const mejor = mejorOferta(subasta)

    return {
      cerrada: restante <= 0 || subasta.estado === 1 || subasta.estado === 'Closed',
      progreso: Math.round((transcurrido / total) * 100),
      mejor,
      ahorro: Math.max(0, subasta.precioBase - mejor),
    }
  }, [subasta, restante, ahora])

  async function nuevoLance() {
    setAccionando(true)
    setError('')
    try {
      const s = await simularLance({ tenantId, procesoId })
      setSubasta(s)
    } catch (err) {
      setError(err.message)
    } finally {
      setAccionando(false)
    }
  }

  async function cerrar() {
    setAccionando(true)
    setError('')
    try {
      await cerrarSubasta({ tenantId, procesoId })
      await cargar()
    } catch (err) {
      setError(err.message)
    } finally {
      setAccionando(false)
    }
  }

  if (cargando) return <p className="estado-cargando">Cargando subasta...</p>
  if (!subasta || !proceso) {
    return (
      <section>
        <div className="alerta alerta--error">{error || 'Esta subasta no existe.'}</div>
        <button className="btn btn--texto" onClick={() => navigate('/compras')}>
          Volver a compras
        </button>
      </section>
    )
  }

  const lancesOrdenados = [...subasta.lances].reverse()

  return (
    <section className="subasta-monitor">
      <div className="subasta-hero">
        <div>
          <span className="subasta-hero__eyebrow">Monitor de subasta inversa</span>
          <h1>
            <code>{proceso.codigo}</code> {proceso.titulo}
          </h1>
          <p>{proceso.descripcion || 'Sin descripcion cargada.'}</p>
        </div>
        <div className="subasta-hero__acciones">
          <button className="btn btn--texto" onClick={() => navigate('/compras')}>
            Volver
          </button>
          <button className="btn btn--primario" onClick={cerrar} disabled={accionando || metricas.cerrada}>
            Cerrar subasta
          </button>
        </div>
      </div>

      {error && <div className="alerta alerta--error">{error}</div>}

      <div className={`subasta-reloj ${metricas.cerrada ? 'subasta-reloj--cerrada' : ''}`}>
        <div>
          <span className="subasta__label">Tiempo restante</span>
          <strong>{metricas.cerrada ? 'Finalizada' : formatearTiempo(restante)}</strong>
          <div className="subasta-progreso">
            <span style={{ width: `${metricas.progreso}%` }} />
          </div>
        </div>
        <div className="subasta-reloj__estado">
          <span className={`badge ${metricas.cerrada ? 'badge--off' : 'badge--ok'}`}>
            {metricas.cerrada ? 'Cerrada' : 'Abierta'}
          </span>
        </div>
      </div>

      <div className="subasta__panel">
        <div className="subasta__card subasta__card--destacada">
          <span className="subasta__label">Mejor oferta actual</span>
          <span className="subasta__valor subasta__valor--destacado">
            {formatearPesos(metricas.mejor)}
          </span>
        </div>
        <div className="subasta__card">
          <span className="subasta__label">Presupuesto base</span>
          <span className="subasta__valor">{formatearPesos(subasta.precioBase)}</span>
        </div>
        <div className="subasta__card">
          <span className="subasta__label">Ahorro actual</span>
          <span className="subasta__valor">{formatearPesos(metricas.ahorro)}</span>
        </div>
        <div className="subasta__card">
          <span className="subasta__label">Decremento minimo</span>
          <span className="subasta__valor">{subasta.decrementoMinimo}%</span>
        </div>
      </div>

      <div className="subasta-grid">
        <div className="form">
          <div className="encabezado">
            <h2 className="form__titulo">Lances ({subasta.lances.length})</h2>
            <button className="btn btn--primario" onClick={nuevoLance} disabled={accionando || metricas.cerrada}>
              Simular lance
            </button>
          </div>

          {lancesOrdenados.length === 0 ? (
            <div className="estado-vacio">Todavia no hay lances.</div>
          ) : (
            <table className="tabla">
              <thead>
                <tr>
                  <th>Proveedor</th>
                  <th>Monto</th>
                  <th>Cuando</th>
                </tr>
              </thead>
              <tbody>
                {lancesOrdenados.map((l, index) => (
                  <tr key={l.id}>
                    <td>
                      {index === 0 && <span className="badge badge--ok">Mejor</span>} {l.proveedor}
                    </td>
                    <td>{formatearPesos(l.monto)}</td>
                    <td>{l.hace}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <aside className="form">
          <h2 className="form__titulo">Datos operativos</h2>
          <div className="perfil__solo-lectura">
            <span>Participantes: {subasta.participantes.length}</span>
            <span>Inicio: {formatearFecha(subasta.inicioISO)}</span>
            <span>Cierre: {formatearFecha(subasta.finISO)}</span>
            <span>Duracion: {subasta.duracionMin} min</span>
          </div>
          <p className="form__seccion-ayuda">
            Para ofertar en una subasta real, el proveedor debe estar invitado al proceso.
            El boton de simular lance usa el primer proveedor invitado para probar el flujo.
          </p>
        </aside>
      </div>
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

function formatearFecha(fechaIso) {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(fechaIso))
}
