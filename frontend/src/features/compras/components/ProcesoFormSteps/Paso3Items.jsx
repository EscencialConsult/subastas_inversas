import { Package, X } from 'lucide-react'
import { EmptyState } from '../../../../shared/ui/EmptyState.jsx'
import { Input } from '../../../../shared/ui/Input.jsx'

export function Paso3Items({ datos, agregarItem, actualizarItem, quitarItem }) {
  return (
    <div>
      <h2 className="wizard-card__title">Etapa 3: Ítems a Adquirir</h2>
      <p className="wizard-card__sub">Detalla cada uno de los productos o servicios que forman parte de la solicitud.</p>

      {datos.items.length === 0 ? (
        <EmptyState 
          icon={Package} 
          title="Sin ítems" 
          description="No has agregado ítems todavía."
          action={<button type="button" className="btn btn--primario" onClick={agregarItem}>+ Agregar primer ítem</button>}
        />
      ) : (
        <div>
          <div className="overflow-x-auto w-full">
            <div className="min-w-[600px]">
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.2fr 40px', gap: '12px', padding: '0 8px 8px', borderBottom: '1px solid var(--color-borde)', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Descripción</span>
                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Cantidad</span>
                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Unidad</span>
                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Precio Unit. Est. (ARS)</span>
                <span></span>
              </div>

              {datos.items.map((item, idx) => (
                <div key={idx} className="wizard-item-row">
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
                    placeholder="Bidón"
                  />
                  <Input
                    type="number"
                    min="0"
                    value={item.estimatedUnitPrice || ''}
                    onChange={(e) => actualizarItem(idx, 'estimatedUnitPrice', e.target.value)}
                    placeholder="Opcional"
                  />
                  <button
                    type="button"
                    className="btn btn--texto btn--texto-peligro"
                    onClick={() => quitarItem(idx)}
                    title="Quitar ítem"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="wizard-table-actions">
            <button type="button" className="btn btn--primario" onClick={agregarItem}>
              + Agregar ítem
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
