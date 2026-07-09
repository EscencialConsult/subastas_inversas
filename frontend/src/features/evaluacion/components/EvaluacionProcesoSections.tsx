import { X } from 'lucide-react'
import { Alert } from '../../../shared/ui/Alert'
import { Badge } from '../../../shared/ui/Badge'
import { Button } from '../../../shared/ui/Button'
import { DataTable, type DataTableColumn } from '../../../shared/ui/DataTable'
import { FormSection } from '../../../shared/ui/FormSection'
import { Input } from '../../../shared/ui/Input'
import { Select } from '../../../shared/ui/Select'

interface Criterion {
  id: string
  name: string
  description?: string
  type: string
  weight?: number
  sortOrder?: number
}

interface Postor {
  id: string
  name: string
  monto: number
}

interface EvaluacionCompletadaSectionProps {
  onBack: () => void
  onEdit: () => void
}

export function EvaluacionCompletadaSection({
  onBack,
  onEdit,
}: EvaluacionCompletadaSectionProps) {
  return (
    <div className="space-y-4">
      <Alert variant="success">Evaluación registrada exitosamente.</Alert>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={onBack}>Volver al listado</Button>
        <Button variant="secondary" onClick={onEdit}>Editar evaluación</Button>
      </div>
    </div>
  )
}

interface CriteriosEvaluacionSectionProps {
  criteria: Criterion[]
  criteriaForm: Criterion[]
  exclusionaryCriteria: Criterion[]
  weightedCriteria: Criterion[]
  editandoCriterios: boolean
  guardando: boolean
  onToggleEdit: () => void
  onAddCriterion: (tipo: string) => void
  onUpdateCriterion: (idx: number, field: string, value: unknown) => void
  onRemoveCriterion: (idx: number) => void
  onSaveCriteria: () => void
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
}: CriteriosEvaluacionSectionProps) {
  return (
    <FormSection
      title="Criterios de evaluación"
      actions={
        <Button type="button" variant="secondary" size="sm" onClick={onToggleEdit}>
          {editandoCriterios ? 'Ver evaluación' : 'Editar criterios'}
        </Button>
      }
    >
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
    </FormSection>
  )
}

interface EditorCriteriosProps {
  criteriaForm: Criterion[]
  guardando: boolean
  onAddCriterion: (tipo: string) => void
  onUpdateCriterion: (idx: number, field: string, value: unknown) => void
  onRemoveCriterion: (idx: number) => void
  onSaveCriteria: () => void
}

