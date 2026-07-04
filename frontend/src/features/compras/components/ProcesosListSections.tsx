import { SearchX } from 'lucide-react'
import { ESTADO_INFO } from '../../../domain/compras'
import { Alert } from '../../../shared/ui/Alert'
import { Button } from '../../../shared/ui/Button'
import { Card } from '../../../shared/ui/Card'
import { EmptyState } from '../../../shared/ui/EmptyState'
import { Input } from '../../../shared/ui/Input'
import { Modal } from '../../../shared/ui/Modal'
import { Pagination } from '../../../shared/ui/Pagination'
import { Select } from '../../../shared/ui/Select'
import { Spinner } from '../../../shared/ui/Spinner'
import { Table } from '../../../shared/ui/Table'

export function ProcesosListHeader({ onCreate }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-text">Procesos de compra</h1>
        <p className="mt-1 text-sm text-text-muted">
          Gestiona borradores, publicaciones y subastas del tenant actual.
        </p>
      </div>
      <Button onClick={onCreate}>+ Nuevo proceso</Button>
    </div>
  )
}

export function ProcesosFilters({ busqueda, estado, onBusquedaChange, onEstadoChange }) {
  return (
    <Card hover={false} className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
      <Input
        label="Buscar"
        placeholder="Buscar por codigo o titulo..."
        value={busqueda}
        onChange={(e) => onBusquedaChange(e.target.value)}
      />
      <Select label="Estado" value={estado} onChange={(e) => onEstadoChange(e.target.value)}>
        <option value="">Todos los estados</option>
        {Object.entries(ESTADO_INFO).map(([clave, info]) => (
          <option key={clave} value={clave}>
            {info.label}
          </option>
        ))}
      </Select>
    </Card>
  )
}

export function ProcesosTableSection({
  error,
  cargando,
  procesos,
  pagination,
  columns,
}) {
  return (
    <>
      {error && <Alert variant="error">{error}</Alert>}

      {cargando ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : procesos.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="Sin resultados"
          description="No hay procesos de compra que coincidan con el filtro."
        />
      ) : (
        <div>
          <Table
            columns={columns}
            data={pagination.paginatedItems}
            sortable={false}
            emptyTitle="Sin resultados"
            emptyDescription="No hay procesos de compra que coincidan con el filtro."
          />
          <Pagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            totalItems={pagination.totalItems}
            totalPages={pagination.totalPages}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
          />
        </div>
      )}
    </>
  )
}

export function ConfigurarSubastaModal({
  proceso,
  open,
  loading,
  subastaEsFutura,
  values,
  onChange,
  onClose,
  onConfirm,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Configurar subasta inversa"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={loading} loading={loading}>
            {subastaEsFutura ? 'Programar subasta' : 'Iniciar subasta'}
          </Button>
        </>
      }
    >
      <p className="text-sm text-text-muted mb-4">
        Establece los parametros de la subasta para el proceso <strong>{proceso?.codigo}</strong>:
      </p>

      <div className="flex flex-col gap-4">
        <Input
          type="number"
          label="Precio base (ARS)"
          value={values.basePrice}
          onChange={(e) => onChange('basePrice', e.target.value)}
          placeholder="Ingrese el precio base"
          min="1"
          required
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            type="number"
            label="Decremento minimo (%)"
            value={values.minDecrement}
            onChange={(e) => onChange('minDecrement', e.target.value)}
            min="0"
            max="100"
            step="0.1"
            required
          />
          <Input
            type="number"
            label="Umbral PAB (ARS)"
            help="Ofertas bajo este monto seran marcadas como PAB."
            value={values.pabThreshold}
            onChange={(e) => onChange('pabThreshold', e.target.value)}
            placeholder="Umbral de precio anormalmente bajo"
            min="0"
          />
        </div>

        <Input
          type="datetime-local"
          label="Fecha y hora de inicio (local)"
          value={values.startsAt}
          onChange={(e) => onChange('startsAt', e.target.value)}
          required
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            type="number"
            label="Duracion (minutos)"
            value={values.duration}
            onChange={(e) => onChange('duration', e.target.value)}
            min="1"
            required
          />
          <Input
            type="number"
            label="Extension automatica (minutos)"
            help="Extiende la subasta si se oferta al final."
            value={values.extension}
            onChange={(e) => onChange('extension', e.target.value)}
            min="0"
            required
          />
        </div>
      </div>
    </Modal>
  )
}
