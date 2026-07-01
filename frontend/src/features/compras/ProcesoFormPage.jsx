// Alta, edición y vista de un proceso de compra implementando el Wizard de 7 etapas.
//
// - Sin :id  -> alta (asistente desde Etapa 1).
// - Con :id y estado borrador -> edición (asistente retomable desde la etapa en la que se dejó).
// - Con :id y estado no editable -> vista de solo lectura (resumen del proceso).

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, ArrowLeft, ArrowRight } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import {
  obtenerProceso,
  crearProceso,
  actualizarProceso,
  publicarProceso,
  sugerirModalidadContratacion,
  listarInvitacionesProceso,
  invitarProveedorAProceso,
  confirmarRecepcion,
  registrarPagoContrato,
  obtenerCriteriosEvaluacion,
  guardarCriteriosEvaluacion,
} from '../../api/comprasApi'
import { obtenerSubastaDeProceso } from '../../api/subastasApi'
import { listarProveedores } from '../../api/proveedoresApi'
import { listarModalidadesContratacion } from '../../api/configuracionApi'
import { esEditable, etiquetaEstado, claseEstado } from '../../domain/compras'
import { Spinner } from '../../components/ui/Spinner.jsx'
import { Badge } from '../../components/ui/Badge'
import { Alert } from '../../components/ui/Alert'
import { AnimatedPage } from '../../components/ui/AnimatedPage.jsx'

// Import de pasos del wizard
import { Paso1DatosBasicos } from './components/ProcesoFormSteps/Paso1DatosBasicos.jsx'
import { Paso2Presupuesto } from './components/ProcesoFormSteps/Paso2Presupuesto.jsx'
import { Paso3Items } from './components/ProcesoFormSteps/Paso3Items.jsx'
import { Paso4Criterios } from './components/ProcesoFormSteps/Paso4Criterios.jsx'
import { Paso5Requisitos } from './components/ProcesoFormSteps/Paso5Requisitos.jsx'
import { Paso6Subasta } from './components/ProcesoFormSteps/Paso6Subasta.jsx'
import { Paso7Invitaciones } from './components/ProcesoFormSteps/Paso7Invitaciones.jsx'
import { Paso8Revision } from './components/ProcesoFormSteps/Paso8Revision.jsx'
import { ProcesoSoloLectura } from './components/ProcesoFormSteps/ProcesoSoloLectura.jsx'

const VACIO = { titulo: '', descripcion: '', presupuestoEstimado: '', modalidadContratacionId: '', items: [] }

