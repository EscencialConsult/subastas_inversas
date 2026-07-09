import { Alert } from '../../../../shared/ui/Alert'
import { Button } from '../../../../shared/ui/Button'
import { Input } from '../../../../shared/ui/Input'
import { Select } from '../../../../shared/ui/Select'

export function Paso2Presupuesto({ register, datos, actualizarDatos, formErrors, modalidadSugerida, modalidades, navigate }) {
  return (
    <div>
      <h2 className="wizard-card__title">Etapa 2: Presupuesto y modalidad</h2>
      <p className="wizard-card__sub">Establece el monto aproximado del proceso. El sistema sugerira la modalidad regulatoria adecuada.</p>

      <Input
        label="Presupuesto estimado (ARS)"
        {...register('presupuestoEstimado')}
        type="number"
        min="0"
        value={datos.presupuestoEstimado}
        onChange={(event) => actualizarDatos('presupuestoEstimado', event.target.value)}
        placeholder="500000"
        error={formErrors.presupuestoEstimado?.message}
        required
      />

      {modalidadSugerida && (
        <Alert variant="info">
          <strong>Modalidad sugerida:</strong> {modalidadSugerida.name}
          <p className="m-0 mt-1 text-sm">{modalidadSugerida.description}</p>
        </Alert>
      )}

      {modalidades.length > 0 ? (
        <Select
          label="Modalidad seleccionada"
          {...register('modalidadContratacionId')}
          value={datos.modalidadContratacionId}
          onChange={(event) => actualizarDatos('modalidadContratacionId', event.target.value)}
          error={formErrors.modalidadContratacionId?.message}
          required
        >
          <option value="">Selecciona una modalidad...</option>
          {modalidades.map((modalidad) => (
            <option key={modalidad.id} value={modalidad.id}>
              {modalidad.name} {modalidad.id === modalidadSugerida?.id ? '(Sugerida)' : ''}
            </option>
          ))}
        </Select>
      ) : (
        <Alert variant="warning" className="mt-4">
          <p className="m-0">
            No hay modalidades de contratacion configuradas.{' '}
            <Button type="button" variant="link" onClick={() => navigate('/configuracion')}>
              Ir a configuracion
            </Button>
          </p>
        </Alert>
      )}
    </div>
  )
}
