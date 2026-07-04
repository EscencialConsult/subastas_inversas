import { EmptyResults, LoadingState } from '../../../shared/ui/StateViews'
import type {
  ApprovalWorkflowDto,
  CircuitoDatos,
  ContractingModeDto,
  DocumentTemplateDto,
  ModalidadDatos,
  PlantillaDatos,
} from '../../../shared/api/configuracionApi'

export const ROLES_APROBACION = [
  { value: '1', label: 'Administrador' },
  { value: '4', label: 'Evaluador' },
  { value: '5', label: 'Auditor' },
  { value: '6', label: 'Autoridad' },
]

export const TIPOS_PLANTILLA = [
  { value: '0', label: 'Acta' },
  { value: '1', label: 'Contrato' },
  { value: '2', label: 'Orden de compra' },
]

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
  return (
    <>
      <form className="rounded-md border border-border bg-surface p-5 shadow-sm" onSubmit={onSubmit}>
        <h2 className="text-lg font-semibold text-text">
          {editandoId ? 'Editar modalidad' : 'Nueva modalidad'}
        </h2>

        <label className="campo">
          <span>Nombre</span>
          <input
            value={form.name}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder="Compra directa"
          />
        </label>

        <label className="campo">
          <span>Descripcion</span>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => onChange('description', e.target.value)}
            placeholder="Reglas generales de la modalidad"
          />
        </label>

        <label className="campo">
          <span>Monto minimo</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.minAmount}
            onChange={(e) => onChange('minAmount', e.target.value)}
          />
        </label>

        <label className="campo">
          <span>Monto maximo</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.maxAmount ?? ''}
            onChange={(e) => onChange('maxAmount', e.target.value)}
            placeholder="Sin tope"
          />
        </label>

        <label className="campo campo--checkbox">
          <input
            type="checkbox"
            checked={form.requiresAuction}
            onChange={(e) => onChange('requiresAuction', e.target.checked)}
          />
          <span>Requiere subasta</span>
        </label>

        <label className="campo campo--checkbox">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => onChange('active', e.target.checked)}
          />
          <span>Activa</span>
        </label>

        <div className="flex flex-wrap justify-end gap-2">
          {editandoId && (
            <button type="button" className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60" onClick={onCancel}>
              Cancelar
            </button>
          )}
          <button type="submit" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-60" disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>

      <div className="rounded-md border border-border bg-surface p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-text">Modalidades</h2>
        {cargando ? (
          <LoadingState label="Cargando modalidades..." />
        ) : modalidades.length === 0 ? (
          <EmptyResults title="Sin modalidades" description="No hay modalidades configuradas." />
        ) : (
          <table className="min-w-full divide-y divide-border text-sm">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Rango</th>
                <th>Subasta</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {modalidades.map((modalidad) => (
                <tr key={modalidad.id}>
                  <td>{modalidad.name}</td>
                  <td>{formatearRango(modalidad)}</td>
                  <td>{modalidad.requiresAuction ? 'Si' : 'No'}</td>
                  <td>
                    <span className={`badge ${modalidad.active ? 'badge--ok' : 'badge--off'}`}>
                      {modalidad.active ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td>
                    <button type="button" className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60" onClick={() => onEdit(modalidad)}>
                      Editar
                    </button>
                    {modalidad.id && (
                      <button type="button" className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60" onClick={() => onDelete(modalidad.id!)}>
                        Eliminar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

interface CircuitosSectionProps {
  circuitos: ApprovalWorkflowDto[]
  form: CircuitoDatos
  editandoId: string | null
  cargando: boolean
  guardando: boolean
  onSubmit: (event: React.FormEvent) => void
  onChange: (campo: keyof CircuitoDatos, valor: unknown) => void
  onLevelChange: (index: number, campo: string, valor: unknown) => void
  onAddLevel: () => void
  onRemoveLevel: (index: number) => void
  onEdit: (circuito: ApprovalWorkflowDto) => void
  onCancel: () => void
  onDelete: (id: string) => void
}

export function CircuitosSection({
  circuitos,
  form,
  editandoId,
  cargando,
  guardando,
  onSubmit,
  onChange,
  onLevelChange,
  onAddLevel,
  onRemoveLevel,
  onEdit,
  onCancel,
  onDelete,
}: CircuitosSectionProps) {
  return (
    <>
      <form className="rounded-md border border-border bg-surface p-5 shadow-sm" onSubmit={onSubmit}>
        <h2 className="text-lg font-semibold text-text">
          {editandoId ? 'Editar circuito' : 'Nuevo circuito de aprobacion'}
        </h2>

        <label className="campo">
          <span>Nombre</span>
          <input
            value={form.name}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder="Aprobacion de compras mayores"
          />
        </label>

        <label className="campo">
          <span>Monto minimo</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.minAmount ?? ''}
            onChange={(e) => onChange('minAmount', e.target.value)}
          />
        </label>

        <label className="campo">
          <span>Monto maximo</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.maxAmount ?? ''}
            onChange={(e) => onChange('maxAmount', e.target.value)}
            placeholder="Sin tope"
          />
        </label>

        <label className="campo campo--checkbox">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => onChange('active', e.target.checked)}
          />
          <span>Activo</span>
        </label>

        <h3 className="text-base font-semibold text-text">Niveles</h3>
        {form.levels.map((level, index) => (
          <div className="perfil__solo-lectura" key={index}>
            <span>Nivel {index + 1}</span>
            <label className="campo">
              <span>Rol</span>
              <select
                value={level.requiredRole}
                onChange={(e) => onLevelChange(index, 'requiredRole', e.target.value)}
              >
                {ROLES_APROBACION.map((role) => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            </label>
            <label className="campo">
              <span>Umbral</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={level.amountThreshold}
                onChange={(e) => onLevelChange(index, 'amountThreshold', e.target.value)}
              />
            </label>
            {form.levels.length > 1 && (
              <button type="button" className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60" onClick={() => onRemoveLevel(index)}>
                Quitar
              </button>
            )}
          </div>
        ))}

        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60" onClick={onAddLevel}>
            Agregar nivel
          </button>
          {editandoId && (
            <button type="button" className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60" onClick={onCancel}>
              Cancelar
            </button>
          )}
          <button type="submit" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-60" disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar circuito'}
          </button>
        </div>
      </form>

      <div className="rounded-md border border-border bg-surface p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-text">Circuitos de aprobacion</h2>
        {cargando ? (
          <LoadingState label="Cargando circuitos..." />
        ) : circuitos.length === 0 ? (
          <EmptyResults title="Sin circuitos" description="No hay circuitos configurados." />
        ) : (
          <table className="min-w-full divide-y divide-border text-sm">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Rango</th>
                <th>Niveles</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {circuitos.map((circuito) => (
                <tr key={circuito.id}>
                  <td>{circuito.name}</td>
                  <td>{formatearRango(circuito)}</td>
                  <td>{formatearNiveles(circuito.levels)}</td>
                  <td>
                    <span className={`badge ${circuito.active ? 'badge--ok' : 'badge--off'}`}>
                      {circuito.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <button type="button" className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60" onClick={() => onEdit(circuito)}>
                      Editar
                    </button>
                    {circuito.id && (
                      <button type="button" className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60" onClick={() => onDelete(circuito.id!)}>
                        Eliminar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
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
  return (
    <>
      <form className="rounded-md border border-border bg-surface p-5 shadow-sm" onSubmit={onSubmit}>
        <h2 className="text-lg font-semibold text-text">Nueva version de plantilla</h2>

        <label className="campo">
          <span>Tipo</span>
          <select
            value={form.type}
            onChange={(e) => {
              onChange('type', e.target.value)
              onLoadActive(e.target.value)
            }}
          >
            {TIPOS_PLANTILLA.map((tipo) => (
              <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
            ))}
          </select>
        </label>

        <label className="campo">
          <span>Nombre</span>
          <input
            value={form.name}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder="Contrato estandar"
          />
        </label>

        <label className="campo">
          <span>Contenido</span>
          <textarea
            rows={8}
            value={form.content}
            onChange={(e) => onChange('content', e.target.value)}
            placeholder="Texto de plantilla con placeholders como {{process.code}}"
          />
        </label>

        <label className="campo campo--checkbox">
          <input
            type="checkbox"
            checked={form.activate}
            onChange={(e) => onChange('activate', e.target.checked)}
          />
          <span>Activar esta version</span>
        </label>

        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60" onClick={() => onLoadActive(form.type)}>
            Usar version activa
          </button>
          <button type="submit" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-60" disabled={guardando}>
            {guardando ? 'Guardando...' : 'Crear version'}
          </button>
        </div>
      </form>

      <div className="rounded-md border border-border bg-surface p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-text">Plantillas de documentos</h2>
        {cargando ? (
          <LoadingState label="Cargando plantillas..." />
        ) : plantillas.length === 0 ? (
          <EmptyResults title="Sin plantillas" description="No hay plantillas configuradas." />
        ) : (
          <table className="min-w-full divide-y divide-border text-sm">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Nombre</th>
                <th>Version</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {plantillas.map((plantilla) => (
                <tr key={plantilla.id}>
                  <td>{etiquetaTipoPlantilla(plantilla.type)}</td>
                  <td>{plantilla.name}</td>
                  <td>v{plantilla.version}</td>
                  <td>
                    <span className={`badge ${plantilla.active ? 'badge--ok' : 'badge--off'}`}>
                      {plantilla.active ? 'Activa' : 'Historica'}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60"
                      onClick={() => onSetForm({
                        type: String(plantilla.type),
                        name: plantilla.name ?? '',
                        content: plantilla.content ?? '',
                        activate: true,
                      })}
                    >
                      Nueva version
                    </button>
                    {!plantilla.active && plantilla.id && (
                      <button type="button" className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60" onClick={() => onActivate(plantilla.id!)}>
                        Activar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

export function etiquetaTipoPlantilla(type: unknown) {
  const match = TIPOS_PLANTILLA.find((item) => Number(item.value) === Number(type))
  return match?.label ?? 'Acta'
}

function formatearRango(modalidad: { minAmount?: number; maxAmount?: number | null }) {
  const min = formatearPesos(modalidad.minAmount ?? 0)
  if (modalidad.maxAmount == null) return `Desde ${min}`
  return `${min} a ${formatearPesos(modalidad.maxAmount)}`
}

function formatearPesos(monto: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(monto)
}

function formatearNiveles(levels: Array<{ levelOrder?: number; requiredRole?: unknown; amountThreshold?: number }> = []) {
  return [...levels]
    .sort((a, b) => (a.levelOrder ?? 0) - (b.levelOrder ?? 0))
    .map((level) => `N${level.levelOrder ?? 0}: ${etiquetaRol(level.requiredRole)} desde ${formatearPesos(level.amountThreshold ?? 0)}`)
    .join(' / ')
}

function etiquetaRol(role: unknown) {
  const match = ROLES_APROBACION.find((item) => Number(item.value) === Number(role))
  return match?.label ?? 'Autoridad'
}
