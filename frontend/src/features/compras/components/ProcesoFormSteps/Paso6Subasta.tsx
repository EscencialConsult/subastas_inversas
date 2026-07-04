export function Paso6Subasta({ subastaConfig, setSubastaConfig, datos, formatearPesos }) {
  return (
    <div>
      <h2 className="wizard-card__title">Etapa 6: Configuración de la Subasta Inversa</h2>
      <p className="wizard-card__sub">Configura las reglas dinámicas para el lance de ofertas de proveedores.</p>

      <label className="campo" style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
        <span style={{ fontSize: '13px', fontWeight: '600' }}>Duración de la Subasta (minutos)</span>
        <input
          className="campo input"
          type="number"
          min="10"
          max="120"
          value={subastaConfig.duracion}
          onChange={(e) => setSubastaConfig({ ...subastaConfig, duracion: Number(e.target.value) })}
          style={{ padding: '9px 12px', borderRadius: 'var(--radio)', border: '1px solid var(--color-borde)' }}
        />
        <span className="campo__ayuda" style={{ color: 'var(--color-texto-suave)', fontSize: '12px' }}>Mínimo 10 min, máximo 120 min.</span>
      </label>

      <label className="campo" style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
        <span style={{ fontSize: '13px', fontWeight: '600' }}>Decremento Mínimo por Lance (%)</span>
        <input
          className="campo input"
          type="number"
          step="0.1"
          min="0.1"
          max="10"
          value={subastaConfig.decremento}
          onChange={(e) => setSubastaConfig({ ...subastaConfig, decremento: Number(e.target.value) })}
          style={{ padding: '9px 12px', borderRadius: 'var(--radio)', border: '1px solid var(--color-borde)' }}
        />
        <span className="campo__ayuda" style={{ color: 'var(--color-texto-suave)', fontSize: '12px' }}>Los lances sucesivos deben bajar al menos este porcentaje de la oferta actual.</span>
      </label>

      <div className="perfil__solo-lectura" style={{ marginTop: '24px', padding: '12px', background: 'var(--color-fondo)', borderRadius: 'var(--radio)' }}>
        <span>Precio base de subasta: <strong>{formatearPesos(Number(datos.presupuestoEstimado) || 0)}</strong> (Heredado del Presupuesto Estimado)</span>
      </div>
    </div>
  )
}
