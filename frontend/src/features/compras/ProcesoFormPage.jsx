// Alta, edición y vista de un proceso de compra implementando el Wizard de 7 etapas.
//
// - Sin :id  -> alta (asistente desde Etapa 1).
// - Con :id y estado borrador -> edición (asistente retomable desde la etapa en la que se dejó).
// - Con :id y estado no editable -> vista de solo lectura (resumen del proceso).

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext.jsx'
import {
  obtenerProceso,
  crearProceso,
  actualizarProceso,
  publicarProceso,
  sugerirModalidadContratacion,
  listarInvitacionesProceso,
  invitarProveedorAProceso,
  confirmarRecepcion,
} from '../../api/comprasApi.js'
import { obtenerSubastaDeProceso, analisisSubasta } from '../../api/subastasApi.js'
import { listarProveedores } from '../../api/proveedoresApi.js'
import { listarModalidadesContratacion } from '../../api/configuracionApi.js'
import {
  ESTADO_PROCESO,
  esEditable,
  etiquetaEstado,
  claseEstado,
} from '../../domain/compras.js'
import { obtenerCriteriosEvaluacion, guardarCriteriosEvaluacion } from '../../api/comprasApi.js'

const VACIO = { titulo: '', descripcion: '', presupuestoEstimado: '', modalidadContratacionId: '', items: [] }

const ETAPAS = [
  { nro: 1, label: 'Datos Básicos' },
  { nro: 2, label: 'Presupuesto' },
  { nro: 3, label: 'Ítems' },
  { nro: 4, label: 'Criterios' },
  { nro: 5, label: 'Requisitos' },
  { nro: 6, label: 'Subasta' },
  { nro: 7, label: 'Invitaciones' },
  { nro: 8, label: 'Revisión' },
]

