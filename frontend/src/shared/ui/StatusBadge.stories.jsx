import { StatusBadge } from './StatusBadge'

export default {
  title: 'UI/StatusBadge',
  component: StatusBadge,
  tags: ['autodocs'],
}

export const Variants = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <StatusBadge status="draft" label="Borrador" />
      <StatusBadge status="published" label="Publicado" />
      <StatusBadge status="pending" label="Pendiente" />
      <StatusBadge status="approved" label="Aprobado" />
      <StatusBadge status="rejected" label="Rechazado" />
      <StatusBadge status="closed" label="Cerrado" />
    </div>
  ),
}
