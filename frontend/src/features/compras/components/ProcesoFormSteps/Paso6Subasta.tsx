import { Alert } from '../../../../shared/ui/Alert'
import { Input } from '../../../../shared/ui/Input'

export function Paso6Subasta({ subastaConfig, setSubastaConfig, datos, formatearPesos }) {
  return (
    <div>
      <h2 className="wizard-card__title">Etapa 6: Configuracion de la subasta inversa</h2>
      <p className="wizard-card__sub">Configura las reglas dinamicas para el lance de ofertas de proveedores.</p>

      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Duracion de la subasta (minutos)"
          type="number"
          min="10"
          max="120"
          value={subastaConfig.duracion}
          onChange={(e) => setSubastaConfig({ ...subastaConfig, duracion: Number(e.target.value) })}
          help="Minimo 10 min, maximo 120 min."
        />

        <Input
          label="Decremento minimo por lance (%)"
          type="number"
          step="0.1"
          min="0.1"
          max="10"
          value={subastaConfig.decremento}
          onChange={(e) => setSubastaConfig({ ...subastaConfig, decremento: Number(e.target.value) })}
          help="Los lances sucesivos deben bajar al menos este porcentaje de la oferta actual."
        />
      </div>

      <Alert variant="info" className="mt-4">
        Precio base de subasta:{' '}
        <strong>{formatearPesos(Number(datos.presupuestoEstimado) || 0)}</strong>
        {' '}(heredado del presupuesto estimado).
      </Alert>
    </div>
  )
}
