import { Badge } from '../../../shared/ui/Badge'
import { Button } from '../../../shared/ui/Button'
import { Checkbox } from '../../../shared/ui/Checkbox'
import { DataTable, type DataTableColumn } from '../../../shared/ui/DataTable'
import { FormActions } from '../../../shared/ui/FormActions'
import { FormSection } from '../../../shared/ui/FormSection'
import { Input } from '../../../shared/ui/Input'
import { Select } from '../../../shared/ui/Select'
import { Textarea } from '../../../shared/ui/Textarea'
import type { DocumentTemplateDto, PlantillaDatos } from '../../../shared/api/configuracionApi'

export const TIPOS_PLANTILLA = [
  { value: '0', label: 'Acta' },
  { value: '1', label: 'Contrato' },
  { value: '2', label: 'Orden de compra' },
]

export function etiquetaTipoPlantilla(type: unknown) {
  const match = TIPOS_PLANTILLA.find((item) => Number(item.value) === Number(type))
  return match?.label ?? 'Acta'
}

interface PlantillasSectionProps {
  plantillas: DocumentTemplateDto[]
  form: PlantillaDatos
  cargando: boolean
  guardando: boolean
  onSubmit: (event: React.FormEvent) => void
  onChange: (campo: keyof PlantillaDatos, valor: unknown) => void
  onLoadActive: (tipo: string | number) => void
  onSetForm: (form: PlantillaDatos) => void
  onActivate: (id: string) => void
}

export function PlantillasSection({
  plantillas,
  form,
  cargando,
  guardando,
  onSubmit,
  onChange,
  onLoadActive,
  onSetForm,
  onActivate,
}: PlantillasSectionProps) {
  const plantillaColumns: Array<DataTableColumn<DocumentTemplateDto & Record<string, unknown>>> = [
    {
      header: 'Tipo',
      cell: (row) => etiquetaTipoPlantilla(row.type),
    },
    { header: 'Nombre', accessor: 'name', sortable: true },
    {
      header: 'Versión',
      cell: (row) => `v${row.version}`,
    },
    {
      header: 'Estado',
      cell: (row) => (
        <Badge variant={row.active ? 'success' : 'neutral'}>
          {row.active ? 'Activa' : 'Histórica'}
        </Badge>
      ),
    },
    {
      header: '',
      align: 'right',
      cell: (row) => (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              onSetForm({
                type: String(row.type),
                name: row.name ?? '',
                content: row.content ?? '',
                activate: true,
              })
            }
          >
            Nueva versión
          </Button>
          {!row.active && row.id && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onActivate(row.id!)}
            >
              Activar
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
          Nueva versión de plantilla
        </h2>

        <div className="space-y-4">
          <Select
            label="Tipo"
            value={form.type}
            onChange={(e) => {
              onChange('type', e.target.value)
              onLoadActive(e.target.value)
            }}
          >
            {TIPOS_PLANTILLA.map((tipo) => (
              <option key={tipo.value} value={tipo.value}>
                {tipo.label}
              </option>
            ))}
          </Select>

          <Input
            label="Nombre"
            value={form.name}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder="Contrato estándar"
          />

          <Textarea
            label="Contenido"
            value={form.content}
            onChange={(e) => onChange('content', e.target.value)}
            placeholder='Texto de plantilla con placeholders como {{process.code}}'
            rows={8}
          />

          <Checkbox
            label="Activar esta versión"
            checked={form.activate}
            onChange={(e) => onChange('activate', e.target.checked)}
          />
        </div>

        <FormActions>
          <Button variant="ghost" type="button" onClick={() => onLoadActive(form.type)}>
            Usar versión activa
          </Button>
          <Button type="submit" loading={guardando}>
            Crear versión
          </Button>
        </FormActions>
      </form>

      <FormSection title="Plantillas de documentos">
        <DataTable
          columns={plantillaColumns}
          rows={plantillas as (DocumentTemplateDto & Record<string, unknown>)[]}
          loading={cargando}
          getRowId={(row) => row.id ?? String(Math.random())}
          emptyTitle="Sin plantillas"
          emptyDescription="No hay plantillas configuradas."
        />
      </FormSection>
    </div>
  )
}
