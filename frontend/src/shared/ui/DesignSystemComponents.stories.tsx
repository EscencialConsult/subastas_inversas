import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  AlertCircle,
  CalendarDays,
  Check,
  Download,
  Eye,
  Info,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardGrid,
  Checkbox,
  ConfirmDialog,
  DataTable,
  DatePicker,
  DetailPanel,
  Dropdown,
  EmptyState,
  FilePicker,
  FiltersBar,
  FormActions,
  FormErrorSummary,
  FormField,
  FormSection,
  Input,
  PageHeader,
  PageShell,
  RowActions,
  Select,
  Skeleton,
  Spinner,
  StatusBadge,
  TableSkeleton,
  TableToolbar,
  Tabs,
  Textarea,
  Toast,
  Tooltip,
} from './index'

const meta = {
  title: 'Design System/Components',
  parameters: { layout: 'fullscreen' },
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

const tableRows = [
  { id: '1', code: 'PR-001', title: 'Insumos medicos', status: 'published', amount: 2400000 },
  { id: '2', code: 'PR-002', title: 'Limpieza integral', status: 'pending', amount: 860000 },
  { id: '3', code: 'PR-003', title: 'Equipamiento informatico', status: 'rejected', amount: 1260000 },
]

const tableColumns = [
  { header: 'Codigo', accessor: 'code', sortable: true, width: '120px' },
  { header: 'Titulo', accessor: 'title', sortable: true },
  { header: 'Estado', accessor: 'status', cell: (row: (typeof tableRows)[number]) => <StatusBadge status={row.status} /> },
  {
    header: 'Monto',
    accessor: 'amount',
    align: 'right' as const,
    cell: (row: (typeof tableRows)[number]) => row.amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }),
  },
  {
    header: '',
    id: 'actions',
    align: 'right' as const,
    cell: () => (
      <RowActions>
        <Button variant="ghost" size="sm" icon={<Eye size={14} />}>Ver</Button>
        <Button variant="danger" size="sm" icon={<Trash2 size={14} />}>Eliminar</Button>
      </RowActions>
    ),
  },
]

function OverlayExamples() {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [toastVisible, setToastVisible] = useState(true)

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card hover={false}>
        <h3 className="m-0 text-base font-semibold text-text">Confirmaciones</h3>
        <p className="mt-2 text-sm text-text-muted">Usar `ConfirmDialog` para acciones destructivas o irreversibles.</p>
        <Button variant="danger" icon={<Trash2 size={16} />} onClick={() => setConfirmOpen(true)}>
          Abrir confirmacion
        </Button>
        <ConfirmDialog
          open={confirmOpen}
          title="Eliminar proceso"
          description="Esta accion no se puede deshacer. Confirma solo si ya revisaste el expediente."
          confirmLabel="Eliminar"
          onConfirm={() => setConfirmOpen(false)}
          onCancel={() => setConfirmOpen(false)}
        />
      </Card>

      <Card hover={false}>
        <h3 className="m-0 text-base font-semibold text-text">Notificaciones</h3>
        <p className="mt-2 text-sm text-text-muted">Usar `Toast` para feedback asincronico no bloqueante.</p>
        {toastVisible ? (
          <Toast id={1} type="success" message="Cambios guardados correctamente." duration={100000} onDismiss={() => setToastVisible(false)} />
        ) : (
          <Button variant="secondary" onClick={() => setToastVisible(true)}>Mostrar toast</Button>
        )}
      </Card>
    </div>
  )
}

