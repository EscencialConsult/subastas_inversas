// Detalle de un proceso para que el Aprobador decida: autorizar o rechazar.
// El rechazo exige un motivo (queda registrado y lo verá el comprador).

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth.js'
import {
  obtenerProceso,
  aprobarProceso,
  rechazarProceso,
} from '../../api/comprasApi.js'
import {
  ESTADO_PROCESO,
  etiquetaEstado,
  claseEstado,
} from '../../domain/compras.js'

export function AprobacionDetailPage() {
  const { id } = useParams()
  const { tenantId, usuario } = useAuth()
  const navigate = useNavigate()

  const [proceso, setProceso] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [rechazando, setRechazando] = useState(false) // muestra el campo motivo
  const [motivo, setMotivo] = useState('')
  const [procesando, setProcesando] = useState(false)

  useEffect(() => {
    obtenerProceso({ tenantId, id })
      .then(setProceso)
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false))
  }, [tenantId, id])

  async function aprobar() {
    setError('')
    setProcesando(true)
    try {
      await aprobarProceso({ tenantId, id, aprobadorId: usuario.id })
      navigate('/aprobaciones')
    } catch (err) {
      setError(err.message)
      setProcesando(false)
    }
  }

  async function confirmarRechazo() {
    setError('')
    setProcesando(true)
    try {
      await rechazarProceso({ tenantId, id, aprobadorId: usuario.id, motivo })
      navigate('/aprobaciones')
    } catch (err) {
      setError(err.message)
      setProcesando(false)
    }
  }

  if (cargando) return <p className="estado-cargando">Cargando…</p>
  if (!proceso) return <div className="alerta alerta--error">{error}</div>

  const pendiente = proceso.estado === ESTADO_PROCESO.PENDIENTE_APROBACION

  return (
    <section className="form-pagina">
      <div className="encabezado">
        <h1>Revisar proceso</h1>
        <span className={`badge ${claseEstado(proceso.estado)}`}>
          {etiquetaEstado(proceso.estado)}
        </span>
      </div>

      {error && <div className="alerta alerta--error">{error}</div>}

      <div className="form">
        <h2 className="form__titulo">{proceso.titulo}</h2>
        <div className="perfil__solo-lectura">
          <span>Código: {proceso.codigo}</span>
          <span>Creado el: {proceso.creadoEn}</span>
          <span>Presupuesto estimado: {formatearPesos(proceso.presupuestoEstimado)}</span>
        </div>

        <p className="proceso__descripcion">
          {proceso.descripcion || 'Sin descripción.'}
        </p>

        {/* Si ya se decidió, mostramos el resultado en vez de las acciones. */}
        {proceso.estado === ESTADO_PROCESO.RECHAZADO && (
          <div className="alerta alerta--error">
            Rechazado. Motivo: {proceso.motivoRechazo}
          </div>
        )}

        {pendiente && !rechazando && (
          <div className="form__acciones">
            <button
              className="btn btn--texto"
              onClick={() => navigate('/aprobaciones')}
            >
              Volver
            </button>
            <button
              className="btn btn--peligro"
              onClick={() => setRechazando(true)}
              disabled={procesando}
            >
              Rechazar
            </button>
            <button
              className="btn btn--primario"
              onClick={aprobar}
              disabled={procesando}
            >
              {procesando ? 'Procesando…' : 'Aprobar'}
            </button>
          </div>
        )}

        {pendiente && rechazando && (
          <div className="rechazo">
            <label className="campo">
              <span>Motivo del rechazo</span>
              <textarea
                rows={3}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Explicá por qué se rechaza este proceso…"
              />
            </label>
            <div className="form__acciones">
              <button
                className="btn btn--texto"
                onClick={() => setRechazando(false)}
                disabled={procesando}
              >
                Cancelar
              </button>
              <button
                className="btn btn--peligro"
                onClick={confirmarRechazo}
                disabled={procesando}
              >
                {procesando ? 'Procesando…' : 'Confirmar rechazo'}
              </button>
            </div>
          </div>
        )}

        {!pendiente && (
          <div className="form__acciones">
            <button
              className="btn btn--texto"
              onClick={() => navigate('/aprobaciones')}
            >
              Volver
            </button>
          </div>
        )}
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
