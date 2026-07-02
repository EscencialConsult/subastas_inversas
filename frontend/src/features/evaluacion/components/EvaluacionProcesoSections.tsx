import { Check, X } from 'lucide-react'
import { Alert } from '../../../shared/ui/Alert'
import { Badge } from '../../../shared/ui/Badge'

export function EvaluacionCompletadaSection({
  proceso,
  onBack,
  onEdit,
}: {
  proceso: any
  onBack: () => void
  onEdit: () => void
}) {
  return (
    <section className="form-pagina">
      <div className="encabezado">
        <h1>Evaluacion Completada · <code>{proceso.codigo}</code></h1>
        <button className="btn btn--texto" onClick={onBack}>Volver</button>
      </div>
      <p className="proceso__descripcion">{proceso.titulo}</p>
      <Alert variant="success">Evaluacion registrada exitosamente.</Alert>
      <button className="btn btn--texto" onClick={onEdit}>
        Editar evaluacion
      </button>
    </section>
  )
}

export function CriteriosEvaluacionSection({
  criteria,
  criteriaForm,
  exclusionaryCriteria,
  weightedCriteria,
  editandoCriterios,
  guardando,
  onToggleEdit,
  onAddCriterion,
  onUpdateCriterion,
  onRemoveCriterion,
  onSaveCriteria,
}: {
  criteria: any[]
  criteriaForm: any[]
  exclusionaryCriteria: any[]
  weightedCriteria: any[]
  editandoCriterios: boolean
  guardando: boolean
  onToggleEdit: () => void
  onAddCriterion: (tipo: string) => void
  onUpdateCriterion: (idx: number, field: string, value: unknown) => void
  onRemoveCriterion: (idx: number) => void
  onSaveCriteria: () => void
}) {
  return (
    <div className="form">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="form__titulo" style={{ margin: 0 }}>Criterios de Evaluacion</h2>
        <button type="button" className="btn btn--texto" onClick={onToggleEdit}>
          {editandoCriterios ? 'Ver evaluacion' : 'Editar criterios'}
        </button>
      </div>

      {editandoCriterios ? (
        <EditorCriterios
          criteriaForm={criteriaForm}
          guardando={guardando}
          onAddCriterion={onAddCriterion}
          onUpdateCriterion={onUpdateCriterion}
          onRemoveCriterion={onRemoveCriterion}
          onSaveCriteria={onSaveCriteria}
        />
      ) : (
        <ResumenCriterios
          criteria={criteria}
          exclusionaryCriteria={exclusionaryCriteria}
          weightedCriteria={weightedCriteria}
        />
      )}
    </div>
  )
}

function EditorCriterios({
  criteriaForm,
  guardando,
  onAddCriterion,
  onUpdateCriterion,
  onRemoveCriterion,
  onSaveCriteria,
}: {
  criteriaForm: any[]
  guardando: boolean
  onAddCriterion: (tipo: string) => void
  onUpdateCriterion: (idx: number, field: string, value: unknown) => void
  onRemoveCriterion: (idx: number) => void
  onSaveCriteria: () => void
}) {
  const exclusionary = criteriaForm.filter(c => c.type === 'Exclusionary')
  const weighted = criteriaForm.filter(c => c.type === 'Weighted')
  const weightSum = weighted.reduce((sum, c) => {
    const parsed = Number(c.weight)
    return sum + (Number.isNaN(parsed) ? 0 : parsed)
  }, 0)

  return (
    <div style={{ marginTop: '16px' }}>
      <h3 className="form__subtitulo">Criterios Excluyentes</h3>
      {exclusionary.length === 0 && <p className="form__seccion-ayuda">No hay criterios excluyentes definidos.</p>}
      {exclusionary.map((criterion, idx) => {
        const realIdx = criteriaForm.indexOf(criterion)
        return (
          <div key={idx} className="wizard-item-row" style={{ marginBottom: '8px' }}>
            <input value={criterion.name} onChange={e => onUpdateCriterion(realIdx, 'name', e.target.value)} placeholder="Nombre del criterio" style={{ flex: 2 }} />
            <input value={criterion.description || ''} onChange={e => onUpdateCriterion(realIdx, 'description', e.target.value)} placeholder="Descripcion (opcional)" style={{ flex: 3 }} />
            <button type="button" className="btn btn--texto btn--texto-peligro" onClick={() => onRemoveCriterion(realIdx)}><X size={14} /></button>
          </div>
        )
      })}
      <button type="button" className="btn btn--primario" onClick={() => onAddCriterion('Exclusionary')} style={{ marginBottom: '16px' }}>
        + Agregar criterio excluyente
      </button>

      <h3 className="form__subtitulo">Criterios Ponderados</h3>
      {weighted.length === 0 && <p className="form__seccion-ayuda">No hay criterios ponderados definidos.</p>}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr 80px 40px', gap: '8px', padding: '0 8px 8px', borderBottom: '1px solid var(--color-borde)', marginBottom: '8px', fontSize: '12px', fontWeight: 'bold' }}>
        <span>Nombre</span>
        <span>Descripcion</span>
        <span>Peso %</span>
        <span></span>
      </div>
      {weighted.map((criterion, idx) => {
        const realIdx = criteriaForm.indexOf(criterion)
        return (
          <div key={idx} className="wizard-item-row" style={{ marginBottom: '8px' }}>
            <input value={criterion.name} onChange={e => onUpdateCriterion(realIdx, 'name', e.target.value)} placeholder="Nombre del criterio" />
            <input value={criterion.description || ''} onChange={e => onUpdateCriterion(realIdx, 'description', e.target.value)} placeholder="Descripcion (opcional)" />
            <input type="number" min="0" max="100" value={criterion.weight} onChange={e => onUpdateCriterion(realIdx, 'weight', e.target.value)} />
            <button type="button" className="btn btn--texto btn--texto-peligro" onClick={() => onRemoveCriterion(realIdx)}><X size={14} /></button>
          </div>
        )
      })}
      {weighted.length > 0 && weightSum !== 100 && (
        <Alert variant="warning">La suma de pesos debe ser 100% (actual: {weightSum}%)</Alert>
      )}
      <button type="button" className="btn btn--primario" onClick={() => onAddCriterion('Weighted')} style={{ marginRight: '8px' }}>
        + Agregar criterio ponderado
      </button>
      <button type="button" className="btn btn--primario" onClick={onSaveCriteria} disabled={guardando}>
        {guardando ? 'Guardando...' : 'Guardar criterios'}
      </button>
    </div>
  )
}

