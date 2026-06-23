// Alta, edición y vista de un proceso de compra.
//
// - Sin :id  -> alta (borrador).
// - Con :id y estado borrador -> edición.
// - Con :id y estado no editable -> vista de solo lectura (ya está en el circuito).

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth.js'
import {
  obtenerProceso,
  crearProceso,
  actualizarProceso,
  enviarAAprobacion,
  volverABorrador,
  invitarProveedor,
  listarInvitacionesDeProceso,
} from '../../api/comprasApi.js'
import { ESTADO_INVITACION, etiquetaEstadoInvitacion, claseEstadoInvitacion } from '../../domain/invitaciones.js'
import { listarProveedores } from '../../api/proveedoresApi.js'
import {
  ESTADO_PROCESO,
  esEditable,
  etiquetaEstado,
  claseEstado,
} from '../../domain/compras.js'

const ITEM_VACIO = { description: '', quantity: 1, unit: 'unidad', estimatedUnitPrice: '' }
const VACIO = { titulo: '', descripcion: '', presupuestoEstimado: '', items: [ITEM_VACIO] }

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
  const [proveedores, setProveedores] = useState([])
  const [proveedorInvitado, setProveedorInvitado] = useState('')
  const [invitaciones, setInvitaciones] = useState([])
  const [invitadosNuevos, setInvitadosNuevos] = useState([]) // proveedores seleccionados al crear

  useEffect(() => {
    if (esNuevo) return
    obtenerProceso({ tenantId, id })
      .then((p) => {
        setProceso(p)
        setDatos({
          titulo: p.titulo,
          descripcion: p.descripcion,
          presupuestoEstimado: String(p.presupuestoEstimado || ''),
          items: p.items?.length ? p.items.map(mapItem) : [ITEM_VACIO],
        })
      })
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false))
  }, [esNuevo, tenantId, id])

  useEffect(() => {
    listarProveedores()
      .then(setProveedores)
      .catch(() => setProveedores([]))
  }, [])

  useEffect(() => {
    if (esNuevo || !id) return
    listarInvitacionesDeProceso({ tenantId, procesoId: id })
      .then(setInvitaciones)
      .catch(() => setInvitaciones([]))
  }, [esNuevo, tenantId, id])

  // En vista/edición, manda el estado real; en alta, siempre es editable.
  const editable = esNuevo || (proceso && esEditable(proceso.estado))

  function actualizar(campo, valor) {
    setDatos((prev) => ({ ...prev, [campo]: valor }))
  }

  function actualizarItem(indice, campo, valor) {
    setDatos((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === indice ? { ...item, [campo]: valor } : item)),
    }))
  }

  function agregarItem() {
    setDatos((prev) => ({ ...prev, items: [...prev.items, { ...ITEM_VACIO }] }))
  }

  function quitarItem(indice) {
    setDatos((prev) => ({
      ...prev,
      items: prev.items.length === 1 ? prev.items : prev.items.filter((_, i) => i !== indice),
    }))
  }

  async function manejarSubmit(e) {
    e.preventDefault()
    setError('')
    setGuardando(true)
    try {
      if (esNuevo) {
        const nuevo = await crearProceso({ tenantId, compradorId: usuario.id, datos })
        for (const provId of invitadosNuevos) {
          try {
            await invitarProveedor({ tenantId, procesoId: nuevo.id, proveedorId: provId })
          } catch {
          }
        }
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

  function agregarInvitadoNuevo() {
    if (!proveedorInvitado || invitadosNuevos.includes(proveedorInvitado)) return
    setInvitadosNuevos((prev) => [...prev, proveedorInvitado])
    setProveedorInvitado('')
  }

  function quitarInvitadoNuevo(id) {
    setInvitadosNuevos((prev) => prev.filter((p) => p !== id))
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

  async function invitar() {
    if (!proveedorInvitado) return
    setError('')
    setGuardando(true)
    try {
      await invitarProveedor({ tenantId, procesoId: id, proveedorId: proveedorInvitado })
      setProveedorInvitado('')
      const actualizadas = await listarInvitacionesDeProceso({ tenantId, procesoId: id })
      setInvitaciones(actualizadas)
    } catch (err) {
      setError(err.message)
    } finally {
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

        <fieldset className="form__seccion">
          <legend>Items del proceso</legend>
          {datos.items.map((item, indice) => (
            <div className="item-linea" key={indice}>
              <input
                placeholder="Descripcion"
                value={item.description}
                onChange={(e) => actualizarItem(indice, 'description', e.target.value)}
                disabled={!editable}
              />
              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Cantidad"
                value={item.quantity}
                onChange={(e) => actualizarItem(indice, 'quantity', e.target.value)}
                disabled={!editable}
              />
              <input
                placeholder="Unidad"
                value={item.unit}
                onChange={(e) => actualizarItem(indice, 'unit', e.target.value)}
                disabled={!editable}
              />
              <input
                type="number"
                min="0"
                placeholder="Precio unit."
                value={item.estimatedUnitPrice}
                onChange={(e) => actualizarItem(indice, 'estimatedUnitPrice', e.target.value)}
                disabled={!editable}
              />
              {editable && (
                <button type="button" className="btn btn--texto" onClick={() => quitarItem(indice)}>
                  Quitar
                </button>
              )}
            </div>
          ))}
          {editable && (
            <button type="button" className="btn btn--texto" onClick={agregarItem}>
              + Agregar item
            </button>
          )}
        </fieldset>

        {proveedores.length > 0 && (
          <fieldset className="form__seccion" style={{ marginTop: 24 }}>
            <legend>{esNuevo ? 'Seleccionar proveedores a invitar' : 'Invitacion de proveedores'}</legend>

            <div className="filtros">
              <select
                value={proveedorInvitado}
                onChange={(e) => setProveedorInvitado(e.target.value)}
              >
                <option value="">Seleccionar proveedor</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.razonSocial} - {p.cuit}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn--primario"
                onClick={esNuevo ? agregarInvitadoNuevo : invitar}
                disabled={!proveedorInvitado || guardando}
              >
                {esNuevo ? 'Agregar' : 'Invitar'}
              </button>
            </div>

            {esNuevo && invitadosNuevos.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {invitadosNuevos.map((provId) => {
                  const prov = proveedores.find((p) => p.id === provId)
                  return (
                    <span
                      key={provId}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 10px',
                        background: 'var(--color-primario-bg)',
                        borderRadius: 999,
                        fontSize: 13,
                      }}
                    >
                      {prov?.razonSocial ?? provId}
                      <button
                        type="button"
                        onClick={() => quitarInvitadoNuevo(provId)}
                        style={{
                          border: 'none',
                          background: 'none',
                          cursor: 'pointer',
                          color: 'var(--color-texto-suave)',
                          padding: 0,
                          fontSize: 16,
                          lineHeight: 1,
                        }}
                        title="Quitar"
                      >
                        ×
                      </button>
                    </span>
                  )
                })}
              </div>
            )}

            {invitaciones.length > 0 && (
              <>
                <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid var(--color-borde)' }} />
                <table className="tabla">
                  <thead>
                    <tr>
                      <th>Proveedor</th>
                      <th>CUIT</th>
                      <th>Invitado</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invitaciones.map((inv) => (
                      <tr key={inv.id}>
                        <td>{inv.supplierBusinessName}</td>
                        <td>{inv.supplierCuit}</td>
                        <td>{inv.invitedAtUtc?.slice(0, 10)}</td>
                        <td>
                          <span className={`badge ${claseEstadoInvitacion(inv.status)}`}>
                            {etiquetaEstadoInvitacion(inv.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {!esNuevo && invitaciones.length === 0 && (
              <p className="form__seccion-ayuda" style={{ marginTop: 8 }}>
                Todavia no se invitaron proveedores a este proceso.
              </p>
            )}

            {esNuevo && invitadosNuevos.length === 0 && (
              <p className="form__seccion-ayuda" style={{ marginTop: 8 }}>
                Selecciona los proveedores que queres invitar. Se invitaran automaticamente al crear el proceso.
              </p>
            )}
          </fieldset>
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

function mapItem(item) {
  return {
    description: item.description ?? item.Description ?? '',
    quantity: item.quantity ?? item.Quantity ?? 1,
    unit: item.unit ?? item.Unit ?? 'unidad',
    estimatedUnitPrice: item.estimatedUnitPrice ?? item.EstimatedUnitPrice ?? '',
  }
}
