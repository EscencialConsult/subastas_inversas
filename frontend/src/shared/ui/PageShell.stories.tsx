import { Plus } from 'lucide-react'
import { Button } from './Button'
import { Badge } from './Badge'
import { PageShell } from './PageShell'
import { PageHeader } from './PageHeader'
import { FormSection } from './FormSection'
import { FormActions } from './FormActions'
import { FormErrorSummary } from './FormErrorSummary'

export default {
  title: 'UI/Layout/PageShell',
  tags: ['autodocs'],
}

export const Default = {
  render: () => (
    <PageShell>
      <PageHeader
        eyebrow="Compras"
        title="Procesos de compra"
        description="Vista operativa para consultar procesos, revisar estados y crear nuevas solicitudes."
        meta={<Badge variant="info">12 activos</Badge>}
        actions={<Button icon={<Plus size={16} />}>Nuevo proceso</Button>}
      />

      <FormSection
        title="Datos principales"
        description="Agrupa campos relacionados y mantiene acciones secundarias en el encabezado."
        actions={<Button variant="secondary" size="sm">Limpiar</Button>}
      >
        <FormErrorSummary
          errors={[
            { field: 'Presupuesto', message: 'Debe ser mayor a cero.' },
            { field: 'Fecha limite', message: 'Debe ser posterior a la fecha actual.' },
          ]}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-10 rounded-md border border-border bg-background" />
          <div className="h-10 rounded-md border border-border bg-background" />
          <div className="h-24 rounded-md border border-border bg-background sm:col-span-2" />
        </div>
      </FormSection>

      <FormActions>
        <Button variant="secondary">Cancelar</Button>
        <Button>Guardar</Button>
      </FormActions>
    </PageShell>
  ),
}
