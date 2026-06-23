// Alta, edición y vista de un proceso de compra.
//
// - Sin :id  -> alta (borrador).
// - Con :id y estado borrador -> edición.
// - Con :id y estado no editable -> vista de solo lectura (ya está en el circuito).
//
// Esta página actúa únicamente como coordinador de estado y datos.
// El render concreto se delega a los sub-componentes de /components.

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
  descargarActaPdf,
  generarContrato,
  emitirOrdenCompra,
  confirmarRecepcion,
  descargarContratoPdf,
  descargarOrdenCompraPdf,
  descargarRecepcionPdf,
} from '../../api/comprasApi.js'
import { listarProveedores } from '../../api/proveedoresApi.js'
import {
  esEditable,
  etiquetaEstado,
  claseEstado,
} from '../../domain/compras.js'
import { ProcesoForm } from './components/ProcesoForm.jsx'
import { ProcesoView } from './components/ProcesoView.jsx'
import { ProcesoContrato } from './components/ProcesoContrato.jsx'

const ITEM_VACIO = { description: '', quantity: 1, unit: 'unidad', estimatedUnitPrice: '' }
const VACIO = { titulo: '', descripcion: '', presupuestoEstimado: '', items: [ITEM_VACIO] }

function mapItem(item) {
  return {
    description: item.description ?? item.Description ?? '',
    quantity: item.quantity ?? item.Quantity ?? 1,
    unit: item.unit ?? item.Unit ?? 'unidad',
    estimatedUnitPrice: item.estimatedUnitPrice ?? item.EstimatedUnitPrice ?? '',
  }
}

function crearItemsRecepcion(proceso) {
  return (proceso.items ?? []).map((item) => ({
    purchaseItemId: item.id,
    quantityReceived: '',
  }))
}