function EditorCriterios({
  criteriaForm,
  guardando,
  onAddCriterion,
  onUpdateCriterion,
  onRemoveCriterion,
  onSaveCriteria,
}: EditorCriteriosProps) {
  const exclusionary = criteriaForm.filter((criterion) => criterion.type === 'Exclusionary')
  const weighted = criteriaForm.filter((criterion) => criterion.type === 'Weighted')
  const weightSum = weighted.reduce((sum, criterion) => {
    const parsed = Number(criterion.weight)
    return sum + (Number.isNaN(parsed) ? 0 : parsed)
  }, 0)

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="m-0 text-base font-semibold text-text">Criterios excluyentes</h3>
          <Button type="button" size="sm" onClick={() => onAddCriterion('Exclusionary')}>
            Agregar criterio
          </Button>
        </div>
        {exclusionary.length === 0 ? (
          <p className="rounded-md border border-border bg-background px-3 py-2 text-sm text-text-muted">
            No hay criterios excluyentes definidos.
          </p>
        ) : (
          <div className="grid gap-2">
            {exclusionary.map((criterion, idx) => {
              const realIdx = criteriaForm.indexOf(criterion)
              return (
                <div key={idx} className="grid gap-3 md:grid-cols-[2fr_3fr_40px]">
                  <Input
                    value={criterion.name}
                    onChange={(event) => onUpdateCriterion(realIdx, 'name', event.target.value)}
                    placeholder="Nombre del criterio"
                  />
                  <Input
                    value={criterion.description || ''}
                    onChange={(event) => onUpdateCriterion(realIdx, 'description', event.target.value)}
                    placeholder="Descripción opcional"
                  />
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => onRemoveCriterion(realIdx)}
                    aria-label="Quitar criterio"
                    icon={<X size={14} />}
                  />
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="m-0 text-base font-semibold text-text">Criterios ponderados</h3>
          <Button type="button" size="sm" onClick={() => onAddCriterion('Weighted')}>
            Agregar criterio
          </Button>
        </div>
        {weighted.length === 0 ? (
          <p className="rounded-md border border-border bg-background px-3 py-2 text-sm text-text-muted">
            No hay criterios ponderados definidos.
          </p>
        ) : (
          <div className="w-full overflow-x-auto">
            <div className="min-w-[620px]">
              <div className="mb-2 grid grid-cols-[2fr_3fr_80px_40px] gap-3 border-b border-border px-2 pb-2 text-xs font-semibold text-text-muted">
                <span>Nombre</span>
                <span>Descripción</span>
                <span>Peso %</span>
                <span />
              </div>
              <div className="grid gap-2">
                {weighted.map((criterion, idx) => {
                  const realIdx = criteriaForm.indexOf(criterion)
                  return (
                    <div key={idx} className="grid grid-cols-[2fr_3fr_80px_40px] gap-3">
                      <Input
                        value={criterion.name}
                        onChange={(event) => onUpdateCriterion(realIdx, 'name', event.target.value)}
                        placeholder="Nombre del criterio"
                      />
                      <Input
                        value={criterion.description || ''}
                        onChange={(event) => onUpdateCriterion(realIdx, 'description', event.target.value)}
                        placeholder="Descripción opcional"
                      />
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={criterion.weight}
                        onChange={(event) => onUpdateCriterion(realIdx, 'weight', event.target.value)}
                      />
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => onRemoveCriterion(realIdx)}
                        aria-label="Quitar criterio"
                        icon={<X size={14} />}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
        {weighted.length > 0 && weightSum !== 100 && (
          <Alert variant="warning">La suma de pesos debe ser 100% (actual: {weightSum}%).</Alert>
        )}
      </section>

      <div className="flex justify-end">
        <Button type="button" onClick={onSaveCriteria} disabled={guardando} loading={guardando}>
          Guardar criterios
        </Button>
      </div>
    </div>
  )
}

interface ResumenCriteriosProps {
  criteria: Criterion[]
  exclusionaryCriteria: Criterion[]
  weightedCriteria: Criterion[]
}

function ResumenCriterios({
  criteria,
  exclusionaryCriteria,
  weightedCriteria,
}: ResumenCriteriosProps) {
  if (criteria.length === 0) {
    return <Alert variant="info">No hay criterios definidos. Haz clic en "Editar criterios" para crearlos.</Alert>
  }

  return (
    <div className="space-y-2 text-sm text-text">
      {exclusionaryCriteria.length > 0 && (
        <p className="m-0">
          <strong>Excluyentes:</strong> {exclusionaryCriteria.map((c) => c.name).join(', ')}
        </p>
      )}
      {weightedCriteria.length > 0 && (
        <p className="m-0">
          <strong>Ponderados:</strong> {weightedCriteria.map((c) => `${c.name} (${c.weight}%)`).join(', ')}
        </p>
      )}
    </div>
  )
}

interface EvaluacionProveedorFormSectionProps {
  criteria: Criterion[]
  postores: Postor[]
  guardando: boolean
  onSubmit: (event: React.FormEvent) => void
  getPassed: (criterionId: string, supplierId: string) => boolean
  getScore: (criterionId: string, supplierId: string) => string
  getSupplierWeightedScore: (supplierId: string) => number | null
  isSupplierExcluded: (supplierId: string) => boolean
  onPassedChange: (criterionId: string, supplierId: string, passed: boolean) => void
  onScoreChange: (criterionId: string, supplierId: string, value: string) => void
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
}: EvaluacionProveedorFormSectionProps) {
  if (criteria.length === 0) return null

  const columns: Array<DataTableColumn<Postor & Record<string, unknown>>> = [
    { header: 'Proveedor', accessor: 'name' },
    {
      header: 'Oferta',
      cell: (row) => formatearPesos(row.monto),
    },
    ...criteria.map((criterion) => ({
      header: (
        <span>
          {criterion.name}
          {criterion.type === 'Weighted' && <span className="text-text-muted"> ({criterion.weight}%)</span>}
        </span>
      ) as unknown as string,
      cell: (row: Postor & Record<string, unknown>) => {
        if (criterion.type === 'Exclusionary') {
          return (
            <Select
              value={getPassed(criterion.id, row.id) ? 'true' : 'false'}
              onChange={(event) => onPassedChange(criterion.id, row.id, event.target.value === 'true')}
              fieldClassName="mb-0 min-w-[90px]"
              aria-label={`${criterion.name} para ${row.name as string}`}
            >
              <option value="true">Sí</option>
              <option value="false">No</option>
            </Select>
          )
        }
        return (
          <Input
            type="number"
            min="0"
            max="100"
            value={getScore(criterion.id, row.id)}
            onChange={(event) => onScoreChange(criterion.id, row.id, event.target.value)}
            placeholder="0-100"
            fieldClassName="mb-0 min-w-[100px]"
            aria-label={`${criterion.name} para ${row.name as string}`}
          />
        )
      },
    })),
    {
      header: 'Score',
      cell: (row) => {
        const score = getSupplierWeightedScore(row.id)
        return score !== null ? `${score}%` : '---'
      },
    },
    {
      header: 'Estado',
      cell: (row) => (
        isSupplierExcluded(row.id)
          ? <Badge variant="error">Excluido</Badge>
          : <Badge variant="success">Apto</Badge>
      ),
    },
  ]

  return (
    <FormSection
      title="Evaluación por proveedor"
      description="Excluyentes: marcar Sí/No. Ponderados: asignar puntaje de 0 a 100."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <DataTable
          columns={columns}
          rows={postores as unknown as (Postor & Record<string, unknown>)[]}
          getRowId={(row) => row.id}
        />
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="submit" disabled={guardando} loading={guardando}>
            Guardar evaluación
          </Button>
        </div>
      </form>
    </FormSection>
  )
}

function formatearPesos(monto: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(monto)
}
