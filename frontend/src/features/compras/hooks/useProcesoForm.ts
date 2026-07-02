import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  actualizarProceso,
  confirmarRecepcion,
  crearProceso,
  guardarCriteriosEvaluacion,
  invitarProveedorAProceso,
  listarInvitacionesProceso,
  obtenerCriteriosEvaluacion,
  obtenerProceso,
  publicarProceso,
  registrarPagoContrato,
  sugerirModalidadContratacion,
  type ContractMapped,
  type CrearProcesoInput,
  type InvitacionMapped,
  type ProcesoItem,
  type ProcesoItemInput,
  type ProcesoMapped,
  type PurchaseOrderMapped,
} from '../../../shared/api/comprasApi'
import { listarModalidadesContratacion, type ContractingModeDto } from '../../../shared/api/configuracionApi'
import { obtenerSubastaDeProceso, type SubastaMapped } from '../../../shared/api/subastasApi'
import { esEditable } from '../../../domain/compras'
import type { Usuario } from '../../../domain/entities'
import { useProveedores } from '../../proveedor/hooks/useProveedores'
import { procesosKeys } from '../data/procesosData'
import { subastaKeys } from '../../subasta/data/subastaData'

interface ProcesoFormItem extends ProcesoItemInput {
  id?: string
}

interface ProcesoFormData {
  titulo: string
  descripcion: string
  presupuestoEstimado: string
  modalidadContratacionId: string
  items: ProcesoFormItem[]
}

interface CriterioEvaluacionForm {
  id?: string | null
  name: string
  description: string
  type: string
  weight: number | string
  sortOrder?: number
}

interface PagoContratoForm {
  fechaPago: string
  montoPago: string
  montoPenalidad: string
  diasDemora: string
  notas: string
}

interface NavigateFn {
  (to: string, options?: { replace?: boolean }): void
}

interface UseProcesoFormParams {
  id?: string
  tenantId?: string | null
  usuario: Usuario
  navigate: NavigateFn
}

type RecepcionCantidades = Record<string, number | string>

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Ocurrio un error inesperado.'
}

export const PROCESO_FORM_VACIO: ProcesoFormData = {
  titulo: '',
  descripcion: '',
  presupuestoEstimado: '',
  modalidadContratacionId: '',
  items: [],
}

export const PROCESO_FORM_ETAPAS = [
  { nro: 1, label: 'Datos Basicos' },
  { nro: 2, label: 'Presupuesto' },
  { nro: 3, label: 'Items' },
  { nro: 4, label: 'Criterios' },
  { nro: 5, label: 'Requisitos' },
  { nro: 6, label: 'Subasta' },
  { nro: 7, label: 'Invitaciones' },
  { nro: 8, label: 'Revision' },
]

const procesoSchema = z.object({
  titulo: z.string().trim().min(1, 'El titulo es obligatorio.'),
  descripcion: z.string().trim().min(1, 'La descripcion es obligatoria.'),
  presupuestoEstimado: z.coerce.number({ message: 'El presupuesto estimado debe ser numerico.' }).positive('El presupuesto estimado debe ser mayor a cero.'),
  modalidadContratacionId: z.string().optional(),
})