export function ProcesoFormPage() {
  const { id } = useParams()
  const esNuevo = !id
  const { tenantId, usuario } = useAuth()
  const navigate = useNavigate()

  // ── Estado de datos ──────────────────────────────────────────────────────────
  const [datos, setDatos] = useState(VACIO)
  const [proceso, setProceso] = useState(null)
  const [cargando, setCargando] = useState(!esNuevo)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  // ── Estado de proveedores e invitaciones ────────────────────────────────────
  const [proveedores, setProveedores] = useState([])
  const [proveedorInvitado, setProveedorInvitado] = useState('')
  const [invitaciones, setInvitaciones] = useState([])
  const [invitadosNuevos, setInvitadosNuevos] = useState([])

  // ── Estado de contratación ───────────────────────────────────────────────────
  const [descargandoActa, setDescargandoActa] = useState(false)
  const [terminosContrato, setTerminosContrato] = useState('')
  const [fechaEntrega, setFechaEntrega] = useState('')
  const [observacionesOrden, setObservacionesOrden] = useState('')
  const [observacionesRecepcion, setObservacionesRecepcion] = useState('')
  const [itemsRecepcion, setItemsRecepcion] = useState([])

  // ── Carga inicial ────────────────────────────────────────────────────────────
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
        setItemsRecepcion(crearItemsRecepcion(p))
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

  // ── Helpers auxiliares ───────────────────────────────────────────────────────
  const editable = esNuevo || (proceso && esEditable(proceso.estado))

  async function recargarProceso() {
    const actualizado = await obtenerProceso({ tenantId, id })
    setProceso(actualizado)
    setDatos({
      titulo: actualizado.titulo,
      descripcion: actualizado.descripcion,
      presupuestoEstimado: String(actualizado.presupuestoEstimado || ''),
      items: actualizado.items?.length ? actualizado.items.map(mapItem) : [ITEM_VACIO],
    })
    setItemsRecepcion(crearItemsRecepcion(actualizado))
    return actualizado
  }

  // ── Handlers de formulario ───────────────────────────────────────────────────
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
            // La creación del proceso no debe fallar si una invitación puntual no se registra.
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

  // ── Handlers de invitación ───────────────────────────────────────────────────
  function agregarInvitadoNuevo() {
    if (!proveedorInvitado || invitadosNuevos.includes(proveedorInvitado)) return
    setInvitadosNuevos((prev) => [...prev, proveedorInvitado])
    setProveedorInvitado('')
  }

  function quitarInvitadoNuevo(provId) {
    setInvitadosNuevos((prev) => prev.filter((p) => p !== provId))
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

  // ── Handlers de flujo ────────────────────────────────────────────────────────
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

  // ── Handlers de descargas ────────────────────────────────────────────────────
  async function handleDescargarActa() {
    if (!proceso) return
    setError('')
    setDescargandoActa(true)
    try {
      await descargarActaPdf({ tenantId, id: proceso.id, codigo: proceso.codigo })
    } catch (err) {
      setError(err.message)
    } finally {
      setDescargandoActa(false)
    }
  }

  // ── Handlers de contratación ─────────────────────────────────────────────────
  async function handleGenerarContrato(awardId = null) {
    setError('')
    setGuardando(true)
    try {
      await generarContrato({ tenantId, procesoId: proceso.id, awardId, terms: terminosContrato })
      await recargarProceso()
      setTerminosContrato('')
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  async function handleEmitirOrden(contractId = null) {
    setError('')
    setGuardando(true)
    try {
      await emitirOrdenCompra({
        tenantId,
        contractId: contractId ?? proceso.contrato.id,
        expectedDeliveryDateUtc: fechaEntrega ? `${fechaEntrega}T00:00:00Z` : null,
        observations: observacionesOrden,
      })
      await recargarProceso()
      setFechaEntrega('')
      setObservacionesOrden('')
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  async function handleConfirmarRecepcion() {
    setError('')
    setGuardando(true)
    try {
      await confirmarRecepcion({
        tenantId,
        purchaseOrderId: proceso.ordenCompra.id,
        receivedById: usuario.id,
        observations: observacionesRecepcion,
        items: itemsRecepcion,
      })
      await recargarProceso()
      setObservacionesRecepcion('')
      setItemsRecepcion([])
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
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

      {/* Sección de contratación (solo lectura, estado post-adjudicación) */}
      {proceso && (
        <ProcesoContrato
          proceso={proceso}
          tenantId={tenantId}
          guardando={guardando}
          terminosContrato={terminosContrato}
          setTerminosContrato={setTerminosContrato}
          fechaEntrega={fechaEntrega}
          setFechaEntrega={setFechaEntrega}
          observacionesOrden={observacionesOrden}
          setObservacionesOrden={setObservacionesOrden}
          observacionesRecepcion={observacionesRecepcion}
          setObservacionesRecepcion={setObservacionesRecepcion}
          itemsRecepcion={itemsRecepcion}
          setItemsRecepcion={setItemsRecepcion}
          onGenerarContrato={handleGenerarContrato}
          onEmitirOrden={handleEmitirOrden}
          onConfirmarRecepcion={handleConfirmarRecepcion}
          onDescargarContrato={() =>
            descargarContratoPdf({ tenantId, contrato: proceso.contrato }).catch((err) => setError(err.message))
          }
          onDescargarOrden={() =>
            descargarOrdenCompraPdf({ tenantId, orden: proceso.ordenCompra }).catch((err) => setError(err.message))
          }
          onDescargarRecepcion={(recepcion) =>
            descargarRecepcionPdf({ tenantId, recepcion }).catch((err) => setError(err.message))
          }
        />
      )}

      {/* Vista de solo lectura cuando no es editable */}
      {proceso && !editable && (
        <ProcesoView
          proceso={proceso}
          guardando={guardando}
          descargandoActa={descargandoActa}
          onCorregir={corregir}
          onDescargarActa={handleDescargarActa}
        />
      )}

      {/* Formulario de creación/edición */}
      {editable && (
        <ProcesoForm
          datos={datos}
          proceso={proceso}
          esNuevo={esNuevo}
          guardando={guardando}
          proveedores={proveedores}
          proveedorInvitado={proveedorInvitado}
          setProveedorInvitado={setProveedorInvitado}
          invitaciones={invitaciones}
          invitadosNuevos={invitadosNuevos}
          agregarInvitadoNuevo={agregarInvitadoNuevo}
          quitarInvitadoNuevo={quitarInvitadoNuevo}
          invitar={invitar}
          actualizar={actualizar}
          actualizarItem={actualizarItem}
          agregarItem={agregarItem}
          quitarItem={quitarItem}
          manejarSubmit={manejarSubmit}
          enviar={enviar}
          onVolver={() => navigate('/compras')}
        />
      )}

      {/* Botón volver en modo solo lectura */}
      {proceso && !editable && (
        <div className="form__acciones" style={{ marginTop: 16 }}>
          <button
            type="button"
            className="btn btn--texto"
            onClick={() => navigate('/compras')}
          >
            ← Volver
          </button>
        </div>
      )}
    </section>
  )
}
