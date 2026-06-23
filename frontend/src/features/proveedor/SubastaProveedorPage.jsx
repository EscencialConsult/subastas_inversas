import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth.js'
import { obtenerProveedorDeUsuario } from '../../api/proveedoresApi.js'
import {
  obtenerSubastaProveedor,
  realizarLance,
} from '../../api/proveedoresApi.js'

export function SubastaProveedorPage() {
  const { procesoId } = useParams()
  const { usuario } = useAuth()
  const navigate = useNavigate()

  const [subasta, setSubasta] = useState(null)
  const [proveedor, setProveedor] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [monto, setMonto] = useState('')
  const [accionando, setAccionando] = useState(false)
  const [restante, setRestante] = useState(null)
  const [ahora, setAhora] = useState(null)

  const cargandoRef = useRef(false)

  const cargar = useCallback(async () => {
    if (cargandoRef.current) return
    cargandoRef.current = true
    setError('')
    try {
      const p = await obtenerProveedorDeUsuario({ usuarioId: usuario.id })
      setProveedor(p)
      const s = await obtenerSubastaProveedor({ proveedorId: p.id, auctionId: procesoId })
      setSubasta(s)
      setMonto(s.precioActual.toString())
    } catch (err) {
      setError(err.message)
    } finally {
      cargandoRef.current = false
      setCargando(false)
    }
  }, [usuario.id, procesoId])

  useEffect(() => {
    cargar()
  }, [cargar])

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

  useEffect(() => {
    if (cargando || !subasta) return
    if (restante !== null && restante <= 0) return
    if (subasta.estado === 'Closed' || subasta.estado === 'Finalizada') return
    const intervalo = setInterval(() => {
      if (!proveedor) return
      obtenerSubastaProveedor({ proveedorId: proveedor.id, auctionId: procesoId })
        .then(setSubasta)
        .catch(() => {})
    }, 5000)
    return () => clearInterval(intervalo)
  }, [cargando, subasta, proveedor, procesoId, restante])

  const metricas = useMemo(() => {
    if (!subasta || restante === null) {
      return { cerrada: false, progreso: 0, mejor: 0, ahorro: 0 }
    }

    const inicio = new Date(subasta.inicioISO).getTime()
    const fin = new Date(subasta.finISO).getTime()
    const total = Math.max(1, fin - inicio)
    const transcurrido = Math.min(total, Math.max(0, (ahora ?? inicio) - inicio))

    return {
      cerrada: restante <= 0 || subasta.estado === 'Closed' || subasta.estado === 'Finalizada',
      progreso: Math.round((transcurrido / total) * 100),
      mejor: subasta.lances.length ? Math.min(...subasta.lances.map((l) => l.monto)) : subasta.precioBase,
      ahorro: Math.max(0, subasta.precioBase - (subasta.lances.length ? Math.min(...subasta.lances.map((l) => l.monto)) : subasta.precioBase)),
    }
  }, [subasta, restante, ahora])

  async function enviarLance(e) {
    e.preventDefault()
    if (!proveedor || !subasta) return
    const valor = parseFloat(monto)
    if (isNaN(valor) || valor <= 0) {
      setError('Ingresa un monto valido.')
      return
    }
    if (valor >= metricas.mejor) {
      setError(`Tu oferta debe ser menor a la mejor oferta actual (${formatearPesos(metricas.mejor)}).`)
      return
    }
    setAccionando(true)
    setError('')
    try {
      await realizarLance({
        tenantId: subasta.tenantId,
        auctionId: subasta.id,
        supplierId: proveedor.id,
        monto: valor,
      })
      const s = await obtenerSubastaProveedor({ proveedorId: proveedor.id, auctionId: procesoId })
      setSubasta(s)
      setMonto(s.precioActual.toString())
    } catch (err) {
      setError(err.message)
    } finally {
      setAccionando(false)
    }
  }

  if (cargando) return <p className="estado-cargando">Cargando subasta...</p>
  if (!subasta) {
    return (
      <section>
        <div className="alerta alerta--error">{error || 'Esta subasta no existe o no tienes acceso.'}</div>
        <button className="btn btn--texto" onClick={() => navigate('/proveedor')}>
          Volver a mi cuenta
        </button>
      </section>
    )
  }

  const lancesOrdenados = [...subasta.lances].reverse()
  const miMejorLance = proveedor
    ? Math.min(...subasta.lances.filter((l) => l.proveedor === proveedor?.razonSocial).map((l) => l.monto), Infinity)
    : Infinity
  const soyUltimoOfertante = lancesOrdenados.length > 0 && lancesOrdenados[0].proveedor === proveedor?.razonSocial

  return (
    <section className="subasta-monitor">
      <div className="subasta-hero">
        <div>
          <span className="subasta-hero__eyebrow">Subasta inversa</span>
          <h1>
            <code>{subasta.codigo}</code> {subasta.titulo}
          </h1>
        </div>
        <div className="subasta-hero__acciones">
          <button className="btn btn--texto" onClick={() => navigate('/proveedor')}>
            Volver
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
          <span className="subasta__label">Tu mejor lance</span>
          <span className="subasta__valor">
            {miMejorLance === Infinity ? '—' : formatearPesos(miMejorLance)}
          </span>
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
          <h2 className="form__titulo">Realizar lance</h2>

          {metricas.cerrada ? (
            <p className="form__seccion-ayuda">La subasta ya finalizo.</p>
          ) : soyUltimoOfertante ? (
            <p className="form__seccion-ayuda">
              Sos el ultimo ofertante. Debes esperar a que otro proveedor oferte antes de hacer un nuevo lance.
            </p>
          ) : (
            <form onSubmit={enviarLance} className="form__cuerpo">
              <div className="campo">
                <label className="campo__etiqueta">Monto de tu oferta</label>
                <div className="campo__input-group">
                  <span className="campo__prefijo">$</span>
                  <input
                    type="number"
                    className="campo__input"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    min={1}
                    step={0.01}
                    disabled={accionando}
                    required
                  />
                </div>
                {metricas.mejor > 0 && (
                  <p className="campo__ayuda">
                    Debe ser menor a {formatearPesos(metricas.mejor)}
                  </p>
                )}
              </div>
              <button
                type="submit"
                className="btn btn--primario"
                disabled={accionando}
                style={{ marginTop: 12 }}
              >
                {accionando ? 'Enviando...' : 'Ofertar'}
              </button>
            </form>
          )}
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
