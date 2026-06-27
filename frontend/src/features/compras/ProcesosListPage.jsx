// Listado de procesos de compra del tenant. Entrada principal del comprador.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext.jsx'
import { listarProcesos, publicarProceso } from '../../api/comprasApi.js'
import { iniciarSubasta } from '../../api/subastasApi.js'
import {
  ESTADO_PROCESO,
  ESTADO_INFO,
  etiquetaEstado,
  claseEstado,
  esEditable,
} from '../../domain/compras.js'

export function ProcesosListPage() {
  const { tenantId } = useAuth()
  const navigate = useNavigate()

  const [procesos, setProcesos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState('')

  async function cargar() {
    setCargando(true)
    setError('')
    try {
      const lista = await listarProcesos({ tenantId, busqueda, estado })
      setProcesos(lista)
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(cargar, 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, busqueda, estado])

  async function publicar(proceso) {
    try {
      await publicarProceso({ tenantId, id: proceso.id })
      cargar()
    } catch (err) {
      setError(err.message)
    }
  }

  const [procesoParaConfigurar, setProcesoParaConfigurar] = useState(null)
  const [basePrice, setBasePrice] = useState('')
  const [minDecrement, setMinDecrement] = useState('1')
  const [startsAt, setStartsAt] = useState('')
  const [duration, setDuration] = useState('10')
  const [extension, setExtension] = useState('3')
  const [pabThreshold, setPabThreshold] = useState('')
  const [configCargando, setConfigCargando] = useState(false)
  const [ahoraMs, setAhoraMs] = useState(() => Date.now())

  useEffect(() => {
    if (!procesoParaConfigurar) return undefined
    const intervalo = setInterval(() => setAhoraMs(Date.now()), 1000)
    return () => clearInterval(intervalo)
  }, [procesoParaConfigurar])

  function abrirConfiguracion(proceso) {
    setProcesoParaConfigurar(proceso)
    setBasePrice(proceso.presupuestoEstimado || '')
    setMinDecrement('1')
    setAhoraMs(Date.now())
    
    const localNow = new Date()
    localNow.setMinutes(localNow.getMinutes() - localNow.getTimezoneOffset())
    setStartsAt(localNow.toISOString().slice(0, 16))
    
    setDuration('10')
    setExtension('3')
    setPabThreshold(proceso.presupuestoEstimado ? Math.round(proceso.presupuestoEstimado * 0.7).toString() : '')
  }

  async function handleConfirmarInicio() {
    if (!basePrice || Number(basePrice) <= 0) {
      alert('El precio base debe ser mayor a cero.')
      return
    }
    if (Number(minDecrement) < 0 || Number(minDecrement) > 100) {
      alert('El decremento debe estar entre 0 y 100.')
      return
    }
    if (Number(duration) <= 0) {
      alert('La duración debe ser mayor a cero.')
      return
    }
    if (Number(extension) < 0) {
      alert('La extensión no puede ser negativa.')
      return
    }
    if (Number(pabThreshold) < 0) {
      alert('El umbral PAB no puede ser negativo.')
      return
    }

    setConfigCargando(true)
    try {
      const startsAtDate = new Date(startsAt)
      await iniciarSubasta({
        tenantId,
        procesoId: procesoParaConfigurar.id,
        basePrice,
        minimumDecrementPercentage: minDecrement,
        startsAtUtc: startsAtDate.toISOString(),
        durationMinutes: duration,
        autoExtensionMinutes: extension,
        pabThreshold,
      })
      setProcesoParaConfigurar(null)
      navigate(`/subasta/${procesoParaConfigurar.id}`)
    } catch (err) {
      alert(err.message)
    } finally {
      setConfigCargando(false)
    }
  }

  const subastaEsFutura = startsAt ? new Date(startsAt).getTime() > ahoraMs : false

  return (
    <section>
      <div className="encabezado">
        <h1>Procesos de compra</h1>
        <button className="btn btn--primario" onClick={() => navigate('/compras/nuevo')}>
          + Nuevo proceso
        </button>
      </div>

      <div className="filtros">
        <input
          className="filtros__busqueda"
          placeholder="Buscar por código o título…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {Object.entries(ESTADO_INFO).map(([clave, info]) => (
            <option key={clave} value={clave}>
              {info.label}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="alerta alerta--error">{error}</div>}

      {cargando ? (
        <p className="estado-cargando">Cargando procesos…</p>
      ) : procesos.length === 0 ? (
        <div className="estado-vacio">
          <p>No hay procesos de compra que coincidan con el filtro.</p>
        </div>
      ) : (
        <table className="tabla">
          <thead>
            <tr>
              <th>Código</th>
              <th>Título</th>
              <th>Presupuesto est.</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {procesos.map((p) => (
              <tr key={p.id}>
                <td>
                  <code>{p.codigo}</code>
                </td>
                <td>{p.titulo}</td>
                <td>{formatearPesos(p.presupuestoEstimado)}</td>
                <td>
                  <span className={`badge ${claseEstado(p.estado)}`}>
                    {etiquetaEstado(p.estado)}
                  </span>
                </td>
                <td className="tabla__acciones">
                  <button
                    className="btn btn--texto"
                    onClick={() => navigate(`/compras/${p.id}`)}
                  >
                    {esEditable(p.estado) ? 'Editar' : 'Ver'}
                  </button>
                  {esEditable(p.estado) && (
                    <button className="btn btn--texto" onClick={() => publicar(p)}>
                      Publicar
                    </button>
                  )}
                  {p.estado === ESTADO_PROCESO.PUBLICADO && !p.tieneSubasta && (
                    p.isEvaluationActSigned ? (
                      <button className="btn btn--texto" onClick={() => abrirConfiguracion(p)}>
                        Programar subasta
                      </button>
                    ) : (
                      <button
                        className="btn btn--texto"
                        style={{ color: '#e11d48', fontWeight: 'bold' }}
                        onClick={() => navigate(`/calificacion/${p.id}`)}
                        title="Debe firmar el acta de evaluación antes de iniciar la subasta."
                      >
                        ⚠️ Firmar Acta
                      </button>
                    )
                  )}
                  {p.tieneSubasta && (
                    <button
                      className="btn btn--texto"
                      onClick={() => navigate(`/subasta/${p.id}`)}
                    >
                      Ver subasta
                    </button>
                  )}
                  {p.estado === ESTADO_PROCESO.CERRADA && p.tieneSubasta && (
                    <button
                      className="btn btn--texto"
                      onClick={() => navigate(`/compras/${p.id}/adjudicar`)}
                    >
                      Adjudicar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {procesoParaConfigurar && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '550px' }}>
            <div className="modal__header">
              <h2>⚙️ Configurar Subasta Inversa</h2>
              <p className="form__seccion-ayuda" style={{ marginTop: '5px' }}>
                Establezca los parámetros de la subasta para el proceso <strong>{procesoParaConfigurar.codigo}</strong>:
              </p>
            </div>
            
            <div className="modal__body" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div className="form__grupo">
                <label className="form__label">Precio Base (ARS)</label>
                <input
                  type="number"
                  className="form__control"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  placeholder="Ingrese el precio base"
                  min="1"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form__grupo">
                  <label className="form__label">Decremento Mínimo (%)</label>
                  <input
                    type="number"
                    className="form__control"
                    value={minDecrement}
                    onChange={(e) => setMinDecrement(e.target.value)}
                    min="0"
                    max="100"
                    step="0.1"
                    required
                  />
                </div>
                <div className="form__grupo">
                  <label className="form__label">Umbral PAB (ARS)</label>
                  <input
                    type="number"
                    className="form__control"
                    value={pabThreshold}
                    onChange={(e) => setPabThreshold(e.target.value)}
                    placeholder="Umbral de precio anormalmente bajo"
                    min="0"
                  />
                  <small className="texto-muted" style={{ fontSize: '11px', marginTop: '2px', display: 'block' }}>
                    Ofertas bajo este monto serán marcadas como PAB.
                  </small>
                </div>
              </div>

              <div className="form__grupo">
                <label className="form__label">Fecha y Hora de Inicio (Local)</label>
                <input
                  type="datetime-local"
                  className="form__control"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form__grupo">
                  <label className="form__label">Duración (minutos)</label>
                  <input
                    type="number"
                    className="form__control"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    min="1"
                    required
                  />
                </div>
                <div className="form__grupo">
                  <label className="form__label">Extensión Automática (minutos)</label>
                  <input
                    type="number"
                    className="form__control"
                    value={extension}
                    onChange={(e) => setExtension(e.target.value)}
                    min="0"
                    required
                  />
                  <small className="texto-muted" style={{ fontSize: '11px', marginTop: '2px', display: 'block' }}>
                    Extiende la subasta si se oferta al final.
                  </small>
                </div>
              </div>
            </div>

            <div className="modal__footer" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                className="btn btn--texto"
                onClick={() => setProcesoParaConfigurar(null)}
                disabled={configCargando}
              >
                Cancelar
              </button>
              <button
                className="btn btn--primario"
                onClick={handleConfirmarInicio}
                disabled={configCargando}
              >
                {configCargando ? 'Guardando...' : subastaEsFutura ? 'Programar subasta' : 'Iniciar subasta'}
              </button>
            </div>
          </div>
        </div>
      )}
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