function ResumenCriterios({
  criteria,
  exclusionaryCriteria,
  weightedCriteria,
}: {
  criteria: any[]
  exclusionaryCriteria: any[]
  weightedCriteria: any[]
}) {
  return (
    <>
      {criteria.length > 0 && (
        <div style={{ marginTop: '16px', marginBottom: '8px' }}>
          {exclusionaryCriteria.length > 0 && (
            <div style={{ marginBottom: '4px' }}>
              <strong>Excluyentes:</strong> {exclusionaryCriteria.map(c => c.name).join(', ')}
            </div>
          )}
          {weightedCriteria.length > 0 && (
            <div>
              <strong>Ponderados:</strong> {weightedCriteria.map(c => `${c.name} (${c.weight}%)`).join(', ')}
            </div>
          )}
        </div>
      )}

      {criteria.length === 0 && (
        <Alert variant="info" className="mt-4">No hay criterios definidos. Haz clic en "Editar criterios" para crearlos.</Alert>
      )}
    </>
  )
}

export function EvaluacionProveedorFormSection({
  criteria,
  postores,
  guardando,
  onSubmit,
  getPassed,
  getScore,
  getSupplierWeightedScore,
  isSupplierExcluded,
  onPassedChange,
  onScoreChange,
}: {
  criteria: any[]
  postores: Array<{ id: string; name: string; monto: number }>
  guardando: boolean
  onSubmit: (event: React.FormEvent) => void
  getPassed: (criterionId: string, supplierId: string) => boolean
  getScore: (criterionId: string, supplierId: string) => string
  getSupplierWeightedScore: (supplierId: string) => number | null
  isSupplierExcluded: (supplierId: string) => boolean
  onPassedChange: (criterionId: string, supplierId: string, passed: boolean) => void
  onScoreChange: (criterionId: string, supplierId: string, value: string) => void
}) {
  if (criteria.length === 0) return null

  return (
    <form className="form" onSubmit={onSubmit} style={{ marginTop: '16px' }}>
      <h2 className="form__titulo">Evaluacion por Proveedor</h2>
      <p className="form__seccion-ayuda">
        Exclusionary: marcar <Check size={12} className="inline" /> o <X size={12} className="inline" />. Ponderados: asignar puntaje de 0 a 100.
      </p>

      <div style={{ overflowX: 'auto' }}>
        <table className="tabla" style={{ minWidth: '800px' }}>
          <thead>
            <tr>
              <th style={{ minWidth: '180px' }}>Proveedor</th>
              <th style={{ minWidth: '100px' }}>Oferta</th>
              {criteria.map(criterion => (
                <th key={criterion.id} style={{ minWidth: '120px' }}>
                  {criterion.name}
                  {criterion.type === 'Weighted' && <span className="campo__ayuda"> ({criterion.weight}%)</span>}
                </th>
              ))}
              <th style={{ minWidth: '80px' }}>Score</th>
              <th style={{ minWidth: '80px' }}>Excluido</th>
            </tr>
          </thead>
          <tbody>
            {postores.map(supplier => {
              const excluded = isSupplierExcluded(supplier.id)
              const score = getSupplierWeightedScore(supplier.id)
              return (
                <tr key={supplier.id} style={excluded ? { opacity: 0.5 } : {}}>
                  <td>{supplier.name}</td>
                  <td>{formatearPesos(supplier.monto)}</td>
                  {criteria.map(criterion => (
                    <td key={criterion.id}>
                      {criterion.type === 'Exclusionary' ? (
                        <select
                          value={getPassed(criterion.id, supplier.id) ? 'true' : 'false'}
                          onChange={e => onPassedChange(criterion.id, supplier.id, e.target.value === 'true')}
                        >
                          <option value="true">Si</option>
                          <option value="false">No</option>
                        </select>
                      ) : (
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={getScore(criterion.id, supplier.id)}
                          onChange={e => onScoreChange(criterion.id, supplier.id, e.target.value)}
                          style={{ width: '80px' }}
                          placeholder="0-100"
                        />
                      )}
                    </td>
                  ))}
                  <td>{score !== null ? `${score}%` : '---'}</td>
                  <td>
                    {excluded ? <Badge variant="error">Excluido</Badge> : <Badge variant="success">Apto</Badge>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="form__acciones" style={{ marginTop: '16px' }}>
        <button type="submit" className="btn btn--primario" disabled={guardando}>
          {guardando ? 'Guardando...' : 'Guardar Evaluacion'}
        </button>
      </div>
    </form>
  )
}

function formatearPesos(monto: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(monto)
}