export function ProcesoFormPage() {
  const { id } = useParams()
  const esNuevo = !id
  const { tenantId, usuario } = useAuth()
  const navigate = useNavigate()

  const [currentStep, setCurrentStep] = useState(1)
  const [datos, setDatos] = useState(VACIO)
  const [proceso, setProceso] = useState(null)
  const [subasta, setSubasta] = useState(null)
  const [cargando, setCargando] = useState(!esNuevo)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  
  // Catálogo de modalidades de contratación
  const [modalidades, setModalidades] = useState([])
  const [modalidadSugerida, setModalidadSugerida] = useState(null)

  // Criterios de evaluación (Etapa 4)
  const [criteriosEvaluacion, setCriteriosEvaluacion] = useState([])

  // Documentos requeridos (Etapa 5)
  const [docRequisitos, setDocRequisitos] = useState(() => {
    if (id) {
      const saved = localStorage.getItem('wizard_docs_' + id)
      if (saved) return JSON.parse(saved)
    }
    return ['CuitCertificate', 'TaxCertificate', 'LegalDocument']
  })

  // Configuración de la subasta (Etapa 5)
  const [subastaConfig, setSubastaConfig] = useState(() => {
    if (id) {
      const dur = localStorage.getItem(`auction_duration_${id}`)
      const dec = localStorage.getItem(`auction_decrement_${id}`)
      return {
        duracion: dur ? Number(dur) : 10,
        decremento: dec ? Number(dec) : 1,
      }
    }
    return { duracion: 10, decremento: 1 }
  })

  // Proveedores a invitar (Etapa 6)
  const [proveedores, setProveedores] = useState([])
  const [invitadosIds, setInvitadosIds] = useState([])
  const [cargandoProveedores, setCargandoProveedores] = useState(false)
  const [invitaciones, setInvitaciones] = useState([])
  const [recepcionEstado, setRecepcionEstado] = useState('Accepted')
  const [recepcionObservaciones, setRecepcionObservaciones] = useState('')
  const [recepcionCantidades, setRecepcionCantidades] = useState({})
  const [registrandoRecepcion, setRegistrandoRecepcion] = useState(false)

  // Carga de datos iniciales del proceso
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
          items: p.items || [],
        })

        if (!esEditable(p.estado)) {
          setCurrentStep(7)
        } else {
          // Recuperar el paso guardado para este proceso
          const savedStep = localStorage.getItem('wizard_step_' + id)
          if (savedStep) {
            const stepNum = Number(savedStep)
            if (stepNum >= 1 && stepNum <= 8) {
              setCurrentStep(stepNum)
            }
          }
        }

        // Cargar invitaciones existentes
        listarInvitacionesProceso({ tenantId, procesoId: id })
          .then((invs) => {
            setInvitaciones(invs)
            setInvitadosIds(invs.map(i => i.proveedorId))
          })
          .catch(console.error)

        if (!p.tieneSubasta) {
          setSubasta(null)
          return null
        }
        return obtenerSubastaDeProceso({ tenantId, procesoId: id }).then(setSubasta)
      })
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false))

    // Cargar criterios de evaluación existentes
    obtenerCriteriosEvaluacion({ tenantId, procesoId: id })
      .then(crits => setCriteriosEvaluacion(crits.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description || '',
        type: c.type,
        weight: c.weight,
        sortOrder: c.sortOrder,
      }))))
      .catch(() => setCriteriosEvaluacion([]))
  }, [esNuevo, tenantId, id])

  // Carga de modalidades de contratación
  useEffect(() => {
    if (tenantId) {
      listarModalidadesContratacion({ tenantId })
        .then(setModalidades)
        .catch(() => setModalidades([]))
    }
  }, [tenantId])

  // Carga de proveedores verificados para invitación
  useEffect(() => {
    if (tenantId && currentStep === 7) {
      Promise.resolve().then(() => setCargandoProveedores(true))
      listarProveedores({ tenantId })
        .then((lista) => {
          setProveedores(lista.filter((p) => p.estado === 'verificado'))
        })
        .catch((err) => setError(err.message))
        .finally(() => setCargandoProveedores(false))
    }
  }, [tenantId, currentStep])

  // Guardar configuración de documentos y subasta en localStorage
  useEffect(() => {
    if (id) {
      localStorage.setItem('wizard_docs_' + id, JSON.stringify(docRequisitos))
    }
  }, [docRequisitos, id])

  useEffect(() => {
    if (id) {
      localStorage.setItem(`auction_duration_${id}`, String(subastaConfig.duracion))
      localStorage.setItem(`auction_decrement_${id}`, String(subastaConfig.decremento))
    }
  }, [subastaConfig, id])

  // En vista/edición, manda el estado real; en alta, siempre es editable.
  const editable = esNuevo || (proceso && esEditable(proceso.estado))



  // Sugerencia dinámica de modalidad de contratación
  useEffect(() => {
    if (!editable || !tenantId || !datos.presupuestoEstimado) return

    const amount = Number(datos.presupuestoEstimado)
    if (!Number.isFinite(amount) || amount < 0) return

    const timeout = setTimeout(() => {
      sugerirModalidadContratacion({ tenantId, monto: amount })
        .then((modalidad) => {
          setModalidadSugerida(modalidad)
          setDatos((prev) => ({ ...prev, modalidadContratacionId: modalidad?.id ?? prev.modalidadContratacionId }))
        })
        .catch(() => setModalidadSugerida(null))
    }, 300)

    return () => clearTimeout(timeout)
  }, [datos.presupuestoEstimado, editable, tenantId])

  // Guardado automático debounced
  useEffect(() => {
    if (esNuevo || !editable || !id) return

    const timeout = setTimeout(async () => {
      try {
        if (datos.titulo.trim()) {
          await actualizarProceso({ tenantId, id, datos })
        }
      } catch (err) {
        console.error("Auto-save fallido:", err)
      }
    }, 1200)

    return () => clearTimeout(timeout)
  }, [datos, id, esNuevo, editable, tenantId])

  // Validaciones locales por paso
  function validarPaso(step) {
    if (step === 1) {
      if (!datos.titulo?.trim()) return 'El título es obligatorio.'
      if (!datos.descripcion?.trim()) return 'La descripción es obligatoria.'
    }
    if (step === 2) {
      const budget = Number(datos.presupuestoEstimado)
      if (isNaN(budget) || budget <= 0) return 'El presupuesto estimado debe ser mayor a cero.'
      if (modalidades.length > 0 && !datos.modalidadContratacionId) return 'Debe seleccionarse una modalidad de contratación.'
    }
    if (step === 3) {
      if (!datos.items || datos.items.length === 0) return 'Debe agregar al menos un ítem al proceso.'
      for (let i = 0; i < datos.items.length; i++) {
        const it = datos.items[i]
        if (!it.description?.trim()) return `El ítem ${i + 1} debe tener una descripción.`
        const qty = Number(it.quantity)
        if (isNaN(qty) || qty <= 0) return `La cantidad del ítem ${i + 1} debe ser mayor a cero.`
      }
    }
    if (step === 4) {
      const haveExclusionary = criteriosEvaluacion.some(c => c.type === 'Exclusionary')
      const haveWeighted = criteriosEvaluacion.some(c => c.type === 'Weighted')
      if (!haveExclusionary && !haveWeighted) return 'Debe definir al menos un criterio de evaluación (excluyente o ponderado).'
      const weightSum = criteriosEvaluacion.filter(c => c.type === 'Weighted').reduce((s, c) => s + (Number(c.weight) || 0), 0)
      if (haveWeighted && weightSum !== 100) return `La suma de pesos de criterios ponderados debe ser 100% (actual: ${weightSum}%).`
    }
    if (step === 5) {
      if (docRequisitos.length === 0) return 'Debe seleccionar al menos un requisito de documentación.'
    }
    if (step === 6) {
      const dur = Number(subastaConfig.duracion)
      if (isNaN(dur) || dur < 10 || dur > 120) return 'La duración de la subasta debe estar entre 10 y 120 minutos.'
      const dec = Number(subastaConfig.decremento)
      if (isNaN(dec) || dec <= 0 || dec > 10) return 'El decremento mínimo debe estar entre 0.1% y 10%.'
    }
    if (step === 7) {
      if (invitadosIds.length === 0) return 'Debe invitar al menos a un proveedor.'
    }
    return null
  }

  // Navegación entre pasos
  async function irAlPaso(numero) {
    if (!editable) {
      setCurrentStep(7)
      return
    }

    if (numero > currentStep) {
      // Validar pasos intermedios antes de avanzar
      for (let s = currentStep; s < numero; s++) {
        const err = validarPaso(s)
        if (err) {
          setError(err)
          return
        }
      }
    }

    setError('')

    // Guardado automático al cambiar de paso
    if (!esNuevo && editable) {
      setGuardando(true)
      try {
        await actualizarProceso({ tenantId, id, datos })
      } catch (err) {
        setError('Error al guardar borrador: ' + err.message)
        setGuardando(false)
        return
      }

      // Guardar criterios de evaluación
      if (criteriosEvaluacion.length > 0) {
        try {
          await guardarCriteriosEvaluacion({
            tenantId,
            procesoId: id,
            userId: usuario.id,
            criteria: criteriosEvaluacion.map((c, i) => ({
              id: c.id || null,
              name: c.name,
              description: c.description || null,
              type: c.type,
              weight: Number(c.weight) || 0,
              sortOrder: i + 1,
            })),
          })
        } catch (err) {
          setError('Error al guardar criterios: ' + err.message)
          setGuardando(false)
          return
        }
      }

      setGuardando(false)
    }

    setCurrentStep(numero)
    if (id) {
      localStorage.setItem('wizard_step_' + id, String(numero))
    }
  }

  // Avanzar al paso siguiente
  async function siguiente() {
    const err = validarPaso(currentStep)
    if (err) {
      setError(err)
      return
    }
    setError('')

    if (esNuevo && currentStep === 1) {
      setGuardando(true)
      try {
        const nuevoProc = await crearProceso({
          tenantId,
          compradorId: usuario.id,
          datos: { ...datos, items: [] },
        })
        setProceso(nuevoProc)
        localStorage.setItem('wizard_step_' + nuevoProc.id, '2')
        setGuardando(false)
        navigate('/compras/' + nuevoProc.id, { replace: true })
        setCurrentStep(2)
      } catch (err) {
        setError('Error al crear proceso: ' + err.message)
        setGuardando(false)
      }
    } else {
      irAlPaso(currentStep + 1)
    }
  }

  // Retroceder al paso anterior
  function anterior() {
    setError('')
    irAlPaso(currentStep - 1)
  }

  // Invitar a un proveedor
  async function manejarInvitacion(proveedorId, checked) {
    if (checked) {
      try {
        await invitarProveedorAProceso({ tenantId, procesoId: id, proveedorId })
        setInvitadosIds((prev) => [...prev, proveedorId])
        setError('')
      } catch (err) {
        setError('Error al invitar proveedor: ' + err.message)
      }
    }
  }

  // Publicar el proceso
  async function publicar() {
    const err = validarPaso(8)
    if (err) {
      setError(err)
      return
    }

    setError('')
    setGuardando(true)
    try {
      await publicarProceso({ tenantId, id })
      if (id) {
        localStorage.removeItem('wizard_step_' + id)
      }
      navigate('/compras')
    } catch (err) {
      setError(err.message)
      setGuardando(false)
    }
  }

  // Gestores de cambio de inputs en datos
  function actualizarDatos(campo, valor) {
    setDatos((prev) => ({ ...prev, [campo]: valor }))
  }

  // Gestores de cambio de items
  function agregarItem() {
    setDatos((prev) => ({
      ...prev,
      items: [...(prev.items || []), { description: '', quantity: 1, unit: 'unidad', estimatedUnitPrice: '' }],
    }))
  }

  function actualizarItem(index, campo, valor) {
    setDatos((prev) => {
      const items = [...prev.items]
      items[index] = { ...items[index], [campo]: valor }
      return { ...prev, items }
    })
  }

  function quitarItem(index) {
    setDatos((prev) => {
      const items = prev.items.filter((_, idx) => idx !== index)
      return { ...prev, items }
    })
  }

  async function registrarRecepcion(ordenCompra) {
    if (!ordenCompra || !usuario?.id) return

    const pendientes = calcularPendientesRecepcion(proceso, ordenCompra)
    const items = pendientes
      .map((item) => ({
        purchaseItemId: item.purchaseItemId,
        quantityReceived: Number(recepcionCantidades[recepcionCantidadKey(ordenCompra.id, item.purchaseItemId)]) || 0,
      }))
      .filter((item) => item.quantityReceived > 0)

    const excedido = items.some((item) => {
      const pendiente = pendientes.find((p) => p.purchaseItemId === item.purchaseItemId)
      return pendiente && item.quantityReceived > pendiente.pendiente
    })

    if (items.length === 0) {
      setError('Ingresá al menos una cantidad recibida mayor a cero.')
      return
    }

    if (excedido) {
      setError('La cantidad recibida no puede superar el pendiente de la orden.')
      return
    }

    setRegistrandoRecepcion(true)
    setError('')
    try {
      await confirmarRecepcion({
        tenantId,
        ordenCompraId: ordenCompra.id,
        receptorId: usuario.id,
        estado: recepcionEstado,
        observaciones: recepcionObservaciones,
        items,
      })
      const actualizado = await obtenerProceso({ tenantId, id })
      setProceso(actualizado)
      setDatos((prev) => ({
        ...prev,
        titulo: actualizado.titulo,
        descripcion: actualizado.descripcion,
        presupuestoEstimado: String(actualizado.presupuestoEstimado || ''),
        modalidadContratacionId: actualizado.modalidadContratacionId || '',
        items: actualizado.items || [],
      }))
      setRecepcionCantidades({})
      setRecepcionObservaciones('')
      setRecepcionEstado('Accepted')
    } catch (err) {
      setError(err.message)
    } finally {
      setRegistrandoRecepcion(false)
    }
  }

  if (cargando) return <p className="estado-cargando">Cargando…</p>

  const modalidadActual = modalidades.find((m) => m.id === datos.modalidadContratacionId)

  return (
    <section className="form-pagina">
      <div className="encabezado">
        <h1>
          {esNuevo
            ? 'Nuevo proceso de compra (Asistente)'
            : editable
              ? 'Editar proceso de compra (Asistente)'
              : 'Proceso de compra'}
        </h1>
        {proceso && (
          <span className={`badge ${claseEstado(proceso.estado)}`}>
            {etiquetaEstado(proceso.estado)}
          </span>
        )}
      </div>

      {/* Stepper Progress Bar */}
      {editable && (
        <div className="wizard-progress">
          <div
            className="wizard-progress__bar-fill"
            style={{ width: `${((currentStep - 1) / 7) * 100}%` }}
          ></div>
          {ETAPAS.map((etapa) => {
            const isActive = currentStep === etapa.nro
            const isCompleted = currentStep > etapa.nro
            return (
              <div
                key={etapa.nro}
                className={`wizard-progress__step ${isActive ? 'wizard-progress__step--active' : ''} ${isCompleted ? 'wizard-progress__step--completed' : ''}`}
                style={{ cursor: isCompleted || isActive ? 'pointer' : 'default' }}
                onClick={() => (isCompleted || isActive) && irAlPaso(etapa.nro)}
              >
                <div className="wizard-progress__circle">
                  {isCompleted ? '✓' : etapa.nro}
                </div>
                <div className="wizard-progress__label">{etapa.label}</div>
              </div>
            )
          })}
        </div>
      )}

      {error && <div className="alerta alerta--error">{error}</div>}

      {/* Wizard Card Body */}
      {editable ? (
        <div className="wizard-card">
          {currentStep === 1 && (
            <div>
              <h2 className="wizard-card__title">Etapa 1: Datos Básicos</h2>
              <p className="wizard-card__sub">Identifica el proceso con un título claro y la descripción del requerimiento.</p>
              
              <label className="campo">
                <span>Título del Proceso</span>
                <input
                  value={datos.titulo}
                  onChange={(e) => actualizarDatos('titulo', e.target.value)}
                  placeholder="Compra de insumos de limpieza para delegaciones"
                />
              </label>

              <label className="campo">
                <span>Descripción Detallada</span>
                <textarea
                  rows={5}
                  value={datos.descripcion}
                  onChange={(e) => actualizarDatos('descripcion', e.target.value)}
                  placeholder="Se requiere el aprovisionamiento de lavandina, desinfectantes, trapos y bolsas..."
                />
              </label>
            </div>
          )}

          {currentStep === 2 && (
            <div>
              <h2 className="wizard-card__title">Etapa 2: Presupuesto y Modalidad</h2>
              <p className="wizard-card__sub">Establece el monto aproximado del proceso. El sistema sugerirá la modalidad regulatoria adecuada.</p>

              <label className="campo">
                <span>Presupuesto Estimado (ARS)</span>
                <input
                  type="number"
                  min="0"
                  value={datos.presupuestoEstimado}
                  onChange={(e) => actualizarDatos('presupuestoEstimado', e.target.value)}
                  placeholder="500000"
                />
              </label>

              {modalidadSugerida && (
                <div className="alerta alerta--info">
                  <strong>Modalidad Sugerida:</strong> {modalidadSugerida.name}
                  <p style={{ margin: '4px 0 0', fontSize: '13px' }}>{modalidadSugerida.description}</p>
                </div>
              )}

              <label className="campo">
                <span>Modalidad Seleccionada</span>
                {modalidades.length > 0 ? (
                  <select
                    value={datos.modalidadContratacionId}
                    onChange={(e) => actualizarDatos('modalidadContratacionId', e.target.value)}
                  >
                    <option value="">Selecciona una modalidad...</option>
                    {modalidades.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} {m.id === modalidadSugerida?.id ? '(Sugerida)' : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="alerta alerta--advertencia" style={{ marginTop: 0 }}>
                    <p style={{ margin: 0 }}>
                      No hay modalidades de contratación configuradas.{' '}
                      <button
                        type="button"
                        className="btn btn--texto"
                        style={{ padding: 0, fontSize: 'inherit', textDecoration: 'underline' }}
                        onClick={() => navigate('/configuracion')}
                      >
                        Ir a configuración
                      </button>
                    </p>
                  </div>
                )}
              </label>
            </div>
          )}

          {currentStep === 3 && (
            <div>
              <h2 className="wizard-card__title">Etapa 3: Ítems a Adquirir</h2>
              <p className="wizard-card__sub">Detalla cada uno de los productos o servicios que forman parte de la solicitud.</p>

              {datos.items.length === 0 ? (
                <div className="estado-vacio">
                  <p>No has agregado ítems todavía.</p>
                  <button type="button" className="btn btn--primario" onClick={agregarItem}>
                    + Agregar primer ítem
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.2fr 40px', gap: '12px', padding: '0 8px 8px', borderBottom: '1px solid var(--color-borde)', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Descripción</span>
                    <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Cantidad</span>
                    <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Unidad</span>
                    <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Precio Unit. Est. (ARS)</span>
                    <span></span>
                  </div>

                  {datos.items.map((item, idx) => (
                    <div key={idx} className="wizard-item-row">
                      <input
                        value={item.description}
                        onChange={(e) => actualizarItem(idx, 'description', e.target.value)}
                        placeholder="Lavandina concentrada 5L"
                      />
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => actualizarItem(idx, 'quantity', e.target.value)}
                      />
                      <input
                        value={item.unit}
                        onChange={(e) => actualizarItem(idx, 'unit', e.target.value)}
                        placeholder="Bidón"
                      />
                      <input
                        type="number"
                        min="0"
                        value={item.estimatedUnitPrice || ''}
                        onChange={(e) => actualizarItem(idx, 'estimatedUnitPrice', e.target.value)}
                        placeholder="Opcional"
                      />
                      <button
                        type="button"
                        className="btn btn--texto btn--texto-peligro"
                        onClick={() => quitarItem(idx)}
                        title="Quitar ítem"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  <div className="wizard-table-actions">
                    <button type="button" className="btn btn--primario" onClick={agregarItem}>
                      + Agregar ítem
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep === 4 && (
            <div>
              <h2 className="wizard-card__title">Etapa 4: Criterios de Evaluación</h2>
              <p className="wizard-card__sub">
                Define los criterios para evaluar objetivamente a los proveedores. Los criterios excluyentes filtran postores; los ponderados se puntúan 0-100% con un peso asignado.
              </p>

              <h3 className="form__subtitulo">Criterios Excluyentes</h3>
              {criteriosEvaluacion.filter(c => c.type === 'Exclusionary').length === 0 && (
                <p className="form__seccion-ayuda">No hay criterios excluyentes definidos.</p>
              )}
              {criteriosEvaluacion.filter(c => c.type === 'Exclusionary').map((c, idx) => {
                const realIdx = criteriosEvaluacion.indexOf(c)
                return (
                  <div key={idx} className="wizard-item-row" style={{ marginBottom: '8px' }}>
                    <input
                      value={c.name}
                      onChange={e => {
                        const next = [...criteriosEvaluacion]
                        next[realIdx] = { ...next[realIdx], name: e.target.value }
                        setCriteriosEvaluacion(next)
                      }}
                      placeholder="Nombre del criterio (ej: Certificación ISO requerida)"
                      style={{ flex: 2 }}
                    />
                    <input
                      value={c.description || ''}
                      onChange={e => {
                        const next = [...criteriosEvaluacion]
                        next[realIdx] = { ...next[realIdx], description: e.target.value }
                        setCriteriosEvaluacion(next)
                      }}
                      placeholder="Descripción (opcional)"
                      style={{ flex: 3 }}
                    />
                    <button type="button" className="btn btn--texto btn--texto-peligro" onClick={() => {
                      setCriteriosEvaluacion(prev => prev.filter((_, i) => i !== realIdx))
                    }}>✕</button>
                  </div>
                )
              })}
              <button type="button" className="btn btn--primario" onClick={() => {
                setCriteriosEvaluacion(prev => [...prev, { id: null, name: '', description: '', type: 'Exclusionary', weight: 0 }])
              }} style={{ marginBottom: '20px' }}>
                + Agregar criterio excluyente
              </button>

              <h3 className="form__subtitulo">Criterios Ponderados</h3>
              {criteriosEvaluacion.filter(c => c.type === 'Weighted').length === 0 && (
                <p className="form__seccion-ayuda">No hay criterios ponderados definidos.</p>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr 80px 40px', gap: '8px', padding: '0 8px 8px', borderBottom: '1px solid var(--color-borde)', marginBottom: '8px', fontSize: '12px', fontWeight: 'bold' }}>
                <span>Nombre</span>
                <span>Descripción</span>
                <span>Peso %</span>
                <span></span>
              </div>
              {criteriosEvaluacion.filter(c => c.type === 'Weighted').map((c, idx) => {
                const realIdx = criteriosEvaluacion.indexOf(c)
                return (
                  <div key={idx} className="wizard-item-row" style={{ marginBottom: '8px' }}>
                    <input
                      value={c.name}
                      onChange={e => {
                        const next = [...criteriosEvaluacion]
                        next[realIdx] = { ...next[realIdx], name: e.target.value }
                        setCriteriosEvaluacion(next)
                      }}
                      placeholder="Nombre del criterio (ej: Calidad técnica)"
                    />
                    <input
                      value={c.description || ''}
                      onChange={e => {
                        const next = [...criteriosEvaluacion]
                        next[realIdx] = { ...next[realIdx], description: e.target.value }
                        setCriteriosEvaluacion(next)
                      }}
                      placeholder="Descripción (opcional)"
                    />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={c.weight}
                      onChange={e => {
                        const next = [...criteriosEvaluacion]
                        next[realIdx] = { ...next[realIdx], weight: e.target.value }
                        setCriteriosEvaluacion(next)
                      }}
                    />
                    <button type="button" className="btn btn--texto btn--texto-peligro" onClick={() => {
                      setCriteriosEvaluacion(prev => prev.filter((_, i) => i !== realIdx))
                    }}>✕</button>
                  </div>
                )
              })}
              {(() => {
                const weightSum = criteriosEvaluacion.filter(c => c.type === 'Weighted').reduce((s, c) => s + (Number(c.weight) || 0), 0)
                if (criteriosEvaluacion.filter(c => c.type === 'Weighted').length > 0 && weightSum !== 100) {
                  return <div className="alerta alerta--advertencia">La suma de pesos debe ser 100% (actual: {weightSum}%)</div>
                }
                return null
              })()}
              <button type="button" className="btn btn--primario" onClick={() => {
                setCriteriosEvaluacion(prev => [...prev, { id: null, name: '', description: '', type: 'Weighted', weight: 0 }])
              }}>
                + Agregar criterio ponderado
              </button>
            </div>
          )}

          {currentStep === 5 && (
            <div>
              <h2 className="wizard-card__title">Etapa 5: Requisitos de Documentación de Proveedores</h2>
              <p className="wizard-card__sub">Indica qué credenciales y documentación deben tener al día los proveedores para participar.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: '16px 0' }}>
                <label className="campo campo--checkbox">
                  <input
                    type="checkbox"
                    checked={docRequisitos.includes('CuitCertificate')}
                    onChange={(e) => {
                      if (e.target.checked) setDocRequisitos([...docRequisitos, 'CuitCertificate'])
                      else setDocRequisitos(docRequisitos.filter(d => d !== 'CuitCertificate'))
                    }}
                  />
                  <span>Constancia de CUIT (Obligatorio)</span>
                </label>

                <label className="campo campo--checkbox">
                  <input
                    type="checkbox"
                    checked={docRequisitos.includes('TaxCertificate')}
                    onChange={(e) => {
                      if (e.target.checked) setDocRequisitos([...docRequisitos, 'TaxCertificate'])
                      else setDocRequisitos(docRequisitos.filter(d => d !== 'TaxCertificate'))
                    }}
                  />
                  <span>Certificado Fiscal (Inscripciones de impuestos)</span>
                </label>

                <label className="campo campo--checkbox">
                  <input
                    type="checkbox"
                    checked={docRequisitos.includes('LegalDocument')}
                    onChange={(e) => {
                      if (e.target.checked) setDocRequisitos([...docRequisitos, 'LegalDocument'])
                      else setDocRequisitos(docRequisitos.filter(d => d !== 'LegalDocument'))
                    }}
                  />
                  <span>Estatuto Social / Documentación Legal</span>
                </label>

                <label className="campo campo--checkbox">
                  <input
                    type="checkbox"
                    checked={docRequisitos.includes('Other')}
                    onChange={(e) => {
                      if (e.target.checked) setDocRequisitos([...docRequisitos, 'Other'])
                      else setDocRequisitos(docRequisitos.filter(d => d !== 'Other'))
                    }}
                  />
                  <span>Otros antecedentes comerciales</span>
                </label>
              </div>

              <div className="alerta alerta--info" style={{ marginTop: '24px' }}>
                <strong>Regla de Habilitación de la Empresa:</strong>
                <p style={{ margin: '4px 0 0', fontSize: '13px' }}>
                  El sistema exige la validación estricta de documentos globales de la Red de Proveedores antes de permitir ofertas en subastas.
                </p>
              </div>
            </div>
          )}

          {currentStep === 6 && (
            <div>
              <h2 className="wizard-card__title">Etapa 6: Configuración de la Subasta Inversa</h2>
              <p className="wizard-card__sub">Configura las reglas dinámicas para el lance de ofertas de proveedores.</p>

              <label className="campo">
                <span>Duración de la Subasta (minutos)</span>
                <input
                  type="number"
                  min="10"
                  max="120"
                  value={subastaConfig.duracion}
                  onChange={(e) => setSubastaConfig({ ...subastaConfig, duracion: Number(e.target.value) })}
                />
                <span className="campo__ayuda">Mínimo 10 min, máximo 120 min.</span>
              </label>

              <label className="campo">
                <span>Decremento Mínimo por Lance (%)</span>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="10"
                  value={subastaConfig.decremento}
                  onChange={(e) => setSubastaConfig({ ...subastaConfig, decremento: Number(e.target.value) })}
                />
                <span className="campo__ayuda">Los lances sucesivos deben bajar al menos este porcentaje de la oferta actual.</span>
              </label>

              <div className="perfil__solo-lectura" style={{ marginTop: '24px' }}>
                <span>Precio base de subasta: <strong>{formatearPesos(Number(datos.presupuestoEstimado) || 0)}</strong> (Heredado del Presupuesto Estimado)</span>
              </div>
            </div>
          )}

          {currentStep === 7 && (
            <div>
              <h2 className="wizard-card__title">Etapa 7: Invitar Proveedores Verificados</h2>
              <p className="wizard-card__sub">Elige los proveedores de la red oficial a los que deseas enviar la invitación de participación.</p>

              {cargandoProveedores ? (
                <p className="estado-cargando">Cargando proveedores verificados...</p>
              ) : proveedores.length === 0 ? (
                <div className="estado-vacio">
                  <p>No se encontraron proveedores activos y verificados en el directorio global.</p>
                </div>
              ) : (
                <table className="tabla">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>Invitar</th>
                      <th>Razón Social</th>
                      <th>CUIT</th>
                      <th>Rubro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proveedores.map((p) => {
                      const yaInvitado = invitadosIds.includes(p.id)
                      return (
                        <tr key={p.id}>
                          <td>
                            <input
                              type="checkbox"
                              checked={yaInvitado}
                              disabled={yaInvitado}
                              onChange={(e) => manejarInvitacion(p.id, e.target.checked)}
                            />
                          </td>
                          <td>{p.razonSocial}</td>
                          <td><code>{p.cuit}</code></td>
                          <td>{p.rubro}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {currentStep === 8 && (
            <div>
              <h2 className="wizard-card__title">Etapa 8: Revisión y Confirmación del Proceso</h2>
              <p className="wizard-card__sub">Verifica toda la información recopilada del asistente antes de guardar o publicar en cartelera.</p>

              <div className="wizard-summary-section">
                <h3 className="wizard-summary-section__title">
                  <span>Información General</span>
                  <button type="button" className="btn btn--texto" onClick={() => irAlPaso(1)}>Editar</button>
                </h3>
                <div className="wizard-summary-section__content">
                  <p><strong>Título:</strong> {datos.titulo}</p>
                  <p><strong>Descripción:</strong> {datos.descripcion}</p>
                </div>
              </div>

              <div className="wizard-summary-section">
                <h3 className="wizard-summary-section__title">
                  <span>Presupuesto y Modalidad</span>
                  <button type="button" className="btn btn--texto" onClick={() => irAlPaso(2)}>Editar</button>
                </h3>
                <div className="wizard-summary-section__content">
                  <p><strong>Presupuesto Estimado:</strong> {formatearPesos(Number(datos.presupuestoEstimado))}</p>
                  <p><strong>Modalidad Seleccionada:</strong> {modalidadActual?.name ?? 'No especificada'}</p>
                </div>
              </div>

              <div className="wizard-summary-section">
                <h3 className="wizard-summary-section__title">
                  <span>Ítems Adquiridos ({datos.items.length})</span>
                  <button type="button" className="btn btn--texto" onClick={() => irAlPaso(3)}>Editar</button>
                </h3>
                <div className="wizard-summary-section__content">
                  <table className="tabla">
                    <thead>
                      <tr>
                        <th>Descripción</th>
                        <th>Cantidad</th>
                        <th>Unidad</th>
                        <th>Precio Unitario Est.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {datos.items.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.description}</td>
                          <td>{item.quantity}</td>
                          <td>{item.unit}</td>
                          <td>{item.estimatedUnitPrice ? formatearPesos(Number(item.estimatedUnitPrice)) : '---'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="wizard-summary-section">
                <h3 className="wizard-summary-section__title">
                  <span>Criterios de Evaluación</span>
                  <button type="button" className="btn btn--texto" onClick={() => irAlPaso(4)}>Editar</button>
                </h3>
                <div className="wizard-summary-section__content">
                  {criteriosEvaluacion.length === 0 ? (
                    <p style={{ color: 'var(--color-error-tx)' }}>Sin criterios definidos. Debes definir al menos uno.</p>
                  ) : (
                    <div>
                      {criteriosEvaluacion.filter(c => c.type === 'Exclusionary').length > 0 && (
                        <p><strong>Excluyentes:</strong> {criteriosEvaluacion.filter(c => c.type === 'Exclusionary').map(c => c.name).join(', ')}</p>
                      )}
                      {criteriosEvaluacion.filter(c => c.type === 'Weighted').length > 0 && (
                        <p><strong>Ponderados:</strong> {criteriosEvaluacion.filter(c => c.type === 'Weighted').map(c => `${c.name} (${c.weight}%)`).join(', ')}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="wizard-summary-section">
                <h3 className="wizard-summary-section__title">
                  <span>Requisitos de Documentación</span>
                  <button type="button" className="btn btn--texto" onClick={() => irAlPaso(5)}>Editar</button>
                </h3>
                <div className="wizard-summary-section__content">
                  <p><strong>Tipos exigidos:</strong> {docRequisitos.map(d => {
                    if (d === 'CuitCertificate') return 'Constancia de CUIT'
                    if (d === 'TaxCertificate') return 'Certificado Fiscal'
                    if (d === 'LegalDocument') return 'Estatuto Legal'
                    return 'Otro'
                  }).join(', ')}</p>
                </div>
              </div>

              <div className="wizard-summary-section">
                <h3 className="wizard-summary-section__title">
                  <span>Configuración de la Subasta</span>
                  <button type="button" className="btn btn--texto" onClick={() => irAlPaso(6)}>Editar</button>
                </h3>
                <div className="wizard-summary-section__content">
                  <p><strong>Precio Base:</strong> {formatearPesos(Number(datos.presupuestoEstimado))}</p>
                  <p><strong>Duración de Subasta:</strong> {subastaConfig.duracion} minutos</p>
                  <p><strong>Decremento Mínimo:</strong> {subastaConfig.decremento}%</p>
                </div>
              </div>

              <div className="wizard-summary-section">
                <h3 className="wizard-summary-section__title">
                  <span>Proveedores Invitados ({invitadosIds.length})</span>
                  <button type="button" className="btn btn--texto" onClick={() => irAlPaso(7)}>Editar</button>
                </h3>
                <div className="wizard-summary-section__content">
                  {invitadosIds.length === 0 ? (
                    <p style={{ color: 'var(--color-error-tx)' }}>Sin proveedores invitados. Debes elegir al menos uno.</p>
                  ) : (
                    <p>Total de proveedores de la red seleccionados: {invitadosIds.length}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Stepper Navigation Buttons */}
          <div className="wizard-step-actions">
            {currentStep > 1 ? (
              <button type="button" className="btn btn--texto" onClick={anterior} disabled={guardando}>
                ← Anterior
              </button>
            ) : (
              <button type="button" className="btn btn--texto" onClick={() => navigate('/compras')} disabled={guardando}>
                Volver al Listado
              </button>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn btn--texto"
                onClick={() => {
                  if (id) localStorage.removeItem('wizard_step_' + id)
                  navigate('/compras')
                }}
                disabled={guardando}
              >
                Guardar como Borrador
              </button>

              {currentStep < 8 ? (
                <button type="button" className="btn btn--primario" onClick={siguiente} disabled={guardando}>
                  {guardando ? 'Guardando…' : 'Siguiente →'}
                </button>
              ) : (
                <button type="button" className="btn btn--primario" onClick={publicar} disabled={guardando || invitadosIds.length === 0}>
                  {guardando ? 'Publicando…' : 'Publicar Proceso'}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Read-only details screen for published/approved processes */
        <div className="form">
          {proceso && (
            <div className="perfil__solo-lectura" style={{ marginBottom: '24px' }}>
              <span>Código del Proceso: <strong>{proceso.codigo}</strong></span>
              <span>Fecha de Creación: {proceso.creadoEn}</span>
              <span>Estado: <strong style={{ color: 'var(--color-primario)' }}>{etiquetaEstado(proceso.estado)}</strong></span>
              {proceso.specificationsHash && (
                <span>Hash de Especificaciones: <code>{proceso.specificationsHash}</code></span>
              )}
            </div>
          )}

          <div className="wizard-summary-section">
            <h3 className="wizard-summary-section__title">Información General</h3>
            <div className="wizard-summary-section__content">
              <p><strong>Título:</strong> {datos.titulo}</p>
              <p><strong>Descripción:</strong> {datos.descripcion}</p>
            </div>
          </div>

          <div className="wizard-summary-section">
            <h3 className="wizard-summary-section__title">Presupuesto y Modalidad</h3>
            <div className="wizard-summary-section__content">
              <p><strong>Presupuesto Estimado:</strong> {formatearPesos(Number(datos.presupuestoEstimado))}</p>
              <p><strong>Modalidad:</strong> {modalidadActual?.name ?? 'No especificada'}</p>
            </div>
          </div>

          <div className="wizard-summary-section">
            <h3 className="wizard-summary-section__title">Ítems Adquiridos ({datos.items.length})</h3>
            <div className="wizard-summary-section__content">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Descripción</th>
                    <th>Cantidad</th>
                    <th>Unidad</th>
                    <th>Precio Unitario Est.</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.items.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.description}</td>
                      <td>{item.quantity}</td>
                      <td>{item.unit}</td>
                      <td>{item.estimatedUnitPrice ? formatearPesos(Number(item.estimatedUnitPrice)) : '---'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="wizard-summary-section">
            <h3 className="wizard-summary-section__title">Invitaciones y Respuestas ({invitaciones.length})</h3>
            <div className="wizard-summary-section__content">
              {invitaciones.length === 0 ? (
                <p>No se enviaron invitaciones para este proceso.</p>
              ) : (
                <table className="tabla">
                  <thead>
                    <tr>
                      <th>Proveedor</th>
                      <th>CUIT</th>
                      <th>Estado</th>
                      <th>Detalle/Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invitaciones.map((inv) => {
                      const est = inv.estado === 'pendiente' ? { texto: 'Pendiente', clase: 'badge--warn' } :
                                  inv.estado === 'aceptada' ? { texto: 'Aceptada', clase: 'badge--ok' } :
                                  { texto: 'Rechazada', clase: 'badge--error' }
                      return (
                        <tr key={inv.id}>
                          <td>{inv.proveedor}</td>
                          <td><code>{inv.cuit}</code></td>
                          <td>
                            <span className={`badge ${est.clase}`}>{est.texto}</span>
                          </td>
                          <td>
                            {inv.estado === 'rechazada' && inv.rejectionReason ? (
                              <span>Rechazado: {inv.rejectionReason}</span>
                            ) : inv.estado === 'aceptada' ? (
                              <span>Confirmado</span>
                            ) : (
                              <span>Esperando respuesta</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {(proceso?.ordenesCompra ?? []).map((orden) => (
            <OrdenCompraRecepcion
              key={orden.id}
              proceso={proceso}
              ordenCompra={orden}
              recepcionEstado={recepcionEstado}
              setRecepcionEstado={setRecepcionEstado}
              recepcionObservaciones={recepcionObservaciones}
              setRecepcionObservaciones={setRecepcionObservaciones}
              recepcionCantidades={recepcionCantidades}
              setRecepcionCantidades={setRecepcionCantidades}
              registrandoRecepcion={registrandoRecepcion}
              registrarRecepcion={registrarRecepcion}
            />
          ))}

          {proceso?.adjudicacion && (
            <div className="alerta alerta--ok" style={{ marginTop: '24px' }}>
              {proceso.estado === ESTADO_PROCESO.APROBADA
                ? `Adjudicado y aprobado: ${proceso.adjudicacion.proveedor} (${proceso.adjudicacion.fecha}).`
                : `Adjudicado a ${proceso.adjudicacion.proveedor}, pendiente de aprobación de la Autoridad.`}
            </div>
          )}

          {proceso?.aprobacion?.estado === 'rechazada' && (
            <div className="alerta alerta--error" style={{ marginTop: '24px' }}>
              La Autoridad rechazó la adjudicación. Motivo: {proceso.aprobacion.motivo}
            </div>
          )}

          <div className="form__acciones" style={{ marginTop: '24px' }}>
            <button
              type="button"
              className="btn btn--texto"
              onClick={() => navigate('/compras')}
            >
              Volver
            </button>
          </div>
        </div>
      )}

      {/* Resumen de la subasta (si el proceso ya pasó por ella o está en curso) */}
      {subasta && <ResumenSubasta subasta={subasta} />}
    </section>
  )
}

function OrdenCompraRecepcion({
  proceso,
  ordenCompra,
  recepcionEstado,
  setRecepcionEstado,
  recepcionObservaciones,
  setRecepcionObservaciones,
  recepcionCantidades,
  setRecepcionCantidades,
  registrandoRecepcion,
  registrarRecepcion,
}) {
  const pendientes = calcularPendientesRecepcion(proceso, ordenCompra)
  const puedeRecibir = ordenCompra.estado !== 'recibida' && ordenCompra.estado !== 'cancelada' &&
    pendientes.some((item) => item.pendiente > 0)

  return (
    <div className="wizard-summary-section">
      <h3 className="wizard-summary-section__title">Recepcion y conformidad</h3>
      <div className="wizard-summary-section__content">
        <div className="perfil__solo-lectura" style={{ marginBottom: '16px' }}>
          <span>Orden: <strong>{ordenCompra.numero}</strong></span>
          <span>Proveedor: <strong>{ordenCompra.proveedor}</strong></span>
          <span>Monto: <strong>{formatearPesos(Number(ordenCompra.monto) || 0)}</strong></span>
          <span>Estado: <strong>{etiquetaEstadoOrdenCompra(ordenCompra.estado)}</strong></span>
          {ordenCompra.documentoUrl && (
            <span>
              <a href={ordenCompra.documentoUrl} target="_blank" rel="noreferrer">Ver orden PDF</a>
            </span>
          )}
        </div>

        <table className="tabla">
          <thead>
            <tr>
              <th>Item</th>
              <th>Ordenado</th>
              <th>Recibido</th>
              <th>Pendiente</th>
              {puedeRecibir && <th>Recibir ahora</th>}
            </tr>
          </thead>
          <tbody>
            {pendientes.map((item) => {
              const inputKey = recepcionCantidadKey(ordenCompra.id, item.purchaseItemId)
              return (
                <tr key={item.purchaseItemId}>
                  <td>{item.descripcion}</td>
                  <td>{item.ordenado} {item.unidad}</td>
                  <td>{item.recibido} {item.unidad}</td>
                  <td>{item.pendiente} {item.unidad}</td>
                  {puedeRecibir && (
                    <td>
                      <input
                        type="number"
                        min="0"
                        max={item.pendiente}
                        step="0.01"
                        value={recepcionCantidades[inputKey] ?? ''}
                        onChange={(e) => setRecepcionCantidades((prev) => ({
                          ...prev,
                          [inputKey]: e.target.value,
                        }))}
                        placeholder="0"
                        style={{ maxWidth: '120px' }}
                        disabled={item.pendiente <= 0 || registrandoRecepcion}
                      />
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>

        {puedeRecibir && (
          <div style={{ marginTop: '16px', display: 'grid', gap: '12px' }}>
            <label className="campo">
              <span>Conformidad</span>
              <select
                value={recepcionEstado}
                onChange={(e) => setRecepcionEstado(e.target.value)}
                disabled={registrandoRecepcion}
              >
                <option value="Accepted">Conforme</option>
                <option value="AcceptedWithObservations">Conforme con observaciones</option>
                <option value="Rejected">Rechazada</option>
              </select>
            </label>

            <label className="campo">
              <span>Observaciones</span>
              <textarea
                rows={3}
                value={recepcionObservaciones}
                onChange={(e) => setRecepcionObservaciones(e.target.value)}
                placeholder="Detalle de entrega, remito, diferencias o comentarios de conformidad."
                disabled={registrandoRecepcion}
              />
            </label>

            <div className="form__acciones">
              <button
                type="button"
                className="btn btn--primario"
                onClick={() => registrarRecepcion(ordenCompra)}
                disabled={registrandoRecepcion}
              >
                {registrandoRecepcion ? 'Registrando...' : 'Registrar recepcion'}
              </button>
            </div>
          </div>
        )}

        {ordenCompra.recepciones.length > 0 && (
          <>
            <h4 className="form__subtitulo" style={{ marginTop: '20px' }}>Recepciones registradas</h4>
            <table className="tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Conformidad</th>
                  <th>Recibio</th>
                  <th>Items</th>
                  <th>Documento</th>
                </tr>
              </thead>
              <tbody>
                {ordenCompra.recepciones.map((recepcion) => (
                  <tr key={recepcion.id}>
                    <td>{formatearFecha(recepcion.recibidaEn)}</td>
                    <td>{etiquetaEstadoRecepcion(recepcion.estado)}</td>
                    <td>{recepcion.receptor || '---'}</td>
                    <td>
                      {recepcion.items.map((item) => `${item.descripcion}: ${item.cantidadRecibida} ${item.unidad}`).join(', ')}
                    </td>
                    <td>
                      {recepcion.documentoUrl ? (
                        <a href={recepcion.documentoUrl} target="_blank" rel="noreferrer">PDF</a>
                      ) : '---'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  )
}

function ResumenSubasta({ subasta }) {
  const a = analisisSubasta(subasta)
  const lances = [...subasta.lances].sort((x, y) => x.monto - y.monto)
  return (
    <div className="form" style={{ marginTop: '24px' }}>
      <h2 className="form__titulo">Resultado de la subasta</h2>
      <div className="perfil__solo-lectura">
        <span>Proveedores que ofertaron: {a.oferentes}</span>
        <span>Lances totales: {a.cantidadLances}</span>
        <span>Presupuesto base: {formatearPesos(a.base)}</span>
        <span>Mejor oferta: {formatearPesos(a.mejor)}</span>
        <span>Baja lograda: {a.bajaPorcentaje.toFixed(1)}%</span>
      </div>

      <h3 className="form__subtitulo" style={{ marginTop: '16px' }}>Lances ({lances.length})</h3>
      {lances.length === 0 ? (
        <p className="form__seccion-ayuda">No hay lances registrados en esta subasta.</p>
      ) : (
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
      )}
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

function calcularPendientesRecepcion(proceso, ordenCompra) {
  const itemsOrdenados = obtenerItemsOrdenados(proceso, ordenCompra)
  return itemsOrdenados.map((item) => {
    const recibido = (ordenCompra.recepciones ?? [])
      .filter((recepcion) => recepcion.estado !== 'rechazada')
      .flatMap((recepcion) => recepcion.items ?? [])
      .filter((recepcionItem) => recepcionItem.purchaseItemId === item.purchaseItemId)
      .reduce((total, recepcionItem) => total + Number(recepcionItem.cantidadRecibida || 0), 0)
    const pendiente = Math.max(0, Number(item.ordenado || 0) - recibido)

    return {
      ...item,
      recibido,
      pendiente,
    }
  })
}

function obtenerItemsOrdenados(proceso, ordenCompra) {
  const itemsProceso = new Map((proceso.items ?? []).map((item) => [item.id, item]))
  const adjudicacion = (proceso.adjudicaciones ?? []).find((award) => {
    const contrato = (proceso.contratos ?? []).find((c) => c.id === ordenCompra.contratoId)
    return contrato ? award.id === contrato.awardId : award.proveedorId === ordenCompra.proveedorId
  })
  const awardItems = adjudicacion?.items ?? proceso.adjudicacion?.items ?? []

  if (awardItems.length > 0) {
    return awardItems.map((item) => ({
      purchaseItemId: item.purchaseItemId,
      descripcion: item.description,
      ordenado: Number(item.quantity) || 0,
      unidad: item.unit || itemsProceso.get(item.purchaseItemId)?.unit || '',
    }))
  }

  return (proceso.items ?? []).map((item) => ({
    purchaseItemId: item.id,
    descripcion: item.description,
    ordenado: Number(item.quantity) || 0,
    unidad: item.unit || '',
  }))
}

function recepcionCantidadKey(ordenCompraId, purchaseItemId) {
  return `${ordenCompraId}:${purchaseItemId}`
}

function etiquetaEstadoOrdenCompra(estado) {
  return {
    emitida: 'Emitida',
    parcial: 'Recepcion parcial',
    recibida: 'Recibida',
    cancelada: 'Cancelada',
  }[estado] ?? estado
}

function etiquetaEstadoRecepcion(estado) {
  return {
    aceptada: 'Conforme',
    aceptada_observaciones: 'Conforme con observaciones',
    rechazada: 'Rechazada',
  }[estado] ?? estado
}

function formatearFecha(fecha) {
  if (!fecha) return '---'
  return new Date(fecha).toLocaleDateString('es-AR')
}
