import { FileSearch } from 'lucide-react'
import { Button } from './Button'
import { EmptyResults, ErrorState, LoadingState } from './StateViews'

export default {
  title: 'UI/StateViews',
  tags: ['autodocs'],
}

export const Loading = {
  render: () => <LoadingState label="Cargando procesos..." />,
}

export const Error = {
  render: () => (
    <ErrorState
      title="No pudimos cargar auditoria"
      message="Intentá nuevamente en unos minutos."
    />
  ),
}

export const Empty = {
  render: () => (
    <EmptyResults
      icon={FileSearch}
      title="Sin resultados"
      description="Ajustá los filtros para ampliar la busqueda."
      action={<Button variant="secondary">Limpiar filtros</Button>}
    />
  ),
}
