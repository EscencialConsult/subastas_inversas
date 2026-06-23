import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth.js'
import { obtenerProveedorDeUsuario, listarSubastasProveedor } from '../../api/proveedoresApi.js'

export function SubastasProveedorListPage() {
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const [proveedor, setProveedor] = useState(null)
  const [subastas, setSubastas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [seleccionada, setSeleccionada] = useState(null)

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

  function vencida(s) {
    return s.estado === 'Closed' || s.estado === 'Finalizada' || new Date(s.finISO).getTime() <= Date.now()
  }

  if (cargando) return <p className="estado-cargando">Cargando subastas...</p>
  if (error) return <div className="alerta alerta--error">{error}</div>

  const activas = subastas.filter((s) => !vencida(s))
  const finalizadas = subastas.filter((s) => vencida(s))

  return (
    <section className="form-pagina">
      <div className="encabezado">
        <h1>Subastas</h1>
      </div>

      {activas.length > 0 && (
        <div className="form">
          <h2 className="form__titulo">Subastas activas</h2>
          <table className="tabla">
            <thead>
              <tr>
                <th>Proceso</th>
                <th>Codigo</th>
                <th>Presupuesto</th>
                <th>Mejor oferta</th>
                <th>Cierre</th>
                <th>Estado</th>
                <th>Accion</th>
              </tr>
            </thead>
            <tbody>
              {activas.map((s) => (
                <tr key={s.id} className="tabla__fila--clickeable" onClick={() => setSeleccionada(s)}>
                  <td>{s.titulo}</td>
                  <td>{s.codigo}</td>
                  <td>{formatearPesos(s.precioBase)}</td>
                  <td>{formatearPesos(s.precioActual)}</td>
                  <td>{formatearFecha(s.finISO)}</td>
                  <td>
                    <span className="badge badge--ok">Abierta</span>
                  </td>
                  <td>
                    <button
                      className="btn btn--texto"
                      onClick={(e) => { e.stopPropagation(); setSeleccionada(s) }}
                      style={{ fontSize: 12, padding: '4px 10px' }}
                    >
                      Ver
                    </button>
                    <button
                      className="btn btn--primario"
                      onClick={(e) => { e.stopPropagation(); navigate(`/proveedor/subasta/${s.id}`) }}
                      style={{ fontSize: 12, padding: '4px 10px', marginLeft: 6 }}
                    >
                      Participar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {finalizadas.length > 0 && (
        <div className="form" style={{ marginTop: 20 }}>
          <h2 className="form__titulo">Subastas finalizadas</h2>
          <table className="tabla">
            <thead>
              <tr>
                <th>Proceso</th>
                <th>Codigo</th>
                <th>Presupuesto</th>
                <th>Mejor oferta</th>
                <th>Estado</th>
                <th>Accion</th>
              </tr>
            </thead>
            <tbody>
              {finalizadas.map((s) => (
                <tr key={s.id} className="tabla__fila--clickeable" onClick={() => setSeleccionada(s)}>
                  <td>{s.titulo}</td>
                  <td>{s.codigo}</td>
                  <td>{formatearPesos(s.precioBase)}</td>
                  <td>{formatearPesos(s.precioActual)}</td>
                  <td><span className="badge badge--off">Cerrada</span></td>
                  <td>
                    <button
                      className="btn btn--texto"
                      onClick={(e) => { e.stopPropagation(); setSeleccionada(s) }}
                      style={{ fontSize: 12, padding: '4px 10px' }}
                    >
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {subastas.length === 0 && (
        <div className="estado-vacio">
          <p>No tienes subastas activas en este momento.</p>
        </div>
      )}

      {seleccionada && (
        <ModalDetalle
          subasta={seleccionada}
          onCerrar={() => setSeleccionada(null)}
          onParticipar={() => {
            setSeleccionada(null)
            navigate(`/proveedor/subasta/${seleccionada.id}`)
          }}
        />
      )}
    </section>
  )
}

function ModalDetalle({ subasta, onCerrar, onParticipar }) {
  const esAbierta = !(subasta.estado === 'Closed' || subasta.estado === 'Finalizada' || new Date(subasta.finISO).getTime() <= Date.now())
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
          <button className="modal__cerrar" onClick={onCerrar}>&times;</button>
        </div>

        <div className="modal__cuerpo">
          <div className="subasta__panel" style={{ marginBottom: 16 }}>
            <div className="subasta__card subasta__card--destacada">
              <span className="subasta__label">Mejor oferta</span>
              <span className="subasta__valor subasta__valor--destacado">{formatearPesos(subasta.precioActual)}</span>
            </div>
            <div className="subasta__card">
              <span className="subasta__label">Presupuesto base</span>
              <span className="subasta__valor">{formatearPesos(subasta.precioBase)}</span>
            </div>
            <div className="subasta__card">
              <span className="subasta__label">Decremento minimo</span>
              <span className="subasta__valor">{subasta.decrementoMinimo}%</span>
            </div>
            <div className="subasta__card">
              <span className="subasta__label">Estado</span>
              <span className={`badge ${esAbierta ? 'badge--ok' : 'badge--off'}`}>
                {esAbierta ? 'Abierta' : 'Finalizada'}
              </span>
            </div>
          </div>

          <div className="modal__info">
            <div className="campo__etiqueta">Inicio</div>
            <div>{formatearFecha(subasta.inicioISO)}</div>
          </div>
          <div className="modal__info">
            <div className="campo__etiqueta">Cierre</div>
            <div>
              {formatearFecha(subasta.finISO)}
              {esAbierta && restante !== null && restante > 0 && (
                <span style={{ marginLeft: 8, fontWeight: 600 }}>
                  ({formatearTiempo(restante)} restantes)
                </span>
              )}
            </div>
          </div>
          <div className="modal__info">
            <div className="campo__etiqueta">Participantes</div>
            <div>{subasta.participantes?.length ?? 0}</div>
          </div>

          <h3 className="form__titulo" style={{ marginTop: 16, marginBottom: 8 }}>
            Lances ({subasta.lances?.length ?? 0})
          </h3>
          {lancesOrdenados.length === 0 ? (
            <p className="form__seccion-ayuda">Todavia no hay lances.</p>
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
                    <td>{index === 0 && <span className="badge badge--ok">Mejor</span>} {l.proveedor}</td>
                    <td>{formatearPesos(l.monto)}</td>
                    <td>{l.hace}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="modal__footer">
          <button className="btn btn--texto" onClick={onCerrar}>Cerrar</button>
          {esAbierta && (
            <button className="btn btn--primario" onClick={onParticipar}>Participar</button>
          )}
        </div>
      </div>
    </div>
  )
}

function formatearPesos(monto) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(monto)
}

function formatearFecha(fechaIso) {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(fechaIso))
}

function formatearTiempo(ms) {
  const total = Math.max(0, Math.floor((ms ?? 0) / 1000))
  const min = String(Math.floor(total / 60)).padStart(2, '0')
  const seg = String(total % 60).padStart(2, '0')
  return `${min}:${seg}`
}
