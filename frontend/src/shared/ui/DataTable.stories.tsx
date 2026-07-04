import { Button } from './Button'
import { DataTable } from './DataTable'
import { StatusBadge } from './StatusBadge'

const rows = [
  { id: '1', code: 'OC-001', title: 'Equipamiento medico', status: 'approved', budget: 1240000 },
  { id: '2', code: 'OC-002', title: 'Servicios de limpieza', status: 'pending', budget: 820000 },
  { id: '3', code: 'OC-003', title: 'Insumos informaticos', status: 'rejected', budget: 460000 },
]

const columns = [
  { header: 'Codigo', accessor: 'code', sortable: true, width: '120px' },
  { header: 'Titulo', accessor: 'title', sortable: true },
  {
    header: 'Estado',
    accessor: 'status',
    sortable: true,
    cell: (row) => <StatusBadge status={row.status} />,
  },
  {
    header: 'Presupuesto',
    accessor: 'budget',
    sortable: true,
    align: 'right',
    cell: (row) => row.budget.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }),
  },
]

export default {
  title: 'UI/DataTable',
  component: DataTable,
  tags: ['autodocs'],
}

export const Default = {
  render: () => (
    <DataTable
      columns={columns}
      rows={rows}
      pageSize={2}
      actions={(
        <>
          <span className="text-sm font-medium text-text">Procesos recientes</span>
          <Button variant="secondary" size="sm">Exportar</Button>
        </>
      )}
    />
  ),
}

export const Empty = {
  render: () => (
    <DataTable
      columns={columns}
      rows={[]}
      emptyTitle="Sin procesos"
      emptyDescription="Todavia no hay procesos para los filtros seleccionados."
    />
  ),
}

export const Loading = {
  render: () => <DataTable columns={columns} rows={[]} loading />,
}
