import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../../auth/AuthContext'
import { useConfirm } from '../../../context/ConfirmContext.jsx'
import { useToast } from '../../../context/ToastContext.jsx'
import { Alert } from '../../../shared/ui/Alert'
import {
  CircuitosSection,
  etiquetaTipoPlantilla,
  ModalidadesSection,
  PlantillasSection,
} from '../components/ConfiguracionSections'
import {
  actualizarCircuitoAprobacion,
  actualizarModalidadContratacion,
  activarPlantillaDocumento,
  crearCircuitoAprobacion,
  crearModalidadContratacion,
  crearVersionPlantillaDocumento,
  eliminarCircuitoAprobacion,
  eliminarModalidadContratacion,
  listarCircuitosAprobacion,
  listarModalidadesContratacion,
  listarPlantillasDocumento,
  type ApprovalWorkflowDto,
  type CircuitoDatos,
  type ContractingModeDto,
  type DocumentTemplateDto,
  type ModalidadDatos,
  type PlantillaDatos,
} from '../../../shared/api/configuracionApi'

const FORM_INICIAL: ModalidadDatos = {
  name: '',
  description: '',
  minAmount: '0',
  maxAmount: '',
  requiresAuction: true,
  active: true,
}

const CIRCUITO_INICIAL: CircuitoDatos = {
  name: '',
  minAmount: '0',
  maxAmount: '',
  active: true,
  levels: [{ requiredRole: '6', amountThreshold: '0' }],
}

const PLANTILLA_INICIAL: PlantillaDatos = {
  type: '0',
  name: 'Acta de adjudicacion',
  content: '',
  activate: true,
}

