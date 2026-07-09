import { Badge } from '../../../shared/ui/Badge'
import { Button } from '../../../shared/ui/Button'
import { Checkbox } from '../../../shared/ui/Checkbox'
import { DataTable, type DataTableColumn } from '../../../shared/ui/DataTable'
import { FormActions } from '../../../shared/ui/FormActions'
import { FormSection } from '../../../shared/ui/FormSection'
import { Input } from '../../../shared/ui/Input'
import { Select } from '../../../shared/ui/Select'
import type { ApprovalWorkflowDto, CircuitoDatos } from '../../../shared/api/configuracionApi'

export const ROLES_APROBACION = [
  { value: '1', label: 'Administrador' },
  { value: '4', label: 'Evaluador' },
  { value: '5', label: 'Auditor' },
  { value: '6', label: 'Autoridad' },
]

function formatearPesos(monto: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(monto)
}

function formatearRango(modalidad: { minAmount?: number; maxAmount?: number | null }) {
  const min = formatearPesos(modalidad.minAmount ?? 0)
  if (modalidad.maxAmount == null) return `Desde ${min}`
  return `${min} a ${formatearPesos(modalidad.maxAmount)}`
}

function etiquetaRol(role: unknown) {
  const match = ROLES_APROBACION.find((item) => Number(item.value) === Number(role))
  return match?.label ?? 'Autoridad'
}

function formatearNiveles(levels: Array<{ levelOrder?: number; requiredRole?: unknown; amountThreshold?: number }> = []) {
  return [...levels]
    .sort((a, b) => (a.levelOrder ?? 0) - (b.levelOrder ?? 0))
    .map(
      (level) =>
        `N${level.levelOrder ?? 0}: ${etiquetaRol(level.requiredRole)} desde ${formatearPesos(level.amountThreshold ?? 0)}`,
    )
    .join(' / ')
}

interface CircuitosSectionProps {
  circuitos: ApprovalWorkflowDto[]
  form: CircuitoDatos
  editandoId: string | null
  cargando: boolean
  guardando: boolean
  onSubmit: (event: React.FormEvent) => void
  onChange: (campo: keyof CircuitoDatos, valor: unknown) => void
  onLevelChange: (index: number, campo: string, valor: unknown) => void
  onAddLevel: () => void
  onRemoveLevel: (index: number) => void
  onEdit: (circuito: ApprovalWorkflowDto) => void
  onCancel: () => void
  onDelete: (id: string) => void
}

export function CircuitosSection({
  circuitos,
  form,
  editandoId,
  cargando,
  guardando,
  onSubmit,
  onChange,
  onLevelChange,
  onAddLevel,
  onRemoveLevel,
  onEdit,
  onCancel,
  onDelete,
}: CircuitosSectionProps) {
  const circuitoColumns: Array<DataTableColumn<ApprovalWorkflowDto & Record<string, unknown>>> = [
    { header: 'Nombre', accessor: 'name', sortable: true },
    {
      header: 'Rango',
      cell: (row) => formatearRango(row),
    },
    {
      header: 'Niveles',
      cell: (row) => formatearNiveles(row.levels),
    },
    {
      header: 'Estado',
      cell: (row) => (
        <Badge variant={row.active ? 'success' : 'neutral'}>
          {row.active ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      header: '',
      align: 'right',
      cell: (row) => (
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={() => onEdit(row)}>
            Editar
          </Button>
          {row.id && (
            <Button variant="ghost" size="sm" onClick={() => onDelete(row.id!)}>
              Eliminar
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <form
        className="rounded-md border border-border bg-surface p-5 shadow-sm"
        onSubmit={onSubmit}
      >
        <h2 className="mb-4 text-lg font-semibold text-text">
          {editandoId ? 'Editar circuito' : 'Nuevo circuito de aprobación'}
        </h2>

        <div className="space-y-4">
          <Input
            label="Nombre"
            value={form.name}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder="Aprobación de compras mayores"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Monto mínimo"
              type="number"
              min="0"
              step="0.01"
              value={form.minAmount ?? ''}
              onChange={(e) => onChange('minAmount', e.target.value)}
            />
            <Input
              label="Monto máximo"
              type="number"
              min="0"
              step="0.01"
              value={form.maxAmount ?? ''}
              onChange={(e) => onChange('maxAmount', e.target.value)}
              placeholder="Sin tope"
            />
          </div>

          <Checkbox
            label="Activo"
            checked={form.active}
            onChange={(e) => onChange('active', e.target.checked)}
          />

          <div>
            <h3 className="mb-3 text-base font-semibold text-text">Niveles</h3>
            <div className="space-y-4">
              {form.levels.map((level, index) => (
                <div
                  key={index}
                  className="grid items-end gap-3 rounded-md border border-border bg-background p-4 sm:grid-cols-[1fr_1fr_auto]"
                >
                  <Select
                    label={`Nivel ${index + 1} - Rol`}
                    value={level.requiredRole}
                    onChange={(e) => onLevelChange(index, 'requiredRole', e.target.value)}
                  >
                    {ROLES_APROBACION.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </Select>
                  <Input
                    label="Umbral"
                    type="number"
                    min="0"
                    step="0.01"
                    value={level.amountThreshold}
                    onChange={(e) => onLevelChange(index, 'amountThreshold', e.target.value)}
                  />
                  {form.levels.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => onRemoveLevel(index)}
                    >
                      Quitar
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <Button variant="ghost" type="button" className="mt-3" onClick={onAddLevel}>
              Agregar nivel
            </Button>
          </div>
        </div>

        <FormActions>
          {editandoId && (
            <Button variant="ghost" type="button" onClick={onCancel}>
              Cancelar
            </Button>
          )}
          <Button type="submit" loading={guardando}>
            Guardar circuito
          </Button>
        </FormActions>
      </form>

      <FormSection title="Circuitos de aprobación">
        <DataTable
          columns={circuitoColumns}
          rows={circuitos as (ApprovalWorkflowDto & Record<string, unknown>)[]}
          loading={cargando}
          getRowId={(row) => row.id ?? String(Math.random())}
          emptyTitle="Sin circuitos"
          emptyDescription="No hay circuitos configurados."
        />
      </FormSection>
    </div>
  )
}
