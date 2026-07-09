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

const colorTokens = [
  { name: 'primary', value: '#1d4ed8', cssVar: 'var(--color-primary)', usage: 'Accion principal, foco y navegacion activa' },
  { name: 'primary-hover', value: '#1e40af', cssVar: 'var(--color-primary-hover)', usage: 'Hover de acciones primarias' },
  { name: 'primary-soft', value: '#dbeafe', cssVar: 'var(--color-primary-soft)', usage: 'Fondos suaves e indicadores activos' },
  { name: 'surface', value: '#ffffff', cssVar: 'var(--color-surface)', usage: 'Cards, modales y controles' },
  { name: 'background', value: '#f8fafc', cssVar: 'var(--color-background)', usage: 'Fondo general de pantallas' },
  { name: 'border', value: '#cbd5e1', cssVar: 'var(--color-border)', usage: 'Bordes y divisores' },
  { name: 'text', value: '#0f172a', cssVar: 'var(--color-text)', usage: 'Texto principal' },
  { name: 'text-muted', value: '#64748b', cssVar: 'var(--color-text-muted)', usage: 'Texto secundario y ayudas' },
  { name: 'success', value: '#166534', cssVar: 'var(--color-success)', usage: 'Estados correctos o aprobados' },
  { name: 'success-bg', value: '#dcfce7', cssVar: 'var(--color-success-bg)', usage: 'Fondo de estado correcto' },
  { name: 'warning', value: '#92400e', cssVar: 'var(--color-warning)', usage: 'Advertencias y atencion' },
  { name: 'warning-bg', value: '#fef3c7', cssVar: 'var(--color-warning-bg)', usage: 'Fondo de advertencia' },
  { name: 'error', value: '#991b1b', cssVar: 'var(--color-error)', usage: 'Errores y acciones destructivas' },
  { name: 'error-bg', value: '#fee2e2', cssVar: 'var(--color-error-bg)', usage: 'Fondo de error' },
  { name: 'info', value: '#0369a1', cssVar: 'var(--color-info)', usage: 'Informacion contextual' },
  { name: 'info-bg', value: '#e0f2fe', cssVar: 'var(--color-info-bg)', usage: 'Fondo informativo' },
]

const spacingTokens = [
  ['ui-1', '4px'],
  ['ui-2', '8px'],
  ['ui-3', '12px'],
  ['ui-4', '16px'],
  ['ui-5', '20px'],
  ['ui-6', '24px'],
  ['ui-8', '32px'],
  ['ui-10', '40px'],
  ['ui-12', '48px'],
]

const typeTokens = [
  ['xs', '12px'],
  ['sm', '14px'],
  ['base', '16px'],
  ['lg', '18px'],
  ['xl', '20px'],
  ['2xl', '24px'],
  ['3xl', '30px'],
]

const rows = [
  { id: '1', codigo: 'PR-001', titulo: 'Insumos medicos', estado: 'publicado', monto: '$ 2.400.000' },
  { id: '2', codigo: 'PR-002', titulo: 'Limpieza integral', estado: 'en_subasta', monto: '$ 860.000' },
]

export const FundacionVisual: Story = {
  render: () => (
    <div className="space-y-8">
      <section>
        <h2 className="m-0 text-xl font-semibold text-text">Paleta oficial</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-text-muted">
          Usar estos tokens desde Tailwind o CSS variables. Los nombres legacy en espanol son aliases temporales.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {colorTokens.map((token) => (
            <div key={token.name} className="overflow-hidden rounded-md border border-border bg-surface shadow-sm">
              <div className="h-16 border-b border-border" style={{ background: token.cssVar }} />
              <div className="space-y-1 p-3">
                <div className="font-mono text-xs font-semibold text-text">{token.name}</div>
                <div className="font-mono text-xs text-text-muted">{token.value}</div>
                <p className="m-0 text-xs leading-5 text-text-muted">{token.usage}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="m-0 text-xl font-semibold text-text">Escala de espaciado</h2>
          <div className="mt-4 space-y-3">
            {spacingTokens.map(([name, value]) => (
              <div key={name} className="grid grid-cols-[72px_64px_1fr] items-center gap-3 text-sm">
                <code className="text-xs text-text-muted">{name}</code>
                <span className="font-mono text-xs text-text">{value}</span>
                <span className="h-3 rounded-sm bg-primary" style={{ width: value }} />
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="m-0 text-xl font-semibold text-text">Escala tipografica</h2>
          <div className="mt-4 space-y-3">
            {typeTokens.map(([name, value]) => (
              <div key={name} className="grid grid-cols-[72px_64px_1fr] items-baseline gap-3">
                <code className="text-xs text-text-muted">{name}</code>
                <span className="font-mono text-xs text-text">{value}</span>
                <span className="font-semibold text-text" style={{ fontSize: value }}>Texto de referencia</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  ),
}

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
        rows={rows}
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
