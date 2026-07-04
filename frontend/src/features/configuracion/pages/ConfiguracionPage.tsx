import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../../auth/AuthContext'
import { useConfirm } from '../../../context/ConfirmContext'
import { useToast } from '../../../context/ToastContext'
import { getErrorMessage } from '../../../shared/query/queryClient'
import { Alert } from '../../../shared/ui/Alert'
import {
  CircuitosSection,
  etiquetaTipoPlantilla,
  ModalidadesSection,
  PlantillasSection,
} from '../components/ConfiguracionSections'
import {
  type ApprovalWorkflowDto,
  type CircuitoDatos,
  type ContractingModeDto,
  type ModalidadDatos,
  type PlantillaDatos,
} from '../../../shared/api/configuracionApi'
import {
  activarPlantillaMutation,
  configuracionKeys,
  configuracionQuery,
  crearPlantillaMutation,
  eliminarCircuitoMutation,
  eliminarModalidadMutation,
  guardarCircuitoMutation,
  guardarModalidadMutation,
} from '../data/configuracionData'

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
  const queryClient = useQueryClient()
  const [form, setForm] = useState<ModalidadDatos>(FORM_INICIAL)
  const [circuitoForm, setCircuitoForm] = useState<CircuitoDatos>(CIRCUITO_INICIAL)
  const [plantillaForm, setPlantillaForm] = useState<PlantillaDatos>(PLANTILLA_INICIAL)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editandoCircuitoId, setEditandoCircuitoId] = useState<string | null>(null)

  const configQuery = useQuery({
    queryKey: configuracionKeys.tenant(tenantId),
    queryFn: () => configuracionQuery({ tenantId }),
    enabled: Boolean(tenantId),
  })

  const invalidateConfig = () => queryClient.invalidateQueries({ queryKey: configuracionKeys.tenant(tenantId) })
  const guardarModalidadMut = useMutation({ mutationFn: guardarModalidadMutation, onSuccess: invalidateConfig })
  const eliminarModalidadMut = useMutation({ mutationFn: eliminarModalidadMutation, onSuccess: invalidateConfig })
  const guardarCircuitoMut = useMutation({ mutationFn: guardarCircuitoMutation, onSuccess: invalidateConfig })
  const eliminarCircuitoMut = useMutation({ mutationFn: eliminarCircuitoMutation, onSuccess: invalidateConfig })
  const crearPlantillaMut = useMutation({ mutationFn: crearPlantillaMutation, onSuccess: invalidateConfig })
  const activarPlantillaMut = useMutation({ mutationFn: activarPlantillaMutation, onSuccess: invalidateConfig })

  const modalidades = configQuery.data?.modalidades ?? []
  const circuitos = configQuery.data?.circuitos ?? []
  const plantillas = configQuery.data?.plantillas ?? []
  const cargando = configQuery.isLoading || configQuery.isFetching
  const error = getErrorMessage(
    configQuery.error ??
      guardarModalidadMut.error ??
      eliminarModalidadMut.error ??
      guardarCircuitoMut.error ??
      eliminarCircuitoMut.error ??
      crearPlantillaMut.error ??
      activarPlantillaMut.error,
    '',
  )

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
    try {
      await guardarModalidadMut.mutateAsync({ tenantId, id: editandoId, datos: form })
      cancelarEdicion()
      toast.success(editandoId ? 'Modalidad actualizada.' : 'Modalidad creada.')
    } catch {
      // El error se muestra desde la mutation.
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

    try {
      await eliminarModalidadMut.mutateAsync({ tenantId, id })
      if (editandoId === id) cancelarEdicion()
      toast.success('Modalidad eliminada o inactivada.')
    } catch {
      // El error se muestra desde la mutation.
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
    try {
      await guardarCircuitoMut.mutateAsync({ tenantId, id: editandoCircuitoId, datos: circuitoForm })
      cancelarCircuito()
      toast.success(editandoCircuitoId ? 'Circuito actualizado.' : 'Circuito creado.')
    } catch {
      // El error se muestra desde la mutation.
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

    try {
      await eliminarCircuitoMut.mutateAsync({ tenantId, id })
      if (editandoCircuitoId === id) cancelarCircuito()
      toast.success('Circuito eliminado o inactivada.')
    } catch {
      // El error se muestra desde la mutation.
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
    try {
      await crearPlantillaMut.mutateAsync({ tenantId, datos: plantillaForm })
      setPlantillaForm((prev) => ({ ...prev, content: '' }))
      toast.success('Version de plantilla creada.')
    } catch {
      // El error se muestra desde la mutation.
    }
  }

  async function activarPlantilla(id: string) {
    if (!tenantId) return
    try {
      await activarPlantillaMut.mutateAsync({ tenantId, id })
      toast.success('Plantilla activada.')
    } catch {
      // El error se muestra desde la mutation.
    }
  }

  return (
    <section className="space-y-6">
      <div className="encabezado">
        <h1>Configuracion</h1>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <ModalidadesSection
        modalidades={modalidades}
        form={form}
        editandoId={editandoId}
        cargando={cargando}
        guardando={guardarModalidadMut.isPending}
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
        guardando={guardarCircuitoMut.isPending}
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
        guardando={crearPlantillaMut.isPending}
        onSubmit={guardarPlantilla}
        onChange={actualizarPlantillaCampo}
        onLoadActive={cargarPlantillaActual}
        onSetForm={setPlantillaForm}
        onActivate={activarPlantilla}
      />
    </section>
  )
}
