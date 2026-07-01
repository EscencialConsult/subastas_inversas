import { Users } from 'lucide-react'
import { Spinner } from '../../../../components/ui/Spinner.jsx'
import { EmptyState } from '../../../../components/ui/EmptyState.jsx'

export function Paso7Invitaciones({ cargandoProveedores, proveedores, invitadosIds, manejarInvitacion }) {
  return (
    <div>
      <h2 className="wizard-card__title">Etapa 7: Invitar Proveedores Verificados</h2>
      <p className="wizard-card__sub">Elige los proveedores de la red oficial a los que deseas enviar la invitación de participación.</p>

      {cargandoProveedores ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : proveedores.length === 0 ? (
        <EmptyState icon={Users} title="Sin proveedores" description="No se encontraron proveedores activos y verificados en el directorio global." />
      ) : (
        <div className="overflow-x-auto w-full border border-border rounded-lg shadow-sm">
          <table className="tabla min-w-full">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>Invitar</th>
                <th>Razón Social</th>
                <th>CUIT</th>
                <th>Rubro</th>
              </tr>
            </thead>
            <tbody>
              {proveedores.map((p) => {
                const yaInvitado = invitadosIds.includes(p.id)
                return (
                  <tr key={p.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={yaInvitado}
                        disabled={yaInvitado}
                        onChange={(e) => manejarInvitacion(p.id, e.target.checked)}
                      />
                    </td>
                    <td>{p.razonSocial}</td>
                    <td><code>{p.cuit}</code></td>
                    <td>{p.rubro}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
