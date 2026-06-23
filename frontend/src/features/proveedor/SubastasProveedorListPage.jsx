import { useEffect, useMemo, useState } from 'react'
import {
  Play, Flag, Search, X, Eye, ArrowRight, BarChart3,
  TrendingDown, Clock, Trophy,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth.js'
import { formatearPesos, formatearFecha, formatearTiempo } from '../../utils/formatear.js'
import { obtenerProveedorDeUsuario, listarSubastasProveedor } from '../../api/proveedoresApi.js'

export function SubastasProveedorListPage() {
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const [subastas, setSubastas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [seleccionada, setSeleccionada] = useState(null)
  const [ahora, setAhora] = useState(() => Date.now())
  const [busqueda, setBusqueda] = useState('')
  const [proveedor, setProveedor] = useState(null)

  useEffect(() => {
    obtenerProveedorDeUsuario({ usuarioId: usuario.id })
      .then((p) => {
        setProveedor(p)
        return listarSubastasProveedor({ proveedorId: p.id })
      })
      .then(setSubastas)
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false))
  }, [usuario.id])

  useEffect(() => {
    const intervalo = setInterval(() => setAhora(Date.now()), 1000)
    return () => clearInterval(intervalo)
  }, [])

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return subastas
    return subastas.filter(
      (s) =>
        s.titulo.toLowerCase().includes(q) ||
        s.codigo.toLowerCase().includes(q),
    )
  }, [subastas, busqueda])

  function vencida(s) {
    return s.estado === 'Closed' || s.estado === 'Finalizada' || new Date(s.finISO).getTime() <= ahora
  }

  if (cargando) return <p className="estado-cargando">Cargando subastas...</p>
  if (error) return <div className="alerta alerta--error">{error}</div>

  const activas = subastas.filter((s) => !vencida(s))
  const finalizadas = subastas.filter((s) => vencida(s))
  const activasFiltradas = filtradas.filter((s) => !vencida(s))
  const finalizadasFiltradas = filtradas.filter((s) => vencida(s))

  const ganadas = proveedor
    ? finalizadas.filter((s) => {
        if (!s.lances?.length) return false
        const mejorGlobal = Math.min(...s.lances.map((l) => l.monto))
        const misLances = s.lances.filter((l) => l.proveedor === proveedor.razonSocial)
        if (!misLances.length) return false
        const miMejor = Math.min(...misLances.map((l) => l.monto))
        return miMejor === mejorGlobal
      }).length
    : 0

  return (
    <section className="form-pagina">
      <div className="encabezado">
        <div>
          <span className="pagina-eyebrow">Proveedor</span>
          <h1>Subastas</h1>
          <p className="pagina-descripcion">
            Participá en subastas inversas de los organismos compradores.
          </p>
        </div>
      </div>

      {error && <div className="alerta alerta--error">{error}</div>}

      <div className="subastas-prov__metricas">
        <div className="subastas-prov__metrica">
          <span><BarChart3 size={16} /></span>
          <small>Total</small>
          <strong>{subastas.length}</strong>
        </div>
        <div className="subastas-prov__metrica subastas-prov__metrica--ok">
          <span><Play size={16} /></span>
          <small>Activas</small>
          <strong>{activas.length}</strong>
        </div>
        <div className="subastas-prov__metrica subastas-prov__metrica--off">
          <span><Flag size={16} /></span>
          <small>Finalizadas</small>
          <strong>{finalizadas.length}</strong>
        </div>
        <div className="subastas-prov__metrica subastas-prov__metrica--gold">
          <span><Trophy size={16} /></span>
          <small>Ganadas</small>
          <strong>{ganadas}</strong>
        </div>

      </div>

      <label className="subastas-prov__search">
        <Search size={18} />
        <input
          placeholder="Buscar por título o código..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        {busqueda && (
          <button className="subastas-prov__search-clear" onClick={() => setBusqueda('')}>
            <X size={16} />
          </button>
        )}
      </label>

      {filtradas.length === 0 ? (
        <div className="subastas-prov__empty">
          <span><GantChart size={26} /></span>
          <h2>{busqueda ? 'Sin resultados' : 'Sin subastas'}</h2>
          <p>
            {busqueda
              ? 'No encontramos subastas que coincidan con tu búsqueda.'
              : 'No tenés subastas activas en este momento.'}
          </p>
        </div>
      ) : (
        <>
          {activasFiltradas.length > 0 && (
            <div className="perfil__seccion">
              <div className="perfil__seccion-header">
                <span className="perfil__seccion-icon">
                  <Play size={18} />
                </span>
                <div>
                  <h2>Subastas activas</h2>
                  <p>Podés participar mientras estén abiertas</p>
                </div>
              </div>
              <div className="perfil__cuerpo">
                <TablaSubastas
                  subastas={activasFiltradas}
                  activas
                  ahora={ahora}
                  onVer={setSeleccionada}
                  onParticipar={(s) => navigate(`/proveedor/subasta/${s.id}`)}
                />
              </div>
            </div>
          )}

          {finalizadasFiltradas.length > 0 && (
            <div className="perfil__seccion mt-6">
              <div className="perfil__seccion-header">
                <span className="perfil__seccion-icon">
                  <Flag size={18} />
                </span>
                <div>
                  <h2>Subastas finalizadas</h2>
                  <p>Consultá los resultados de subastas cerradas</p>
                </div>
              </div>
              <div className="perfil__cuerpo">
                <TablaSubastas
                  subastas={finalizadasFiltradas}
                  activas={false}
                  ahora={ahora}
                  onVer={setSeleccionada}
                />
              </div>
            </div>
          )}
        </>
      )}

      {seleccionada && (
        <ModalDetalle
          subasta={seleccionada}
          ahora={ahora}
          onCerrar={() => setSeleccionada(null)}
          onParticipar={() => {
            const id = seleccionada.id
            setSeleccionada(null)
            navigate(`/proveedor/subasta/${id}`)
          }}
        />
      )}
    </section>
  )
}

