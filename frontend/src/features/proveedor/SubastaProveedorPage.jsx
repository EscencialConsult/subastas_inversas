import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import {
  ArrowLeft, TrendingDown, Trophy, Clock, BarChart3,
  MousePointerClick, Send,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth.js'
import { obtenerProveedorDeUsuario } from '../../api/proveedoresApi.js'
import {
  obtenerSubastaProveedor,
  realizarLance,
} from '../../api/proveedoresApi.js'
import { formatearPesos, formatearTiempo } from '../../utils/formatear.js'

export function SubastaProveedorPage() {
  const { auctionId } = useParams()
  const procesoId = auctionId
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
  const voyGanando = miMejorLance === metricas.mejor && miMejorLance !== Infinity

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
            <ArrowLeft size={16} /> Volver
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
          <span className="subasta__label">
            <Trophy size={14} /> Mejor oferta actual
          </span>
          <span className="subasta__valor subasta__valor--destacado">
            {formatearPesos(metricas.mejor)}
          </span>
        </div>
        <div className="subasta__card">
          <span className="subasta__label">
            <TrendingDown size={14} /> Presupuesto base
          </span>
          <span className="subasta__valor">{formatearPesos(subasta.precioBase)}</span>
        </div>
        <div className={`subasta__card ${voyGanando ? 'subasta__card--destacada' : ''}`}>
          <span className="subasta__label">
            <Trophy size={14} /> Tu mejor lance
          </span>
          <span className="subasta__valor">
            {miMejorLance === Infinity ? '—' : formatearPesos(miMejorLance)}
          </span>
          {voyGanando && (
            <span className="badge badge--ok mt-1 self-start">
              <Trophy size={12} /> Vas ganando
            </span>
          )}
        </div>
        <div className="subasta__card">
          <span className="subasta__label">Decremento mínimo</span>
          <span className="subasta__valor">{subasta.decrementoMinimo}%</span>
        </div>
      </div>

      <div className="subasta-grid">
        <div className="perfil__seccion">
          <div className="perfil__seccion-header">
            <span className="perfil__seccion-icon">
              <BarChart3 size={18} />
            </span>
            <div>
              <h2>Lances ({subasta.lances.length})</h2>
              <p>Historial de ofertas en orden descendente</p>
            </div>
          </div>
          <div className="perfil__cuerpo">
            {lancesOrdenados.length === 0 ? (
              <div className="subastas-prov__lances-empty">
                <span><MousePointerClick size={22} /></span>
                <p>Todavía no hay lances. Sé el primero en ofertar.</p>
              </div>
            ) : (
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Proveedor</th>
                    <th>Monto</th>
                    <th>Cuándo</th>
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
        </div>

        <aside className="perfil__seccion">
          <div className="perfil__seccion-header">
            <span className="perfil__seccion-icon">
              <Send size={18} />
            </span>
            <div>
              <h2>Realizar lance</h2>
              <p>Ingresá un monto menor a la mejor oferta</p>
            </div>
          </div>
          <div className="perfil__cuerpo">
            {metricas.cerrada ? (
              <p className="form__seccion-ayuda">La subasta ya finalizó.</p>
            ) : soyUltimoOfertante ? (
              <p className="form__seccion-ayuda">
                Sos el último ofertante. Debés esperar a que otro proveedor oferte antes de hacer un nuevo lance.
              </p>
            ) : (
              <form onSubmit={enviarLance} className="flex flex-col gap-4">
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
                >
                  {accionando ? 'Enviando...' : 'Ofertar'}
                </button>
              </form>
            )}
          </div>
        </aside>
      </div>
    </section>
  )
}
