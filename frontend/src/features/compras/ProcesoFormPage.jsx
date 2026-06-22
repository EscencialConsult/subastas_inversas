// Alta, edición y vista de un proceso de compra.
//
// - Sin :id  -> alta (borrador).
// - Con :id y estado borrador -> edición.
// - Con :id y estado no editable -> vista de solo lectura (ya está en el circuito).

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext.jsx'
import {
  obtenerProceso,
  crearProceso,
  actualizarProceso,
  enviarAAprobacion,
  volverABorrador,
} from '../../api/comprasApi.js'
import {
  ESTADO_PROCESO,
  esEditable,
  etiquetaEstado,
  claseEstado,
} from '../../domain/compras.js'

const VACIO = { titulo: '', descripcion: '', presupuestoEstimado: '' }

export function ProcesoFormPage() {
  const { id } = useParams()
  const esNuevo = !id
  const { tenantId, usuario } = useAuth()
  const navigate = useNavigate()

  const [datos, setDatos] = useState(VACIO)
  const [proceso, setProceso] = useState(null) // el registro completo, en edición/vista
  const [cargando, setCargando] = useState(!esNuevo)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (esNuevo) return
    obtenerProceso({ tenantId, id })
      .then((p) => {
        setProceso(p)
        setDatos({
          titulo: p.titulo,
          descripcion: p.descripcion,
          presupuestoEstimado: String(p.presupuestoEstimado || ''),
        })
      })
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false))
  }, [esNuevo, tenantId, id])

  // En vista/edición, manda el estado real; en alta, siempre es editable.
  const editable = esNuevo || (proceso && esEditable(proceso.estado))

  function actualizar(campo, valor) {
    setDatos((prev) => ({ ...prev, [campo]: valor }))
  }

  async function manejarSubmit(e) {
    e.preventDefault()
    setError('')
    setGuardando(true)
    try {
      if (esNuevo) {
        await crearProceso({ tenantId, compradorId: usuario.id, datos })
      } else {
        await actualizarProceso({ tenantId, id, datos })
      }
      navigate('/compras')
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  async function enviar() {
    setError('')
    setGuardando(true)
    try {
      await enviarAAprobacion({ tenantId, id })
      navigate('/compras')
    } catch (err) {
      setError(err.message)
      setGuardando(false)
    }
  }

  // Rechazado -> vuelve a borrador y queda editable en la misma pantalla.
  async function corregir() {
    setError('')
    setGuardando(true)
    try {
      const actualizado = await volverABorrador({ tenantId, id })
      setProceso(actualizado)
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) return <p className="estado-cargando">Cargando…</p>

  return (
    <section className="form-pagina">
      <div className="encabezado">
        <h1>
          {esNuevo
            ? 'Nuevo proceso de compra'
            : editable
              ? 'Editar proceso de compra'
              : 'Proceso de compra'}
        </h1>
        {proceso && (
          <span className={`badge ${claseEstado(proceso.estado)}`}>
            {etiquetaEstado(proceso.estado)}
          </span>
        )}
      </div>

      {error && <div className="alerta alerta--error">{error}</div>}

      {!editable && !esNuevo && (
        <div className="alerta alerta--info">
          Este proceso ya está en el circuito de aprobación, por eso no se puede editar.
        </div>
      )}

      {proceso?.estado === ESTADO_PROCESO.ADJUDICADO && proceso.adjudicacion && (
        <div className="alerta alerta--ok">
          Adjudicado a {proceso.adjudicacion.proveedor} el {proceso.adjudicacion.fecha}.
        </div>
      )}

      {proceso?.estado === ESTADO_PROCESO.RECHAZADO && (
        <div className="alerta alerta--error">
          {proceso.motivoRechazo && (
            <p>Rechazado por el aprobador. Motivo: {proceso.motivoRechazo}</p>
          )}
          <button
            className="btn btn--primario"
            onClick={corregir}
            disabled={guardando}
            style={{ marginTop: 8 }}
          >
            Corregir y reenviar
          </button>
        </div>
      )}

      <form className="form" onSubmit={manejarSubmit}>
        {proceso && (
          <div className="perfil__solo-lectura">
            <span>Código: {proceso.codigo}</span>
            <span>Creado el: {proceso.creadoEn}</span>
          </div>
        )}

        <label className="campo">
          <span>Título</span>
          <input
            value={datos.titulo}
            onChange={(e) => actualizar('titulo', e.target.value)}
            disabled={!editable}
            placeholder="Compra de insumos de limpieza"
          />
        </label>

        <label className="campo">
          <span>Descripción</span>
          <textarea
            rows={4}
            value={datos.descripcion}
            onChange={(e) => actualizar('descripcion', e.target.value)}
            disabled={!editable}
            placeholder="Detalle de lo que se necesita comprar…"
          />
        </label>

        <label className="campo">
          <span>Presupuesto estimado (ARS)</span>
          <input
            type="number"
            min="0"
            value={datos.presupuestoEstimado}
            onChange={(e) => actualizar('presupuestoEstimado', e.target.value)}
            disabled={!editable}
            placeholder="500000"
          />
        </label>

        <div className="form__acciones">
          <button
            type="button"
            className="btn btn--texto"
            onClick={() => navigate('/compras')}
          >
            Volver
          </button>
          {editable && (
            <button type="submit" className="btn btn--primario" disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
          )}
          {/* En edición de un borrador ya guardado, ofrecemos enviarlo a aprobación. */}
          {!esNuevo && editable && (
            <button
              type="button"
              className="btn btn--primario"
              onClick={enviar}
              disabled={guardando}
            >
              Enviar a aprobación
            </button>
          )}
        </div>
      </form>
    </section>
  )
}
