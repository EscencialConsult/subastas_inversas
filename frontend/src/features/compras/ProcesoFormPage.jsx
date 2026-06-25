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
  publicarProceso,
  sugerirModalidadContratacion,
} from '../../api/comprasApi.js'
import { obtenerSubastaDeProceso, analisisSubasta } from '../../api/subastasApi.js'
import {
  ESTADO_PROCESO,
  esEditable,
  etiquetaEstado,
  claseEstado,
} from '../../domain/compras.js'

const VACIO = { titulo: '', descripcion: '', presupuestoEstimado: '', modalidadContratacionId: '' }

export function ProcesoFormPage() {
  const { id } = useParams()
  const esNuevo = !id
  const { tenantId, usuario } = useAuth()
  const navigate = useNavigate()

  const [datos, setDatos] = useState(VACIO)
  const [proceso, setProceso] = useState(null) // el registro completo, en edición/vista
  const [subasta, setSubasta] = useState(null) // si el proceso llegó a subasta
  const [cargando, setCargando] = useState(!esNuevo)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [modalidadSugerida, setModalidadSugerida] = useState(null)

  useEffect(() => {
    if (esNuevo) return
    obtenerProceso({ tenantId, id })
      .then((p) => {
        setProceso(p)
        setDatos({
          titulo: p.titulo,
          descripcion: p.descripcion,
          presupuestoEstimado: String(p.presupuestoEstimado || ''),
          modalidadContratacionId: p.modalidadContratacionId || '',
        })
        // La subasta es opcional: si el proceso no llegó a esa etapa, no existe.
        return obtenerSubastaDeProceso({ tenantId, procesoId: id })
          .then(setSubasta)
          .catch(() => setSubasta(null))
      })
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false))
  }, [esNuevo, tenantId, id])

  // En vista/edición, manda el estado real; en alta, siempre es editable.
  const editable = esNuevo || (proceso && esEditable(proceso.estado))

  function actualizar(campo, valor) {
    if (campo === 'presupuestoEstimado' && (!valor || Number(valor) < 0)) {
      setModalidadSugerida(null)
      setDatos((prev) => ({ ...prev, [campo]: valor, modalidadContratacionId: '' }))
      return
    }

    setDatos((prev) => ({ ...prev, [campo]: valor }))
  }

  useEffect(() => {
    if (!editable || !tenantId) return

    if (!datos.presupuestoEstimado) {
      return
    }

    const amount = Number(datos.presupuestoEstimado)
    if (!Number.isFinite(amount) || amount < 0) {
      return
    }

    const timeout = setTimeout(() => {
      sugerirModalidadContratacion({ tenantId, monto: amount })
        .then((modalidad) => {
          setModalidadSugerida(modalidad)
          setDatos((prev) => ({ ...prev, modalidadContratacionId: modalidad?.id ?? '' }))
        })
        .catch(() => {
          setModalidadSugerida(null)
          setDatos((prev) => ({ ...prev, modalidadContratacionId: '' }))
        })
    }, 300)

    return () => clearTimeout(timeout)
  }, [datos.presupuestoEstimado, editable, tenantId])

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

  async function publicar() {
    setError('')
    setGuardando(true)
    try {
      await publicarProceso({ tenantId, id })
      navigate('/compras')
    } catch (err) {
      setError(err.message)
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
          Este proceso ya fue publicado, por eso no se puede editar.
        </div>
      )}

      {proceso?.adjudicacion && (
        <div className="alerta alerta--ok">
          {proceso.estado === ESTADO_PROCESO.APROBADA
            ? `Adjudicado y aprobado: ${proceso.adjudicacion.proveedor} (${proceso.adjudicacion.fecha}).`
            : `Adjudicado a ${proceso.adjudicacion.proveedor}, pendiente de aprobación de la Autoridad.`}
        </div>
      )}

      {proceso?.aprobacion?.estado === 'rechazada' && (
        <div className="alerta alerta--error">
          La Autoridad rechazó la adjudicación. Motivo: {proceso.aprobacion.motivo}
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

        {modalidadSugerida && (
          <div className="alerta alerta--info">
            Modalidad sugerida: {modalidadSugerida.name}
          </div>
        )}

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
          {/* En un borrador ya guardado, ofrecemos publicarlo. */}
          {!esNuevo && editable && (
            <button
              type="button"
              className="btn btn--primario"
              onClick={publicar}
              disabled={guardando}
            >
              Publicar
            </button>
          )}
        </div>
      </form>

      {/* Resumen de la subasta (si el proceso ya pasó por ella). */}
      {subasta && <ResumenSubasta subasta={subasta} />}
    </section>
  )
}

// Muestra cómo resultó la subasta del proceso: análisis + lances.
function ResumenSubasta({ subasta }) {
  const a = analisisSubasta(subasta)
  const lances = [...subasta.lances].sort((x, y) => x.monto - y.monto)
  return (
    <div className="form">
      <h2 className="form__titulo">Resultado de la subasta</h2>
      <div className="perfil__solo-lectura">
        <span>Proveedores que ofertaron: {a.oferentes}</span>
        <span>Lances totales: {a.cantidadLances}</span>
        <span>Presupuesto base: {formatearPesos(a.base)}</span>
        <span>Mejor oferta: {formatearPesos(a.mejor)}</span>
        <span>Baja lograda: {a.bajaPorcentaje.toFixed(1)}%</span>
      </div>

      <h3 className="form__subtitulo">Lances ({lances.length})</h3>
      <table className="tabla">
        <thead>
          <tr>
            <th>Proveedor</th>
            <th>Monto</th>
          </tr>
        </thead>
        <tbody>
          {lances.map((l) => (
            <tr key={l.id}>
              <td>{l.proveedor}</td>
              <td>{formatearPesos(l.monto)}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