function TablaSubastas({ subastas, activas, ahora, onVer, onParticipar }) {
  return (
    <table className="tabla">
      <thead>
        <tr>
          <th>Proceso</th>
          <th>Código</th>
          <th>Presupuesto</th>
          <th>Mejor oferta</th>
          {activas && <th>Cierre</th>}
          <th>Estado</th>
          <th>Acción</th>
        </tr>
      </thead>
      <tbody>
        {subastas.map((s) => (
          <tr key={s.id} className="tabla__fila--clickeable" onClick={() => onVer(s)}>
            <td className="font-semibold text-slate-900">{s.titulo}</td>
            <td><code>{s.codigo}</code></td>
            <td>{formatearPesos(s.precioBase)}</td>
            <td className="font-semibold text-emerald-700">{formatearPesos(s.precioActual)}</td>
            {activas && <td className="text-sm text-slate-500">{formatearFecha(s.finISO)}</td>}
            <td>
              <span className={`badge ${activas ? 'badge--ok' : 'badge--off'}`}>
                {activas ? 'Abierta' : 'Cerrada'}
              </span>
            </td>
            <td>
              <div className="subastas-prov__acciones">
                <button
                  className="btn btn--texto btn--sm"
                  onClick={(e) => { e.stopPropagation(); onVer(s) }}
                >
                  <Eye size={14} /> Ver
                </button>
                {activas && onParticipar && (
                  <button
                    className="btn btn--primario btn--sm"
                    onClick={(e) => { e.stopPropagation(); onParticipar(s) }}
                  >
                    <ArrowRight size={14} /> Participar
                  </button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ModalDetalle({ subasta, ahora, onCerrar, onParticipar }) {
  const esAbierta = !(
    subasta.estado === 'Closed' ||
    subasta.estado === 'Finalizada' ||
    new Date(subasta.finISO).getTime() <= ahora
  )
  const [restante, setRestante] = useState(null)

  useEffect(() => {
    if (!esAbierta) return
    const cierre = new Date(subasta.finISO).getTime()
    const tick = () => setRestante(cierre - Date.now())
    tick()
    const intervalo = setInterval(tick, 1000)
    return () => clearInterval(intervalo)
  }, [subasta.finISO, esAbierta])

  const lancesOrdenados = [...(subasta.lances ?? [])].reverse()

  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__titulo">{subasta.titulo}</h2>
          <span className="modal__codigo"><code>{subasta.codigo}</code></span>
          <button className="modal__cerrar" onClick={onCerrar}>
            <X size={20} />
          </button>
        </div>

        <div className="modal__cuerpo">
          <div className="subasta__panel">
            <div className="subasta__card subasta__card--destacada">
              <span className="subasta__label">
                <Trophy size={14} /> Mejor oferta
              </span>
              <span className="subasta__valor subasta__valor--destacado">
                {formatearPesos(subasta.precioActual)}
              </span>
            </div>
            <div className="subasta__card">
              <span className="subasta__label">Presupuesto base</span>
              <span className="subasta__valor">{formatearPesos(subasta.precioBase)}</span>
            </div>
            <div className="subasta__card">
              <span className="subasta__label">
                <TrendingDown size={14} /> Decremento mínimo
              </span>
              <span className="subasta__valor">{subasta.decrementoMinimo}%</span>
            </div>
            <div className="subasta__card">
              <span className="subasta__label">Estado</span>
              <span className={`badge ${esAbierta ? 'badge--ok' : 'badge--off'}`}>
                {esAbierta ? 'Abierta' : 'Finalizada'}
              </span>
            </div>
          </div>

          <div className="subastas-prov__modal-info">
            <div className="subastas-prov__modal-info-item">
              <span className="subastas-prov__modal-info-label">Inicio</span>
              <span>{formatearFecha(subasta.inicioISO)}</span>
            </div>
            <div className="subastas-prov__modal-info-item">
              <span className="subastas-prov__modal-info-label">Cierre</span>
              <span>
                {formatearFecha(subasta.finISO)}
                {esAbierta && restante !== null && restante > 0 && (
                  <span className="subastas-prov__modal-restante">
                    ({formatearTiempo(restante)} restantes)
                  </span>
                )}
              </span>
            </div>
            <div className="subastas-prov__modal-info-item">
              <span className="subastas-prov__modal-info-label">Participantes</span>
              <span>{subasta.participantes?.length ?? 0}</span>
            </div>
          </div>

          <div className="subastas-prov__modal-lances">
            <div className="subastas-prov__modal-lances-header">
              <Clock size={16} />
              <strong>Lances ({subasta.lances?.length ?? 0})</strong>
            </div>
            {lancesOrdenados.length === 0 ? (
              <div className="subastas-prov__lances-empty">
                <p>Todavía no hay lances.</p>
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

        <div className="modal__footer">
          <button className="btn btn--texto" onClick={onCerrar}>Cerrar</button>
          {esAbierta && (
            <button className="btn btn--primario" onClick={onParticipar}>
              <ArrowRight size={16} /> Participar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
