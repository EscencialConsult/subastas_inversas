// Alta, edicion y vista de un proceso de compra mediante wizard.

import { Check } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { Alert } from '../../shared/ui/Alert'
import { AnimatedPage } from '../../shared/ui/AnimatedPage'
import { Badge } from '../../shared/ui/Badge'
import { LoadingState } from '../../shared/ui/StateViews'
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

  if (formState.cargando) return <LoadingState label="Cargando proceso..." />

  return (
    <AnimatedPage>
      <section className="space-y-6">
        <div className="encabezado">
          <h1>{tituloPagina(formState.esNuevo, formState.editable)}</h1>
          {formState.proceso && (
            <Badge variant={claseEstado(formState.proceso.estado)}>
              {etiquetaEstado(formState.proceso.estado)}
            </Badge>
          )}
        </div>

        {formState.editable && (
          <ProcesoStepper
            currentStep={formState.currentStep}
            irAlPaso={formState.irAlPaso}
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
      </section>
    </AnimatedPage>
  )
}

function ProcesoStepper({ currentStep, irAlPaso }) {
  return (
    <div className="wizard-progress">
      <div
        className="wizard-progress__bar-fill"
        style={{ width: `${((currentStep - 1) / 7) * 100}%` }}
      />
      {PROCESO_FORM_ETAPAS.map((etapa) => {
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
  )
}

function tituloPagina(esNuevo, editable) {
  if (esNuevo) return 'Nuevo proceso de compra (Asistente)'
  return editable ? 'Editar proceso de compra (Asistente)' : 'Proceso de compra'
}

function formatearPesos(monto) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(monto)
}
