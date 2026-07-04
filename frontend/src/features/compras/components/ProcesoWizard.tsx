import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Paso1DatosBasicos } from './ProcesoFormSteps/Paso1DatosBasicos'
import { Paso2Presupuesto } from './ProcesoFormSteps/Paso2Presupuesto'
import { Paso3Items } from './ProcesoFormSteps/Paso3Items'
import { Paso4Criterios } from './ProcesoFormSteps/Paso4Criterios'
import { Paso5Requisitos } from './ProcesoFormSteps/Paso5Requisitos'
import { Paso6Subasta } from './ProcesoFormSteps/Paso6Subasta'
import { Paso7Invitaciones } from './ProcesoFormSteps/Paso7Invitaciones'
import { Paso8Revision } from './ProcesoFormSteps/Paso8Revision'

export function ProcesoWizard({ formState, navigate, formatearPesos }) {
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

  return (
    <div className="wizard-card">
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

      <div className="wizard-step-actions">
        {currentStep > 1 ? (
          <button type="button" className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60" onClick={anterior} disabled={guardando}>
            <ArrowLeft size={16} /> Anterior
          </button>
        ) : (
          <button type="button" className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60" onClick={() => navigate('/compras')} disabled={guardando}>
            Volver al Listado
          </button>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60"
            onClick={() => navigate('/compras')}
            disabled={guardando}
          >
            Guardar como Borrador
          </button>

          {currentStep < 8 ? (
            <button type="button" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-60" onClick={siguiente} disabled={guardando}>
              {guardando ? (
                'Guardando...'
              ) : (
                <>
                  Siguiente <ArrowRight size={16} />
                </>
              )}
            </button>
          ) : (
            <button type="button" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-60" onClick={publicar} disabled={guardando || invitadosIds.length === 0}>
              {guardando ? 'Publicando...' : 'Publicar Proceso'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
