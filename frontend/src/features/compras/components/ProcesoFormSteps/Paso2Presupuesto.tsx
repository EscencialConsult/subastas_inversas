import { Input } from '../../../../shared/ui/Input'
import { Select } from '../../../../shared/ui/Select'
import { Alert } from '../../../../shared/ui/Alert'

export function Paso2Presupuesto({ register, datos, actualizarDatos, formErrors, modalidadSugerida, modalidades, navigate }) {
  return (
    <div>
      <h2 className="wizard-card__title">Etapa 2: Presupuesto y Modalidad</h2>
      <p className="wizard-card__sub">Establece el monto aproximado del proceso. El sistema sugerirá la modalidad regulatoria adecuada.</p>

      <Input
        label="Presupuesto Estimado (ARS)"
        {...register('presupuestoEstimado')}
        type="number"
        min="0"
        value={datos.presupuestoEstimado}
        onChange={(e) => actualizarDatos('presupuestoEstimado', e.target.value)}
        placeholder="500000"
        error={formErrors.presupuestoEstimado?.message}
        required
      />

      {modalidadSugerida && (
        <Alert variant="info">
          <strong>Modalidad Sugerida:</strong> {modalidadSugerida.name}
          <p style={{ margin: '4px 0 0', fontSize: '13px' }}>{modalidadSugerida.description}</p>
        </Alert>
      )}

      {modalidades.length > 0 ? (
        <Select
          label="Modalidad Seleccionada"
          {...register('modalidadContratacionId')}
          value={datos.modalidadContratacionId}
          onChange={(e) => actualizarDatos('modalidadContratacionId', e.target.value)}
          error={formErrors.modalidadContratacionId?.message}
          required
        >
          <option value="">Selecciona una modalidad...</option>
          {modalidades.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} {m.id === modalidadSugerida?.id ? '(Sugerida)' : ''}
            </option>
          ))}
        </Select>
      ) : (
        <Alert variant="warning" className="mt-4">
          <p style={{ margin: 0 }}>
            No hay modalidades de contratación configuradas.{' '}
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60"
              style={{ padding: 0, fontSize: 'inherit', textDecoration: 'underline' }}
              onClick={() => navigate('/configuracion')}
            >
              Ir a configuración
            </button>
          </p>
        </Alert>
      )}
    </div>
  )
}
