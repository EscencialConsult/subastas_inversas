import { useState } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import type { UseFormReturn, FieldErrors } from 'react-hook-form'
import type { NavigateFunction } from 'react-router-dom'
import { Button } from '../../../shared/ui/Button'
import { Card } from '../../../shared/ui/Card'
import { ConfirmDialog } from '../../../shared/ui/ConfirmDialog'
import { FormActions } from '../../../shared/ui/FormActions'
import { FormErrorSummary } from '../../../shared/ui/FormErrorSummary'
import type { ContractingModeDto } from '../../../shared/api/configuracionApi'
import { Paso1DatosBasicos } from './ProcesoFormSteps/Paso1DatosBasicos'
import { Paso2Presupuesto } from './ProcesoFormSteps/Paso2Presupuesto'
import { Paso3Items } from './ProcesoFormSteps/Paso3Items'
import { Paso4Criterios } from './ProcesoFormSteps/Paso4Criterios'
import { Paso5Requisitos } from './ProcesoFormSteps/Paso5Requisitos'
import { Paso6Subasta } from './ProcesoFormSteps/Paso6Subasta'
import { Paso7Invitaciones } from './ProcesoFormSteps/Paso7Invitaciones'
import { Paso8Revision } from './ProcesoFormSteps/Paso8Revision'

type CriterioEval = {
  id?: string | null
  name: string
  description: string
  type: string
  weight: number | string
  sortOrder?: number
}

type ItemData = {
  id?: string
  description: string
  quantity: number | string
  unit?: string
  estimatedUnitPrice?: number | string | null
}

type FormData = {
  titulo: string
  descripcion: string
  presupuestoEstimado: string
  modalidadContratacionId: string
  items: ItemData[]
}

interface ProcesoFormState {
  currentStep: number
  datos: FormData
  form: UseFormReturn<any>
  modalidadSugerida: ContractingModeDto | null
  modalidades: ContractingModeDto[]
  criteriosEvaluacion: CriterioEval[]
  setCriteriosEvaluacion: (values: CriterioEval[]) => void
  docRequisitos: string[]
  setDocRequisitos: (values: string[]) => void
  subastaConfig: { duracion: number; decremento: number }
  setSubastaConfig: (config: { duracion: number; decremento: number }) => void
  cargandoProveedores: boolean
  proveedores: unknown[]
  invitadosIds: string[]
  guardando: boolean
  actualizarDatos: (campo: keyof FormData, valor: FormData[keyof FormData]) => void
  agregarItem: () => void
  actualizarItem: (index: number, campo: keyof ItemData, valor: ItemData[keyof ItemData]) => void
  quitarItem: (index: number) => void
  manejarInvitacion: (proveedorId: string, checked: boolean) => Promise<void>
  modalidadActual: ContractingModeDto | undefined
  irAlPaso: (numero: number) => Promise<void>
  anterior: () => void
  siguiente: () => Promise<void>
  publicar: () => Promise<void>
}

interface ProcesoWizardProps {
  formState: ProcesoFormState
  navigate: NavigateFunction
  formatearPesos: (monto: number) => string
}

export function ProcesoWizard({ formState, navigate, formatearPesos }: ProcesoWizardProps) {
  const {
    currentStep,
    datos,
    form,
    modalidadSugerida,
    modalidades,
    criteriosEvaluacion,
    setCriteriosEvaluacion,
    docRequisitos,
    setDocRequisitos,
    subastaConfig,
    setSubastaConfig,
    cargandoProveedores,
    proveedores,
    invitadosIds,
    guardando,
    actualizarDatos,
    agregarItem,
    actualizarItem,
    quitarItem,
    manejarInvitacion,
    modalidadActual,
    irAlPaso,
    anterior,
    siguiente,
    publicar,
  } = formState

  const [confirmarPublicar, setConfirmarPublicar] = useState(false)

  const fieldErrors: Array<string | { field?: string; message: string }> = Object.entries(
    form.formState.errors as FieldErrors,
  ).map(([field, error]) => ({
    field,
    message: (error as { message?: string })?.message ?? 'Campo inválido.',
  }))

  async function manejarPublicar() {
    setConfirmarPublicar(false)
    await publicar()
  }

  return (
    <Card hover={false} padding="lg" className="space-y-6">
      {fieldErrors.length > 0 && (
        <FormErrorSummary errors={fieldErrors} title="Revisa los campos del formulario" />
      )}

      <div>
        {currentStep === 1 && (
          <Paso1DatosBasicos
            register={form.register}
            datos={datos}
            actualizarDatos={actualizarDatos}
            formErrors={form.formState.errors}
          />
        )}

        {currentStep === 2 && (
          <Paso2Presupuesto
            register={form.register}
            datos={datos}
            actualizarDatos={actualizarDatos}
            formErrors={form.formState.errors}
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
      </div>

      <FormActions align="between" className="-mx-6 -mb-6 rounded-b-lg">
        {currentStep > 1 ? (
          <Button type="button" variant="secondary" onClick={anterior} disabled={guardando} icon={<ArrowLeft size={16} />}>
            Anterior
          </Button>
        ) : (
          <Button type="button" variant="secondary" onClick={() => navigate('/compras')} disabled={guardando}>
            Volver al Listado
          </Button>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate('/compras')}
            disabled={guardando}
          >
            Guardar como Borrador
          </Button>

          {currentStep < 8 ? (
            <Button
              type="button"
              onClick={siguiente}
              disabled={guardando}
              loading={guardando}
              icon={!guardando ? <ArrowRight size={16} /> : undefined}
            >
              Siguiente
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => setConfirmarPublicar(true)}
              disabled={guardando || invitadosIds.length === 0}
              loading={guardando}
            >
              Publicar Proceso
            </Button>
          )}
        </div>
      </FormActions>

      <ConfirmDialog
        open={confirmarPublicar}
        title="Publicar proceso"
        description="Al publicar el proceso, estará visible para los proveedores invitados y pasará a estado 'Publicado'. Una vez publicado no se podrá modificar. ¿Estás seguro?"
        confirmLabel="Publicar"
        cancelLabel="Cancelar"
        variant="primary"
        loading={guardando}
        onConfirm={manejarPublicar}
        onCancel={() => setConfirmarPublicar(false)}
      />
    </Card>
  )
}
