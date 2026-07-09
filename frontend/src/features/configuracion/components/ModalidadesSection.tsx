import { Button } from '../../../shared/ui/Button'
import { Checkbox } from '../../../shared/ui/Checkbox'
import { DataTable, type DataTableColumn } from '../../../shared/ui/DataTable'
import { FormActions } from '../../../shared/ui/FormActions'
import { FormSection } from '../../../shared/ui/FormSection'
import { Input } from '../../../shared/ui/Input'
import { Textarea } from '../../../shared/ui/Textarea'
import { Badge } from '../../../shared/ui/Badge'
import type { ContractingModeDto, ModalidadDatos } from '../../../shared/api/configuracionApi'

interface ModalidadesSectionProps {
  modalidades: ContractingModeDto[]
  form: ModalidadDatos
  editandoId: string | null
  cargando: boolean
  guardando: boolean
  onSubmit: (event: React.FormEvent) => void
  onChange: (campo: keyof ModalidadDatos, valor: unknown) => void
  onEdit: (modalidad: ContractingModeDto) => void
  onCancel: () => void
  onDelete: (id: string) => void
}

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

export function ModalidadesSection({
  modalidades,
  form,
  editandoId,
  cargando,
  guardando,
  onSubmit,
  onChange,
  onEdit,
  onCancel,
  onDelete,
}: ModalidadesSectionProps) {
  const modalidadColumns: Array<DataTableColumn<ContractingModeDto & Record<string, unknown>>> = [
    { header: 'Nombre', accessor: 'name', sortable: true },
    {
      header: 'Rango',
      cell: (row) => formatearRango(row),
    },
    {
      header: 'Subasta',
      cell: (row) => (row.requiresAuction ? 'Sí' : 'No'),
    },
    {
      header: 'Estado',
      cell: (row) => (
        <Badge variant={row.active ? 'success' : 'neutral'}>
          {row.active ? 'Activa' : 'Inactiva'}
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
          {editandoId ? 'Editar modalidad' : 'Nueva modalidad'}
        </h2>

        <div className="space-y-4">
          <Input
            label="Nombre"
            value={form.name}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder="Compra directa"
          />

          <Textarea
            label="Descripción"
            value={form.description}
            onChange={(e) => onChange('description', e.target.value)}
            placeholder="Reglas generales de la modalidad"
            rows={3}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Monto mínimo"
              type="number"
              min="0"
              step="0.01"
              value={form.minAmount}
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
            label="Requiere subasta"
            checked={form.requiresAuction}
            onChange={(e) => onChange('requiresAuction', e.target.checked)}
          />

          <Checkbox
            label="Activa"
            checked={form.active}
            onChange={(e) => onChange('active', e.target.checked)}
          />
        </div>

        <FormActions>
          {editandoId && (
            <Button variant="ghost" type="button" onClick={onCancel}>
              Cancelar
            </Button>
          )}
          <Button type="submit" loading={guardando}>
            Guardar
          </Button>
        </FormActions>
      </form>

      <FormSection title="Modalidades">
        <DataTable
          columns={modalidadColumns}
          rows={modalidades as (ContractingModeDto & Record<string, unknown>)[]}
          loading={cargando}
          getRowId={(row) => row.id ?? String(Math.random())}
          emptyTitle="Sin modalidades"
          emptyDescription="No hay modalidades configuradas."
        />
      </FormSection>
    </div>
  )
}