export function useProcesoForm({ id, tenantId, usuario, navigate }: UseProcesoFormParams) {
  const queryClient = useQueryClient()
  const esNuevo = !id
  const [currentStep, setCurrentStep] = useState(1)
  const [datos, setDatos] = useState<ProcesoFormData>(PROCESO_FORM_VACIO)
  const [proceso, setProceso] = useState<ProcesoMapped | null>(null)
  const [subasta, setSubasta] = useState<SubastaMapped | null>(null)
  const [cargando, setCargando] = useState(!esNuevo)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [modalidades, setModalidades] = useState<ContractingModeDto[]>([])
  const [modalidadSugerida, setModalidadSugerida] = useState<ContractingModeDto | null>(null)
  const [criteriosEvaluacion, setCriteriosEvaluacion] = useState<CriterioEvaluacionForm[]>([])
  const [docRequisitos, setDocRequisitos] = useState<string[]>(() => leerJsonLocal<string[]>(`wizard_docs_${id}`, [
    'CuitCertificate',
    'TaxCertificate',
    'LegalDocument',
  ]))
  const [subastaConfig, setSubastaConfig] = useState(() => ({
    duracion: Number(localStorage.getItem(`auction_duration_${id}`)) || 10,
    decremento: Number(localStorage.getItem(`auction_decrement_${id}`)) || 1,
  }))
  const [invitadosIds, setInvitadosIds] = useState<string[]>([])
  const [invitaciones, setInvitaciones] = useState<InvitacionMapped[]>([])
  const [recepcionEstado, setRecepcionEstado] = useState('Accepted')
  const [recepcionObservaciones, setRecepcionObservaciones] = useState('')
  const [recepcionCantidades, setRecepcionCantidades] = useState<RecepcionCantidades>({})
  const [registrandoRecepcion, setRegistrandoRecepcion] = useState(false)
  const [pagoContrato, setPagoContrato] = useState<PagoContratoForm>(crearPagoInicial)
  const [registrandoPago, setRegistrandoPago] = useState(false)

  const form = useForm({
    resolver: zodResolver(procesoSchema),
    defaultValues: {
      titulo: '',
      descripcion: '',
      presupuestoEstimado: '',
      modalidadContratacionId: '',
    },
  })

  const { reset, setValue, trigger } = form
  const editable = esNuevo || (proceso && esEditable(proceso.estado))
  const modalidadActual = useMemo(
    () => modalidades.find((m) => m.id === datos.modalidadContratacionId),
    [datos.modalidadContratacionId, modalidades],
  )
  const proveedoresState = useProveedores({
    tenantId,
    soloVerificados: true,
    enabled: Boolean(tenantId && currentStep === 7),
  })

  async function invalidarProceso(procesoId = id) {
    if (!tenantId || !procesoId) return
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: procesosKeys.lists() }),
      queryClient.invalidateQueries({ queryKey: procesosKeys.detail(tenantId, procesoId) }),
      queryClient.invalidateQueries({ queryKey: subastaKeys.proceso(tenantId, procesoId) }),
    ])
  }

  useEffect(() => {
    if (esNuevo || !tenantId) return

    cargarProceso()
    obtenerCriteriosEvaluacion({ tenantId, procesoId: id })
      .then((crits) => setCriteriosEvaluacion(crits.map(mapCriterioForm)))
      .catch(() => setCriteriosEvaluacion([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esNuevo, tenantId, id, reset])

  useEffect(() => {
    if (!tenantId) return

    listarModalidadesContratacion({ tenantId })
      .then(setModalidades)
      .catch(() => setModalidades([]))
  }, [tenantId])

  useEffect(() => {
    if (proveedoresState.error) setError(proveedoresState.error)
  }, [proveedoresState.error])

  useEffect(() => {
    if (id) localStorage.setItem(`wizard_docs_${id}`, JSON.stringify(docRequisitos))
  }, [docRequisitos, id])

  useEffect(() => {
    if (!id) return
    localStorage.setItem(`auction_duration_${id}`, String(subastaConfig.duracion))
    localStorage.setItem(`auction_decrement_${id}`, String(subastaConfig.decremento))
  }, [id, subastaConfig])

  useEffect(() => {
    if (!editable || !tenantId || !datos.presupuestoEstimado) return undefined

    const amount = Number(datos.presupuestoEstimado)
    if (!Number.isFinite(amount) || amount < 0) return undefined

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

  useEffect(() => {
    if (esNuevo || !editable || !id) return undefined

    const timeout = setTimeout(async () => {
      try {
        if (tenantId && datos.titulo.trim()) await actualizarProceso({ tenantId, id, datos: mapProcesoFormPayload(datos) })
      } catch (err) {
        console.error('Auto-save fallido:', err)
      }
    }, 1200)

    return () => clearTimeout(timeout)
  }, [datos, editable, esNuevo, id, tenantId])

  async function cargarProceso() {
    if (!tenantId || !id) return
    setCargando(true)
    setError('')
    try {
      const p = await obtenerProceso({ tenantId, id })
      aplicarProceso(p)

      if (!esEditable(p.estado)) {
        setCurrentStep(7)
      } else {
        const savedStep = Number(localStorage.getItem(`wizard_step_${id}`))
        if (savedStep >= 1 && savedStep <= 8) setCurrentStep(savedStep)
      }

      const invs = await listarInvitacionesProceso({ tenantId, procesoId: id })
      setInvitaciones(invs)
      setInvitadosIds(invs.map((i) => i.proveedorId))

      if (p.tieneSubasta) {
        setSubasta(await obtenerSubastaDeProceso({ tenantId, procesoId: id }))
      } else {
        setSubasta(null)
      }
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setCargando(false)
    }
  }

  function aplicarProceso(p: ProcesoMapped) {
    const nuevosDatos = {
      titulo: p.titulo,
      descripcion: p.descripcion ?? '',
      presupuestoEstimado: String(p.presupuestoEstimado || ''),
      modalidadContratacionId: p.modalidadContratacionId || '',
      items: (p.items || []).map(mapItemForm),
    }
    setProceso(p)
    setDatos(nuevosDatos)
    reset({
      titulo: nuevosDatos.titulo,
      descripcion: nuevosDatos.descripcion,
      presupuestoEstimado: nuevosDatos.presupuestoEstimado,
      modalidadContratacionId: nuevosDatos.modalidadContratacionId,
    })
  }

  async function guardarCriterios() {
    if (criteriosEvaluacion.length === 0 || !tenantId || !id) return

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
  }

  async function validarPaso(step: number): Promise<string | null> {
    if (step === 1) {
      const ok = await trigger(['titulo', 'descripcion'])
      if (!ok) return 'Revisa los campos obligatorios de datos basicos.'
      if (!datos.titulo?.trim()) return 'El titulo es obligatorio.'
      if (!datos.descripcion?.trim()) return 'La descripcion es obligatoria.'
    }
    if (step === 2) {
      const ok = await trigger(['presupuestoEstimado', 'modalidadContratacionId'])
      if (!ok) return 'Revisa los campos de presupuesto y modalidad.'
      const budget = Number(datos.presupuestoEstimado)
      if (Number.isNaN(budget) || budget <= 0) return 'El presupuesto estimado debe ser mayor a cero.'
      if (modalidades.length > 0 && !datos.modalidadContratacionId) return 'Debe seleccionarse una modalidad de contratacion.'
    }
    if (step === 3) {
      if (!datos.items || datos.items.length === 0) return 'Debe agregar al menos un item al proceso.'
      for (let i = 0; i < datos.items.length; i += 1) {
        const it = datos.items[i]
        if (!it.description?.trim()) return `El item ${i + 1} debe tener una descripcion.`
        const qty = Number(it.quantity)
        if (Number.isNaN(qty) || qty <= 0) return `La cantidad del item ${i + 1} debe ser mayor a cero.`
      }
    }
    if (step === 4) {
      const haveExclusionary = criteriosEvaluacion.some((c) => c.type === 'Exclusionary')
      const haveWeighted = criteriosEvaluacion.some((c) => c.type === 'Weighted')
      if (!haveExclusionary && !haveWeighted) return 'Debe definir al menos un criterio de evaluacion.'
      const weightSum = criteriosEvaluacion
        .filter((c) => c.type === 'Weighted')
        .reduce((s, c) => s + (Number(c.weight) || 0), 0)
      if (haveWeighted && weightSum !== 100) return `La suma de pesos de criterios ponderados debe ser 100% (actual: ${weightSum}%).`
    }
    if (step === 5 && docRequisitos.length === 0) return 'Debe seleccionar al menos un requisito de documentacion.'
    if (step === 6) {
      const dur = Number(subastaConfig.duracion)
      if (Number.isNaN(dur) || dur < 10 || dur > 120) return 'La duracion de la subasta debe estar entre 10 y 120 minutos.'
      const dec = Number(subastaConfig.decremento)
      if (Number.isNaN(dec) || dec <= 0 || dec > 10) return 'El decremento minimo debe estar entre 0.1% y 10%.'
    }
    if (step === 7 && invitadosIds.length === 0) return 'Debe invitar al menos a un proveedor.'
    return null
  }

  async function irAlPaso(numero: number) {
    if (!editable) {
      setCurrentStep(7)
      return
    }

    if (numero > currentStep) {
      for (let s = currentStep; s < numero; s += 1) {
        const err = await validarPaso(s)
        if (err) {
          setError(err)
          return
        }
      }
    }

    setError('')
    if (!esNuevo && editable) {
      setGuardando(true)
      try {
        if (!tenantId || !id) return
        await actualizarProceso({ tenantId, id, datos: mapProcesoFormPayload(datos) })
        await guardarCriterios()
        await invalidarProceso(id)
      } catch (err) {
        setError(`Error al guardar borrador: ${errorMessage(err)}`)
        setGuardando(false)
        return
      }
      setGuardando(false)
    }

    setCurrentStep(numero)
    if (id) localStorage.setItem(`wizard_step_${id}`, String(numero))
  }

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
        if (!tenantId) return
        const nuevoProc = await crearProceso({
          tenantId,
          compradorId: usuario.id,
          datos: { ...mapProcesoFormPayload(datos), items: [] },
        })
        setProceso(nuevoProc)
        await invalidarProceso(nuevoProc.id)
        localStorage.setItem(`wizard_step_${nuevoProc.id}`, '2')
        setGuardando(false)
        navigate(`/compras/${nuevoProc.id}`, { replace: true })
        setCurrentStep(2)
      } catch (err) {
        setError(`Error al crear proceso: ${errorMessage(err)}`)
        setGuardando(false)
      }
    } else {
      irAlPaso(currentStep + 1)
    }
  }

  function anterior() {
    setError('')
    irAlPaso(currentStep - 1)
  }

  async function manejarInvitacion(proveedorId: string, checked: boolean) {
    if (!checked) return
    if (!tenantId || !id) return

    try {
      const invitacion = await invitarProveedorAProceso({ tenantId, procesoId: id, proveedorId })
      setInvitadosIds((prev) => [...prev, proveedorId])
      setInvitaciones((prev) => [...prev, invitacion])
      await invalidarProceso(id)
      setError('')
    } catch (err) {
      setError(`Error al invitar proveedor: ${errorMessage(err)}`)
    }
  }

  async function publicar() {
    const err = await validarPaso(8)
    if (err) {
      setError(err)
      return
    }

    setError('')
    setGuardando(true)
    try {
      if (!tenantId || !id) return
      await publicarProceso({ tenantId, id })
      await invalidarProceso(id)
      if (id) localStorage.removeItem(`wizard_step_${id}`)
      navigate('/compras')
    } catch (err) {
      setError(errorMessage(err))
      setGuardando(false)
    }
  }

  function actualizarDatos(campo: keyof ProcesoFormData, valor: ProcesoFormData[keyof ProcesoFormData]) {
    setValue(campo as 'titulo' | 'descripcion' | 'presupuestoEstimado' | 'modalidadContratacionId', valor as string, {
      shouldDirty: true,
      shouldValidate: ['titulo', 'descripcion', 'presupuestoEstimado', 'modalidadContratacionId'].includes(campo),
    })
    setDatos((prev) => ({ ...prev, [campo]: valor }))
  }

  function agregarItem() {
    setDatos((prev) => ({
      ...prev,
      items: [...(prev.items || []), { description: '', quantity: 1, unit: 'unidad', estimatedUnitPrice: '' }],
    }))
  }

  function actualizarItem(index: number, campo: keyof ProcesoFormItem, valor: ProcesoFormItem[keyof ProcesoFormItem]) {
    setDatos((prev) => {
      const items = [...prev.items]
      items[index] = { ...items[index], [campo]: valor }
      return { ...prev, items }
    })
  }

  function quitarItem(index: number) {
    setDatos((prev) => ({ ...prev, items: prev.items.filter((_, idx) => idx !== index) }))
  }

  async function registrarRecepcion(ordenCompra: PurchaseOrderMapped | null | undefined) {
    if (!ordenCompra || !usuario?.id) return
    if (!tenantId || !id || !proceso) return

    if (!ordenCompra.id) return

    const items = (proceso.items ?? [])
      .map((item: ProcesoItem) => {
        const purchaseItemId = item.id ?? ''
        return {
          purchaseItemId,
          quantityReceived: Number(recepcionCantidades[`${ordenCompra.id}:${purchaseItemId}`]) || 0,
        }
      })
      .filter((item) => item.quantityReceived > 0)

    if (items.length === 0) {
      setError('Ingresa al menos una cantidad recibida mayor a cero.')
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
      aplicarProceso(await obtenerProceso({ tenantId, id }))
      await invalidarProceso(id)
      setRecepcionCantidades({})
      setRecepcionObservaciones('')
      setRecepcionEstado('Accepted')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setRegistrandoRecepcion(false)
    }
  }

  async function registrarPago(contrato: ContractMapped | null | undefined) {
    if (!contrato || !usuario?.id) return
    if (!tenantId || !id) return

    setRegistrandoPago(true)
    setError('')
    try {
      if (!contrato.id) return
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
      aplicarProceso(await obtenerProceso({ tenantId, id }))
      await invalidarProceso(id)
      setPagoContrato(crearPagoInicial())
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setRegistrandoPago(false)
    }
  }

  return {
    esNuevo,
    currentStep,
    proceso,
    subasta,
    cargando,
    guardando,
    error,
    setError,
    datos,
    modalidades,
    modalidadActual,
    modalidadSugerida,
    criteriosEvaluacion,
    setCriteriosEvaluacion,
    docRequisitos,
    setDocRequisitos,
    subastaConfig,
    setSubastaConfig,
    proveedores: proveedoresState.proveedores,
    cargandoProveedores: proveedoresState.cargando,
    invitadosIds,
    invitaciones,
    recepcionEstado,
    setRecepcionEstado,
    recepcionObservaciones,
    setRecepcionObservaciones,
    recepcionCantidades,
    setRecepcionCantidades,
    registrandoRecepcion,
    pagoContrato,
    setPagoContrato,
    registrandoPago,
    editable,
    form,
    irAlPaso,
    siguiente,
    anterior,
    publicar,
    actualizarDatos,
    agregarItem,
    actualizarItem,
    quitarItem,
    manejarInvitacion,
    registrarRecepcion,
    registrarPago,
  }
}

function leerJsonLocal<T>(key: string, fallback: T): T {
  if (!key.includes('undefined')) {
    const saved = localStorage.getItem(key)
    if (saved) return JSON.parse(saved) as T
  }
  return fallback
}

function crearPagoInicial(): PagoContratoForm {
  return {
    fechaPago: new Date().toISOString().slice(0, 10),
    montoPago: '',
    montoPenalidad: '',
    diasDemora: '',
    notas: '',
  }
}

function mapProcesoFormPayload(datos: ProcesoFormData): CrearProcesoInput {
  return {
    titulo: datos.titulo,
    descripcion: datos.descripcion,
    presupuestoEstimado: datos.presupuestoEstimado,
    modalidadContratacionId: datos.modalidadContratacionId,
    items: datos.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      estimatedUnitPrice: item.estimatedUnitPrice,
    })),
  }
}

function mapItemForm(item: ProcesoItem): ProcesoFormItem {
  return {
    id: item.id,
    description: item.description ?? '',
    quantity: item.quantity ?? 1,
    unit: item.unit ?? 'unidad',
    estimatedUnitPrice: item.estimatedUnitPrice ?? '',
  }
}

function mapCriterioForm(c: {
  id?: string | null
  name?: string | null
  description?: string | null
  type?: string | null
  weight?: number | string | null
  sortOrder?: number | null
}): CriterioEvaluacionForm {
  return {
    id: c.id,
    name: c.name ?? '',
    description: c.description || '',
    type: c.type ?? 'Weighted',
    weight: c.weight ?? 0,
    sortOrder: c.sortOrder ?? undefined,
  }
}
