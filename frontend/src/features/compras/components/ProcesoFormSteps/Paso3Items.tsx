import { Package, X } from 'lucide-react'
import { Button } from '../../../../shared/ui/Button'
import { EmptyState } from '../../../../shared/ui/EmptyState'
import { Input } from '../../../../shared/ui/Input'

export function Paso3Items({ datos, agregarItem, actualizarItem, quitarItem }) {
  return (
    <div>
      <h2 className="wizard-card__title">Etapa 3: Items a adquirir</h2>
      <p className="wizard-card__sub">Detalla cada uno de los productos o servicios que forman parte de la solicitud.</p>

      {datos.items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Sin items"
          description="No has agregado items todavia."
          action={<Button type="button" onClick={agregarItem}>Agregar primer item</Button>}
        />
      ) : (
        <div>
          <div className="w-full overflow-x-auto">
            <div className="min-w-[600px]">
              <div className="mb-2 grid grid-cols-[2fr_1fr_1fr_1.2fr_40px] gap-3 border-b border-border px-2 pb-2 text-xs font-semibold text-text-muted">
                <span>Descripcion</span>
                <span>Cantidad</span>
                <span>Unidad</span>
                <span>Precio Unit. Est. (ARS)</span>
                <span></span>
              </div>

              <div className="grid gap-2">
                {datos.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-[2fr_1fr_1fr_1.2fr_40px] gap-3">
                    <Input
                      value={item.description}
                      onChange={(e) => actualizarItem(idx, 'description', e.target.value)}
                      placeholder="Lavandina concentrada 5L"
                    />
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => actualizarItem(idx, 'quantity', e.target.value)}
                    />
                    <Input
                      value={item.unit}
                      onChange={(e) => actualizarItem(idx, 'unit', e.target.value)}
                      placeholder="Bidon"
                    />
                    <Input
                      type="number"
                      min="0"
                      value={item.estimatedUnitPrice || ''}
                      onChange={(e) => actualizarItem(idx, 'estimatedUnitPrice', e.target.value)}
                      placeholder="Opcional"
                    />
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => quitarItem(idx)}
                      title="Quitar item"
                      aria-label="Quitar item"
                      icon={<X size={14} />}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button type="button" onClick={agregarItem}>
              Agregar item
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
