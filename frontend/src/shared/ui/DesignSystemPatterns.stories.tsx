import type { Meta, StoryObj } from '@storybook/react-vite'
import { Download, Eye, Plus, Search, Trash2 } from 'lucide-react'
import {
  Alert,
  Button,
  DataTable,
  DetailPanel,
  EmptyState,
  FiltersBar,
  FormActions,
  FormSection,
  Input,
  RowActions,
  Select,
  StatusBadge,
  TableToolbar,
} from './index'

const meta = {
  title: 'Design System/Patterns',
  parameters: { layout: 'padded' },
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

const rows = [
  { id: '1', codigo: 'PR-001', titulo: 'Insumos medicos', estado: 'publicado', monto: '$ 2.400.000' },
  { id: '2', codigo: 'PR-002', titulo: 'Limpieza integral', estado: 'en_subasta', monto: '$ 860.000' },
]

export const ListadoConFiltros: Story = {
  render: () => (
    <div className="space-y-4">
      <FiltersBar
        actions={(
          <>
            <Button variant="secondary" icon={<Download size={16} />}>Exportar</Button>
            <Button icon={<Plus size={16} />}>Nuevo</Button>
          </>
        )}
      >
        <Input label="Buscar" placeholder="Codigo, titulo o proveedor" />
        <Select label="Estado" defaultValue="">
          <option value="">Todos</option>
          <option value="publicado">Publicado</option>
          <option value="en_subasta">En subasta</option>
        </Select>
      </FiltersBar>

      <TableToolbar
        title="Procesos"
        description="Resultados filtrados por tenant y permisos."
        meta={<StatusBadge status="publicado" />}
        actions={<Button variant="ghost" icon={<Search size={16} />}>Actualizar</Button>}
      />
      <DataTable
        data={rows}
        columns={[
          { header: 'Codigo', accessor: 'codigo' },
          { header: 'Titulo', accessor: 'titulo' },
          { header: 'Estado', cell: (row) => <StatusBadge status={row.estado} /> },
          { header: 'Monto', accessor: 'monto', align: 'right' },
          {
            header: '',
            cell: () => (
              <RowActions>
                <Button variant="ghost" size="sm" icon={<Eye size={14} />}>Ver</Button>
                <Button variant="danger" size="sm" icon={<Trash2 size={14} />}>Eliminar</Button>
              </RowActions>
            ),
          },
        ]}
      />
    </div>
  ),
}

export const FormularioEstandar: Story = {
  render: () => (
    <FormSection
      title="Datos principales"
      description="Usar esta estructura para formularios transaccionales."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Titulo" placeholder="Compra de insumos" required />
        <Select label="Modalidad" defaultValue="subasta">
          <option value="subasta">Subasta inversa</option>
          <option value="directa">Contratacion directa</option>
        </Select>
      </div>
      <Alert variant="info">Los errores de validacion deben mostrarse con FormErrorSummary y errores por campo.</Alert>
      <FormActions>
        <Button variant="ghost">Cancelar</Button>
        <Button>Guardar</Button>
      </FormActions>
    </FormSection>
  ),
}

export const PanelDetalleYEstados: Story = {
  render: () => (
    <div className="space-y-4">
      <DetailPanel
        title="Resumen del proceso"
        description="Paneles de detalle para legajos, auditoria y perfiles."
        actions={<StatusBadge status="aprobada" />}
      >
        <dl className="grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold uppercase text-text-muted">Codigo</dt>
            <dd className="m-0 text-sm text-text">PR-001</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-text-muted">Proveedor</dt>
            <dd className="m-0 text-sm text-text">ACME SRL</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-text-muted">Monto</dt>
            <dd className="m-0 text-sm text-text">$ 2.400.000</dd>
          </div>
        </dl>
      </DetailPanel>
      <EmptyState title="Sin resultados" description="Usar EmptyState cuando una lista no tiene datos para mostrar." />
    </div>
  ),
}