export function ConfiguracionPage() {
  const { tenantId } = useAuth()
  const confirm = useConfirm()
  const toast = useToast()
  const [modalidades, setModalidades] = useState<ContractingModeDto[]>([])
  const [circuitos, setCircuitos] = useState<ApprovalWorkflowDto[]>([])
  const [plantillas, setPlantillas] = useState<DocumentTemplateDto[]>([])
  const [form, setForm] = useState<ModalidadDatos>(FORM_INICIAL)
  const [circuitoForm, setCircuitoForm] = useState<CircuitoDatos>(CIRCUITO_INICIAL)
  const [plantillaForm, setPlantillaForm] = useState<PlantillaDatos>(PLANTILLA_INICIAL)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editandoCircuitoId, setEditandoCircuitoId] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [guardandoCircuito, setGuardandoCircuito] = useState(false)
  const [guardandoPlantilla, setGuardandoPlantilla] = useState(false)
  const [error, setError] = useState('')

  const cargarConfiguracion = useCallback(async () => {
    if (!tenantId) return
    setCargando(true)
    setError('')
    try {
      const [modalidadesData, circuitosData, plantillasData] = await Promise.all([
        listarModalidadesContratacion({ tenantId }),
        listarCircuitosAprobacion({ tenantId }),
        listarPlantillasDocumento({ tenantId }),
      ])
      setModalidades(modalidadesData)
      setCircuitos(circuitosData)
      setPlantillas(plantillasData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la configuracion.')
    } finally {
      setCargando(false)
    }
  }, [tenantId])

  useEffect(() => {
    cargarConfiguracion()
  }, [cargarConfiguracion])

  function actualizarCampo(campo: keyof ModalidadDatos, valor: unknown) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  function editar(modalidad: ContractingModeDto) {
    if (!modalidad.id) return
    setEditandoId(modalidad.id)
    setForm({
      name: modalidad.name ?? '',
      description: modalidad.description ?? '',
      minAmount: String(modalidad.minAmount ?? 0),
      maxAmount: modalidad.maxAmount == null ? '' : String(modalidad.maxAmount),
      requiresAuction: Boolean(modalidad.requiresAuction),
      active: Boolean(modalidad.active),
    })
  }

  function cancelarEdicion() {
    setEditandoId(null)
    setForm(FORM_INICIAL)
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId) return
    setError('')
    setGuardando(true)
    try {
      if (editandoId) {
        await actualizarModalidadContratacion({ tenantId, id: editandoId, datos: form })
      } else {
        await crearModalidadContratacion({ tenantId, datos: form })
      }
      cancelarEdicion()
      await cargarConfiguracion()
      toast.success(editandoId ? 'Modalidad actualizada.' : 'Modalidad creada.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la modalidad.')
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar(id: string) {
    if (!tenantId) return
    const confirmado = await confirm({
      variant: 'danger',
      title: 'Eliminar modalidad',
      message: 'Eliminar esta modalidad? Si esta en uso, quedara inactiva.',
      confirmText: 'Eliminar',
    })
    if (!confirmado) return

    setError('')
    try {
      await eliminarModalidadContratacion({ tenantId, id })
      await cargarConfiguracion()
      if (editandoId === id) cancelarEdicion()
      toast.success('Modalidad eliminada o inactivada.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar la modalidad.')
    }
  }

  function actualizarCircuitoCampo(campo: keyof CircuitoDatos, valor: unknown) {
    setCircuitoForm((prev) => ({ ...prev, [campo]: valor }))
  }

  function actualizarNivel(index: number, campo: string, valor: unknown) {
    setCircuitoForm((prev) => ({
      ...prev,
      levels: prev.levels.map((level, i) =>
        i === index ? { ...level, [campo]: valor } : level
      ),
    }))
  }

  function agregarNivel() {
    setCircuitoForm((prev) => ({
      ...prev,
      levels: [...prev.levels, { requiredRole: '6', amountThreshold: prev.minAmount || '0' }],
    }))
  }

  function quitarNivel(index: number) {
    setCircuitoForm((prev) => ({
      ...prev,
      levels: prev.levels.filter((_, i) => i !== index),
    }))
  }

  function editarCircuito(circuito: ApprovalWorkflowDto) {
    if (!circuito.id) return
    setEditandoCircuitoId(circuito.id)
    setCircuitoForm({
      name: circuito.name ?? '',
      minAmount: circuito.minAmount == null ? '' : String(circuito.minAmount),
      maxAmount: circuito.maxAmount == null ? '' : String(circuito.maxAmount),
      active: Boolean(circuito.active),
      levels: (circuito.levels ?? []).map((level) => ({
        requiredRole: String(level.requiredRole),
        amountThreshold: String(level.amountThreshold ?? 0),
      })),
    })
  }

  function cancelarCircuito() {
    setEditandoCircuitoId(null)
    setCircuitoForm(CIRCUITO_INICIAL)
  }

  async function guardarCircuito(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId) return
    setError('')
    setGuardandoCircuito(true)
    try {
      if (editandoCircuitoId) {
        await actualizarCircuitoAprobacion({ tenantId, id: editandoCircuitoId, datos: circuitoForm })
      } else {
        await crearCircuitoAprobacion({ tenantId, datos: circuitoForm })
      }
      cancelarCircuito()
      await cargarConfiguracion()
      toast.success(editandoCircuitoId ? 'Circuito actualizado.' : 'Circuito creado.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el circuito.')
    } finally {
      setGuardandoCircuito(false)
    }
  }

  async function eliminarCircuito(id: string) {
    if (!tenantId) return
    const confirmado = await confirm({
      variant: 'danger',
      title: 'Eliminar circuito',
      message: 'Eliminar este circuito? Si esta en uso, quedara inactivo.',
      confirmText: 'Eliminar',
    })
    if (!confirmado) return

    setError('')
    try {
      await eliminarCircuitoAprobacion({ tenantId, id })
      await cargarConfiguracion()
      if (editandoCircuitoId === id) cancelarCircuito()
      toast.success('Circuito eliminado o inactivada.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el circuito.')
    }
  }

  function actualizarPlantillaCampo(campo: keyof PlantillaDatos, valor: unknown) {
    setPlantillaForm((prev) => ({ ...prev, [campo]: valor }))
  }

  function cargarPlantillaActual(tipo: string | number) {
    const activa = plantillas.find((plantilla) =>
      String(plantilla.type) === String(tipo) && plantilla.active
    )

    setPlantillaForm({
      type: String(tipo),
      name: activa?.name ?? etiquetaTipoPlantilla(tipo),
      content: activa?.content ?? '',
      activate: true,
    })
  }

  async function guardarPlantilla(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId) return
    setError('')
    setGuardandoPlantilla(true)
    try {
      await crearVersionPlantillaDocumento({ tenantId, datos: plantillaForm })
      setPlantillaForm((prev) => ({ ...prev, content: '' }))
      await cargarConfiguracion()
      toast.success('Version de plantilla creada.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la plantilla.')
    } finally {
      setGuardandoPlantilla(false)
    }
  }

  async function activarPlantilla(id: string) {
    if (!tenantId) return
    setError('')
    try {
      await activarPlantillaDocumento({ tenantId, id })
      await cargarConfiguracion()
      toast.success('Plantilla activada.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo activar la plantilla.')
    }
  }

  return (
    <section className="form-pagina">
      <div className="encabezado">
        <h1>Configuracion</h1>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <ModalidadesSection
        modalidades={modalidades}
        form={form}
        editandoId={editandoId}
        cargando={cargando}
        guardando={guardando}
        onSubmit={guardar}
        onChange={actualizarCampo}
        onEdit={editar}
        onCancel={cancelarEdicion}
        onDelete={eliminar}
      />

      <CircuitosSection
        circuitos={circuitos}
        form={circuitoForm}
        editandoId={editandoCircuitoId}
        cargando={cargando}
        guardando={guardandoCircuito}
        onSubmit={guardarCircuito}
        onChange={actualizarCircuitoCampo}
        onLevelChange={actualizarNivel}
        onAddLevel={agregarNivel}
        onRemoveLevel={quitarNivel}
        onEdit={editarCircuito}
        onCancel={cancelarCircuito}
        onDelete={eliminarCircuito}
      />

      <PlantillasSection
        plantillas={plantillas}
        form={plantillaForm}
        cargando={cargando}
        guardando={guardandoPlantilla}
        onSubmit={guardarPlantilla}
        onChange={actualizarPlantillaCampo}
        onLoadActive={cargarPlantillaActual}
        onSetForm={setPlantillaForm}
        onActivate={activarPlantilla}
      />
    </section>
  )
}