const procesoSchema = z.object({
  titulo: z.string().trim().min(1, 'El titulo es obligatorio.'),
  descripcion: z.string().trim().min(1, 'La descripcion es obligatoria.'),
  presupuestoEstimado: z.coerce.number({ message: 'El presupuesto estimado debe ser numerico.' }).positive('El presupuesto estimado debe ser mayor a cero.'),
  modalidadContratacionId: z.string().optional(),
})

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
  const {
    register,
    reset,
    setValue,
    trigger,
    formState: { errors: formErrors },
  } = useForm({
    resolver: zodResolver(procesoSchema),
    defaultValues: {
      titulo: '',
      descripcion: '',
      presupuestoEstimado: '',
      modalidadContratacionId: '',
    },
  })
  
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
  const [pagoContrato, setPagoContrato] = useState({
    fechaPago: new Date().toISOString().slice(0, 10),
    montoPago: '',
    montoPenalidad: '',
    diasDemora: '',
    notas: '',
  })
  const [registrandoPago, setRegistrandoPago] = useState(false)

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
        reset({
          titulo: p.titulo,
          descripcion: p.descripcion,
          presupuestoEstimado: String(p.presupuestoEstimado || ''),
          modalidadContratacionId: p.modalidadContratacionId || '',
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
  }, [esNuevo, tenantId, id, reset])

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
  async function validarPaso(step) {
    if (step === 1) {
      const ok = await trigger(['titulo', 'descripcion'])
      if (!ok) return 'Revisa los campos obligatorios de datos basicos.'
    }
    if (step === 2) {
      const ok = await trigger(['presupuestoEstimado', 'modalidadContratacionId'])
      if (!ok) return 'Revisa los campos de presupuesto y modalidad.'
    }
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
        const err = await validarPaso(s)
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
    const err = await validarPaso(currentStep)
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
    const err = await validarPaso(8)
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
    setValue(campo, valor, {
      shouldDirty: true,
      shouldValidate: ['titulo', 'descripcion', 'presupuestoEstimado', 'modalidadContratacionId'].includes(campo),
    })
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

    // items from input values
    const items = (ordenCompra.items ?? proceso.items ?? [])
      .map((item) => {
        const purchaseItemId = item.purchaseItemId || item.id
        const inputKey = `${ordenCompra.id}:${purchaseItemId}`
        return {
          purchaseItemId,
          quantityReceived: Number(recepcionCantidades[inputKey]) || 0,
        }
      })
      .filter((item) => item.quantityReceived > 0)

    if (items.length === 0) {
      setError('Ingresá al menos una cantidad recibida mayor a cero.')
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

  async function registrarPago(contrato) {
    if (!contrato || !usuario?.id) return

    setRegistrandoPago(true)
    setError('')
    try {
      await registrarPagoContrato({
        tenantId,
        contratoId: contrato.id,
        operadorId: usuario.id,
        fechaPago: pagoContrato.fechaPago,
        montoPago: pagoContrato.montoPago,
        montoPenalidad: pagoContrato.montoPenalidad,
        diasDemora: pagoContrato.diasDemora,
        notas: pagoContrato.notas,
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
      setPagoContrato({
        fechaPago: new Date().toISOString().slice(0, 10),
        montoPago: '',
        montoPenalidad: '',
        diasDemora: '',
        notas: '',
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setRegistrandoPago(false)
    }
  }

  if (cargando) return <div className="flex justify-center py-12"><Spinner /></div>

  const modalidadActual = modalidades.find((m) => m.id === datos.modalidadContratacionId)

  return (
    <AnimatedPage>
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
          <Badge variant={claseEstado(proceso.estado)}>{etiquetaEstado(proceso.estado)}</Badge>
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
                  {isCompleted ? <Check size={14} /> : etapa.nro}
                </div>
                <div className="wizard-progress__label">{etapa.label}</div>
              </div>
            )
          })}
        </div>
      )}

      {error && <Alert variant="error">{error}</Alert>}

      {/* Wizard Card Body */}
      {editable ? (
        <div className="wizard-card">
          {currentStep === 1 && (
            <Paso1DatosBasicos
              register={register}
              datos={datos}
              actualizarDatos={actualizarDatos}
              formErrors={formErrors}
            />
          )}

          {currentStep === 2 && (
            <Paso2Presupuesto
              register={register}
              datos={datos}
              actualizarDatos={actualizarDatos}
              formErrors={formErrors}
              modalidadSugerida={modalidadSugerida}
              modalidades={modalidades}
              navigate={navigate}
            />
          )}

          {currentStep === 3 && (
            <Paso3Items
              datos={datos}
              agregarItem={agregarItem}
              actualizarItem={actualizarItem}
              quitarItem={quitarItem}
            />
          )}

          {currentStep === 4 && (
            <Paso4Criterios
              criteriosEvaluacion={criteriosEvaluacion}
              setCriteriosEvaluacion={setCriteriosEvaluacion}
            />
          )}

          {currentStep === 5 && (
            <Paso5Requisitos
              docRequisitos={docRequisitos}
              setDocRequisitos={setDocRequisitos}
            />
          )}

          {currentStep === 6 && (
            <Paso6Subasta
              subastaConfig={subastaConfig}
              setSubastaConfig={setSubastaConfig}
              datos={datos}
              formatearPesos={formatearPesos}
            />
          )}

          {currentStep === 7 && (
            <Paso7Invitaciones
              cargandoProveedores={cargandoProveedores}
              proveedores={proveedores}
              invitadosIds={invitadosIds}
              manejarInvitacion={manejarInvitacion}
            />
          )}

          {currentStep === 8 && (
            <Paso8Revision
              datos={datos}
              modalidadActual={modalidadActual}
              formatearPesos={formatearPesos}
              criteriosEvaluacion={criteriosEvaluacion}
              docRequisitos={docRequisitos}
              subastaConfig={subastaConfig}
              invitadosIds={invitadosIds}
              irAlPaso={irAlPaso}
            />
          )}

          {/* Stepper Navigation Buttons */}
          <div className="wizard-step-actions">
            {currentStep > 1 ? (
              <button type="button" className="btn btn--texto" onClick={anterior} disabled={guardando}>
                <ArrowLeft size={16} /> Anterior
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
                  {guardando ? (
                    'Guardando...'
                  ) : (
                    <>
                      Siguiente <ArrowRight size={16} />
                    </>
                  )}
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
        <ProcesoSoloLectura
          proceso={proceso}
          datos={datos}
          modalidadActual={modalidadActual}
          formatearPesos={formatearPesos}
          invitaciones={invitaciones}
          recepcionEstado={recepcionEstado}
          setRecepcionEstado={setRecepcionEstado}
          recepcionObservaciones={recepcionObservaciones}
          setRecepcionObservaciones={setRecepcionObservaciones}
          recepcionCantidades={recepcionCantidades}
          setRecepcionCantidades={setRecepcionCantidades}
          registrandoRecepcion={registrandoRecepcion}
          registrarRecepcion={registrarRecepcion}
          pagoContrato={pagoContrato}
          setPagoContrato={setPagoContrato}
          registrandoPago={registrandoPago}
          registrarPago={registrarPago}
          subasta={subasta}
          navigate={navigate}
        />
      )}
    </section>
    </AnimatedPage>
  )
}

function formatearPesos(monto) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(monto)
}
