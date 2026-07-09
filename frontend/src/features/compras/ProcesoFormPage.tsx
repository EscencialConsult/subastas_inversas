import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { Alert } from '../../shared/ui/Alert'
import { AnimatedPage } from '../../shared/ui/AnimatedPage'
import { Badge } from '../../shared/ui/Badge'
import { LoadingState } from '../../shared/ui/StateViews'
import { PageHeader } from '../../shared/ui/PageHeader'
import { PageShell } from '../../shared/ui/PageShell'
import { Stepper, type Step } from '../../shared/ui/Stepper'
import { claseEstado, etiquetaEstado } from '../../domain/compras'
import {
  PROCESO_FORM_ETAPAS,
  useProcesoForm,
} from './hooks/useProcesoForm'
import { ProcesoSoloLectura } from './components/ProcesoFormSteps/ProcesoSoloLectura'
import { ProcesoWizard } from './components/ProcesoWizard'

export function ProcesoFormPage() {
  const { id } = useParams()
  const { tenantId, usuario } = useAuth()
  const navigate = useNavigate()
  const formState = useProcesoForm({ id, tenantId, usuario, navigate })

  const [isSaving, setIsSaving] = useState(false)
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    if (formState.editable && !formState.esNuevo && id) {
      autoSaveTimer.current = setTimeout(() => {
        setIsSaving(true)
        setTimeout(() => setIsSaving(false), 300)
      }, 800)
    }
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    }
  }, [formState.datos, formState.esNuevo, formState.editable, id])

  if (formState.cargando) return <LoadingState label="Cargando proceso..." />

  function pasoCompletado(etapa: { nro: number }): boolean {
    const { datos, criteriosEvaluacion, docRequisitos, invitadosIds } = formState
    switch (etapa.nro) {
      case 1: return !!datos.titulo && !!datos.descripcion
      case 2: return !!datos.presupuestoEstimado && !!datos.modalidadContratacionId
      case 3: return datos.items.length > 0
      case 4: return criteriosEvaluacion.length > 0
      case 5: return docRequisitos.length > 0
      case 6: return true
      case 7: return invitadosIds.length > 0
      default: return true
    }
  }

  const steps: Step[] = PROCESO_FORM_ETAPAS.map((etapa) => ({
    ...etapa,
    state: formState.currentStep > etapa.nro
      ? 'completed'
      : formState.currentStep === etapa.nro
        ? 'active'
        : 'pending',
    completado: pasoCompletado(etapa),
  }))

  return (
    <AnimatedPage>
      <PageShell as="section" width="wide" className="px-0 py-0">
        <PageHeader
          title={tituloPagina(formState.esNuevo, formState.editable)}
          description={
            <span className="inline-flex items-center gap-2">
              {formState.editable ? 'Completa los pasos para configurar y publicar el proceso.' : 'Consulta el detalle completo del proceso.'}
              {isSaving && <span className="text-xs text-text-muted">Guardando...</span>}
            </span>
          }
          meta={formState.proceso && (
            <Badge variant={claseEstado(formState.proceso.estado)}>
              {etiquetaEstado(formState.proceso.estado)}
            </Badge>
          )}
        />

        {formState.editable && (
          <Stepper
            steps={steps}
            currentStep={formState.currentStep}
            onStepClick={formState.irAlPaso}
          />
        )}

        {formState.error && <Alert variant="error">{formState.error}</Alert>}

        {formState.editable ? (
          <ProcesoWizard
            formState={formState}
            navigate={navigate}
            formatearPesos={formatearPesos}
          />
        ) : (
          <ProcesoSoloLectura
            proceso={formState.proceso}
            datos={formState.datos}
            modalidadActual={formState.modalidadActual}
            formatearPesos={formatearPesos}
            invitaciones={formState.invitaciones}
            recepcionEstado={formState.recepcionEstado}
            setRecepcionEstado={formState.setRecepcionEstado}
            recepcionObservaciones={formState.recepcionObservaciones}
            setRecepcionObservaciones={formState.setRecepcionObservaciones}
            recepcionCantidades={formState.recepcionCantidades}
            setRecepcionCantidades={formState.setRecepcionCantidades}
            registrandoRecepcion={formState.registrandoRecepcion}
            registrarRecepcion={formState.registrarRecepcion}
            pagoContrato={formState.pagoContrato}
            setPagoContrato={formState.setPagoContrato}
            registrandoPago={formState.registrandoPago}
            registrarPago={formState.registrarPago}
            subasta={formState.subasta}
            navigate={navigate}
          />
        )}
      </PageShell>
    </AnimatedPage>
  )
}

function tituloPagina(esNuevo: boolean, editable: boolean) {
  if (esNuevo) return 'Nuevo proceso de compra (Asistente)'
  return editable ? 'Editar proceso de compra (Asistente)' : 'Proceso de compra'
}

function formatearPesos(monto: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(monto)
}
