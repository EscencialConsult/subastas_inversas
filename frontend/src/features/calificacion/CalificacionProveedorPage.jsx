import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext.jsx'
import { obtenerProcesoParaEvaluacion, obtenerProveedoresDeProceso, calificarProveedor } from '../../api/comprasApi.js'

const CLASE_CALIFICACION = {
  pendiente: 'badge--info',
  aprobado: 'badge--ok',
  observado: 'badge--advertencia',
  rechazado: 'badge--error',
}

const ETIQUETA_CALIFICACION = {
  pendiente: 'Pendiente',
  aprobado: 'Aprobado',
  observado: 'Observado',
  rechazado: 'Rechazado',
}

export function CalificacionProveedorPage() {
  const { tenantId, usuario } = useAuth()
  const { id: procesoId, invitationId } = useParams()
  const navigate = useNavigate()

  const [proceso, setProceso] = useState(null)
  const [proveedor, setProveedor] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')

  const [estadoSeleccionado, setEstadoSeleccionado] = useState('')
  const [fundamento, setFundamento] = useState('')

  function irAtras() {
    navigate(`/calificacion/${procesoId}`)
  }

  async function cargar() {
    setCargando(true)
    setError('')
    try {
      const [p, proveedoresData] = await Promise.all([
        obtenerProcesoParaEvaluacion({ tenantId, id: procesoId }),
        obtenerProveedoresDeProceso({ tenantId, procesoId }),
      ])
      setProceso(p)
      const prov = proveedoresData.find(s => s.invitationId === invitationId)
      if (!prov) {
        setError('Proveedor no encontrado en este proceso.')
      } else {
        setProveedor(prov)
        if (prov.calificacion && prov.calificacion.estado !== 'pendiente') {
          setEstadoSeleccionado(ESTADOS_REVERSE[prov.calificacion.estado] ?? '')
          setFundamento(prov.calificacion.notas ?? '')
        }
      }
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
  }, [tenantId, procesoId, invitationId])

  async function handleGuardar() {
    if (!estadoSeleccionado) {
      setError('Debe seleccionar un estado de calificación.')
      return
    }

    setGuardando(true)
    setError('')
    setExito('')
    try {
      const result = await calificarProveedor({
        tenantId,
        procesoId,
        invitationId,
        evaluatorId: usuario.id,
        qualificationStatus: estadoSeleccionado,
        notes: fundamento.trim() || null,
      })
      setProveedor(prev => ({
        ...prev,
        calificacion: result.calificacion,
      }))
      setExito(`Proveedor calificado como "${ETIQUETA_CALIFICACION[result.calificacion.estado]}".`)
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  const ESTADOS_REVERSE = {
    aprobado: 'Approved',
    observado: 'Observed',
    rechazado: 'Rejected',
  }

  if (cargando) return <p className="estado-cargando">Cargando...</p>
  if (error && !proveedor) return <div className="alerta alerta--error">{error}</div>
  if (!proceso || !proveedor) return <div className="estado-vacio"><p>Datos no disponibles.</p></div>

  const cal = proveedor.calificacion
  const yaCalificado = cal && cal.estado !== 'pendiente'

  return (
    <section className="form-pagina">
      <div className="encabezado">
        <button className="btn btn--texto" onClick={irAtras}>
          &larr; Volver al proceso
        </button>
        <h1>{proveedor.businessName}</h1>
        <p className="proceso__descripcion">
          <code>{proveedor.cuit}</code> &middot; {proceso.titulo} (<code>{proceso.codigo}</code>)
          {cal && (
            <span>
              &middot; Calificación actual:{' '}
              <span className={`badge ${CLASE_CALIFICACION[cal.estado] ?? 'badge--info'}`}>
                {ETIQUETA_CALIFICACION[cal.estado]}
              </span>
            </span>
          )}
        </p>
      </div>

      {error && <div className="alerta alerta--error">{error}</div>}
      {exito && <div className="alerta alerta--ok">{exito}</div>}

      {yaCalificado && (
        <div className="alerta alerta--info">
          {cal.estado === 'aprobado'
            ? 'Este proveedor ya fue aprobado y no se puede modificar su calificación.'
            : cal.estado === 'observado'
              ? 'Este proveedor fue observado. Puede cambiarlo a Aprobado si subsanó las observaciones.'
              : 'Este proveedor fue rechazado.'}
          {cal.evaluador && <span> Evaluado por: {cal.evaluador}.</span>}
          {cal.fecha && <span> Fecha: {new Date(cal.fecha).toLocaleDateString()}.</span>}
        </div>
      )}

      {(!yaCalificado || (yaCalificado && cal.estado === 'observado')) && (
        <div className="form" style={{ maxWidth: 600 }}>
          <h2 className="form__titulo">Calificación</h2>

          <div className="campo">
            <label className="campo__etiqueta">Estado *</label>
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              {[
                { value: 'Approved', label: 'Aprobado', desc: 'Podrá participar en la subasta' },
                { value: 'Observed', label: 'Observado', desc: 'No podrá participar (subsanable)' },
                { value: 'Rejected', label: 'Rechazado', desc: 'No podrá participar' },
              ].map(op => (
                <label
                  key={op.value}
                  className={`btn ${estadoSeleccionado === op.value ? 'btn--primario' : 'btn--secundario'}`}
                  style={{ cursor: 'pointer', textAlign: 'center', flex: 1, padding: '12px 8px' }}
                >
                  <input
                    type="radio"
                    name="estado"
                    value={op.value}
                    checked={estadoSeleccionado === op.value}
                    onChange={e => setEstadoSeleccionado(e.target.value)}
                    style={{ display: 'none' }}
                  />
                  <div><strong>{op.label}</strong></div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{op.desc}</div>
                </label>
              ))}
            </div>
          </div>

          <div className="campo">
            <label className="campo__etiqueta" htmlFor="fundamento">
              Fundamento {estadoSeleccionado === 'Rejected' ? '*' : '(opcional)'}
            </label>
            <textarea
              id="fundamento"
              className="campo__input"
              rows={4}
              placeholder="Explique el motivo de la calificación..."
              value={fundamento}
              onChange={e => setFundamento(e.target.value)}
            />
          </div>

          <div className="form__acciones">
            <button className="btn btn--texto" onClick={irAtras}>
              Cancelar
            </button>
            <button
              className="btn btn--primario"
              onClick={handleGuardar}
              disabled={guardando}
            >
              {guardando ? 'Guardando...' : 'Guardar calificación'}
            </button>
          </div>
        </div>
      )}

      {yaCalificado && cal.estado !== 'observado' && (
        <div className="form__acciones">
          <button className="btn btn--primario" onClick={irAtras}>
            Volver
          </button>
        </div>
      )}
    </section>
  )
}
