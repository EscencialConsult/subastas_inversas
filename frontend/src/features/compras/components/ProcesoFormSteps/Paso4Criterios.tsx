import { X } from 'lucide-react'
import { Alert } from '../../../../shared/ui/Alert'

export function Paso4Criterios({ criteriosEvaluacion, setCriteriosEvaluacion }) {
  const excluyentes = criteriosEvaluacion.filter(c => c.type === 'Exclusionary')
  const ponderados = criteriosEvaluacion.filter(c => c.type === 'Weighted')
  const weightSum = ponderados.reduce((s, c) => s + (Number(c.weight) || 0), 0)

  return (
    <div>
      <h2 className="wizard-card__title">Etapa 4: Criterios de Evaluación</h2>
      <p className="wizard-card__sub">
        Define los criterios para evaluar objetivamente a los proveedores. Los criterios excluyentes filtran postores; los ponderados se puntúan 0-100% con un peso asignado.
      </p>

      <h3 className="text-base font-semibold text-text">Criterios Excluyentes</h3>
      {excluyentes.length === 0 && (
        <p className="text-sm text-text-muted">No hay criterios excluyentes definidos.</p>
      )}
      
      <div className="overflow-x-auto w-full mb-4">
        <div className="min-w-[500px]">
          {excluyentes.map((c) => {
            const realIdx = criteriosEvaluacion.indexOf(c)
            return (
              <div key={realIdx} className="wizard-item-row" style={{ marginBottom: '8px' }}>
                <input
                  className="campo input"
                  value={c.name}
                  onChange={e => {
                    const next = [...criteriosEvaluacion]
                    next[realIdx] = { ...next[realIdx], name: e.target.value }
                    setCriteriosEvaluacion(next)
                  }}
                  placeholder="Nombre del criterio (ej: Certificación ISO requerida)"
                  style={{ flex: 2, padding: '6px 10px', fontSize: '13px' }}
                />
                <input
                  className="campo input"
                  value={c.description || ''}
                  onChange={e => {
                    const next = [...criteriosEvaluacion]
                    next[realIdx] = { ...next[realIdx], description: e.target.value }
                    setCriteriosEvaluacion(next)
                  }}
                  placeholder="Descripción (opcional)"
                  style={{ flex: 3, padding: '6px 10px', fontSize: '13px' }}
                />
                <button 
                  type="button" 
                  className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-error transition-colors hover:bg-error/10 disabled:opacity-60" 
                  onClick={() => {
                    setCriteriosEvaluacion(prev => prev.filter((_, i) => i !== realIdx))
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            )
          })}
        </div>
      </div>
      
      <button 
        type="button" 
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-60" 
        onClick={() => {
          setCriteriosEvaluacion(prev => [...prev, { id: null, name: '', description: '', type: 'Exclusionary', weight: 0 }])
        }} 
        style={{ marginBottom: '20px' }}
      >
        + Agregar criterio excluyente
      </button>

      <h3 className="text-base font-semibold text-text">Criterios Ponderados</h3>
      {ponderados.length === 0 && (
        <p className="text-sm text-text-muted">No hay criterios ponderados definidos.</p>
      )}

      <div className="overflow-x-auto w-full">
        <div className="min-w-[600px]">
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr 80px 40px', gap: '8px', padding: '0 8px 8px', borderBottom: '1px solid var(--color-borde)', marginBottom: '8px', fontSize: '12px', fontWeight: 'bold' }}>
            <span>Nombre</span>
            <span>Descripción</span>
            <span>Peso %</span>
            <span></span>
          </div>
          
          {ponderados.map((c) => {
            const realIdx = criteriosEvaluacion.indexOf(c)
            return (
              <div key={realIdx} className="wizard-item-row" style={{ marginBottom: '8px' }}>
                <input
                  className="campo input"
                  value={c.name}
                  onChange={e => {
                    const next = [...criteriosEvaluacion]
                    next[realIdx] = { ...next[realIdx], name: e.target.value }
                    setCriteriosEvaluacion(next)
                  }}
                  placeholder="Nombre del criterio (ej: Calidad técnica)"
                  style={{ padding: '6px 10px', fontSize: '13px' }}
                />
                <input
                  className="campo input"
                  value={c.description || ''}
                  onChange={e => {
                    const next = [...criteriosEvaluacion]
                    next[realIdx] = { ...next[realIdx], description: e.target.value }
                    setCriteriosEvaluacion(next)
                  }}
                  placeholder="Descripción (opcional)"
                  style={{ padding: '6px 10px', fontSize: '13px' }}
                />
                <input
                  className="campo input"
                  type="number"
                  min="0"
                  max="100"
                  value={c.weight}
                  onChange={e => {
                    const next = [...criteriosEvaluacion]
                    next[realIdx] = { ...next[realIdx], weight: e.target.value }
                    setCriteriosEvaluacion(next)
                  }}
                  style={{ padding: '6px 10px', fontSize: '13px' }}
                />
                <button 
                  type="button" 
                  className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-error transition-colors hover:bg-error/10 disabled:opacity-60" 
                  onClick={() => {
                    setCriteriosEvaluacion(prev => prev.filter((_, i) => i !== realIdx))
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {ponderados.length > 0 && weightSum !== 100 && (
        <Alert variant="warning">La suma de pesos debe ser 100% (actual: {weightSum}%)</Alert>
      )}

      <button 
        type="button" 
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-60" 
        onClick={() => {
          setCriteriosEvaluacion(prev => [...prev, { id: null, name: '', description: '', type: 'Weighted', weight: 0 }])
        }}
      >
        + Agregar criterio ponderado
      </button>
    </div>
  )
}