export const CatalogoCompleto: Story = {
  render: () => (
    <PageShell width="wide">
      <PageHeader
        eyebrow="Design System"
        title="Catalogo de componentes"
        description="Referencia operativa para construir pantallas con patrones reutilizables."
        actions={(
          <>
            <Button variant="secondary" icon={<Download size={16} />}>Exportar</Button>
            <Button icon={<Plus size={16} />}>Crear</Button>
          </>
        )}
        meta={(
          <>
            <StatusBadge status="published" label="Publicado" />
            <Badge variant="neutral">v1</Badge>
          </>
        )}
      />

      <FormSection title="Acciones y feedback" description="Botones, badges, alertas, loaders y estados de sistema.">
        <div className="flex flex-wrap gap-2">
          <Button>Primario</Button>
          <Button variant="secondary">Secundario</Button>
          <Button variant="danger">Peligro</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="outline">Outline</Button>
          <Tooltip text="Accion con icono">
            <Button icon={<Check size={16} />} aria-label="Confirmar seleccion" />
          </Tooltip>
          <Button loading>Guardando</Button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="success">Aprobado</Badge>
          <Badge variant="warning">Pendiente</Badge>
          <Badge variant="error">Rechazado</Badge>
          <Badge variant="info">Informativo</Badge>
          <Badge variant="neutral">Borrador</Badge>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <Alert variant="info" title="Informacion">Usar alertas para mensajes persistentes dentro de una pantalla.</Alert>
          <Alert variant="warning" title="Atencion">Los estados de riesgo deben incluir texto, no solo color.</Alert>
          <Alert variant="success" title="Correcto">La operacion se completo correctamente.</Alert>
          <Alert variant="error" title="Error">No pudimos completar la operacion solicitada.</Alert>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <Spinner />
          <Skeleton className="h-8 w-48" />
          <TableSkeleton rows={2} columns={3} />
        </div>
      </FormSection>

      <FormSection title="Formularios" description="Entradas, ayuda, validacion y acciones consistentes.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Titulo" placeholder="Compra de insumos" required />
          <Select label="Estado" defaultValue="published">
            <option value="published">Publicado</option>
            <option value="pending">Pendiente</option>
            <option value="rejected">Rechazado</option>
          </Select>
          <DatePicker label="Fecha limite" defaultValue="2026-07-06" icon={undefined} />
          <Input label="Presupuesto" type="number" help="Monto estimado en ARS." placeholder="2400000" />
          <Textarea label="Descripcion" placeholder="Detalle del requerimiento" fieldClassName="sm:col-span-2" />
          <FilePicker label="Documentacion" accept="application/pdf" help="Adjuntar PDF firmado." fieldClassName="sm:col-span-2" />
          <Checkbox label="Confirmo que revise la informacion" help="Este patron se usa para confirmaciones simples." />
        </div>

        <FormField label="Campo compuesto" help="Usar FormField cuando el control no es un input basico.">
          {({ id, describedBy }) => (
            <div className="flex gap-2">
              <Input id={id} aria-describedby={describedBy} placeholder="Buscar por CUIT" fieldClassName="mb-0 flex-1" />
              <Button variant="secondary" icon={<Search size={16} />}>Buscar</Button>
            </div>
          )}
        </FormField>

        <FormErrorSummary
          title="Revisa estos campos"
          errors={['El titulo es obligatorio.', 'La fecha limite debe ser posterior a hoy.']}
        />

        <FormActions>
          <Button variant="ghost">Cancelar</Button>
          <Button>Guardar</Button>
        </FormActions>
      </FormSection>

      <FormSection title="Listados y filtros" description="Patrones canonicos para busqueda, herramientas, tablas y acciones por fila.">
        <FiltersBar
          actions={<Button variant="secondary" icon={<Download size={16} />}>Exportar</Button>}
        >
          <Input label="Buscar" placeholder="Codigo, titulo o proveedor" />
          <Select label="Estado" defaultValue="">
            <option value="">Todos</option>
            <option value="published">Publicado</option>
            <option value="pending">Pendiente</option>
          </Select>
        </FiltersBar>
        <TableToolbar
          title="Procesos"
          description="Resultados filtrados por tenant y permisos."
          meta={<Badge variant="info">3 resultados</Badge>}
          actions={(
            <Dropdown
              align="right"
              trigger={<Button variant="secondary" icon={<MoreHorizontal size={16} />}>Acciones</Button>}
              items={[
                { label: 'Exportar CSV' },
                { label: 'Descargar PDF' },
              ]}
            />
          )}
        />
        <DataTable columns={tableColumns} rows={tableRows} pageSize={2} />
      </FormSection>

      <section className="grid gap-4 lg:grid-cols-2">
        <DetailPanel
          title="Panel de detalle"
          description="Usar para legajos, auditoria, perfil y resumenes operativos."
          actions={<StatusBadge status="approved" label="Aprobado" />}
        >
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase text-text-muted">Codigo</dt>
              <dd className="m-0 text-sm text-text">PR-001</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-text-muted">Fecha</dt>
              <dd className="m-0 text-sm text-text">06/07/2026</dd>
            </div>
          </dl>
        </DetailPanel>

        <CardGrid>
          <Card>
            <h3 className="m-0 text-base font-semibold text-text">Card reutilizable</h3>
            <p className="mt-2 text-sm text-text-muted">Usar para entidades repetidas o bloques compactos.</p>
          </Card>
          <Card>
            <h3 className="m-0 text-base font-semibold text-text">Estado vacio</h3>
            <EmptyState
              icon={AlertCircle}
              title="Sin documentos"
              description="Cuando no hay datos, mostrar una explicacion y una accion util."
              action={<Button size="sm" icon={<Plus size={14} />}>Agregar</Button>}
            />
          </Card>
        </CardGrid>
      </section>

      <FormSection title="Navegacion contextual" description="Tabs y contenido relacionado.">
        <Tabs
          tabs={[
            { label: <span className="inline-flex items-center gap-2"><Info size={14} />Resumen</span>, content: <p className="m-0 text-sm text-text-muted">Contenido del resumen.</p> },
            { label: <span className="inline-flex items-center gap-2"><CalendarDays size={14} />Historial</span>, content: <p className="m-0 text-sm text-text-muted">Contenido del historial.</p> },
          ]}
        />
      </FormSection>

      <OverlayExamples />
    </PageShell>
  ),
}
