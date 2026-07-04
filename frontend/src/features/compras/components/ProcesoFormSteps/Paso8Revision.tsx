export function Paso8Revision({
  datos,
  modalidadActual,
  formatearPesos,
  criteriosEvaluacion,
  docRequisitos,
  subastaConfig,
  invitadosIds,
  irAlPaso,
}) {
  const excluyentes = criteriosEvaluacion.filter(c => c.type === 'Exclusionary')
  const ponderados = criteriosEvaluacion.filter(c => c.type === 'Weighted')

  return (
    <div>
      <h2 className="wizard-card__title">Etapa 8: Revisión y Confirmación del Proceso</h2>
      <p className="wizard-card__sub">Verifica toda la información recopilada del asistente antes de guardar o publicar en cartelera.</p>

      <div className="wizard-summary-section">
        <h3 className="wizard-summary-section__title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Información General</span>
          <button type="button" className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60" onClick={() => irAlPaso(1)}>Editar</button>
        </h3>
        <div className="wizard-summary-section__content">
          <p><strong>Título:</strong> {datos.titulo}</p>
          <p style={{ whiteSpace: 'pre-wrap' }}><strong>Descripción:</strong> {datos.descripcion}</p>
        </div>
      </div>

      <div className="wizard-summary-section">
        <h3 className="wizard-summary-section__title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Presupuesto y Modalidad</span>
          <button type="button" className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60" onClick={() => irAlPaso(2)}>Editar</button>
        </h3>
        <div className="wizard-summary-section__content">
          <p><strong>Presupuesto Estimado:</strong> {formatearPesos(Number(datos.presupuestoEstimado))}</p>
          <p><strong>Modalidad Seleccionada:</strong> {modalidadActual?.name ?? 'No especificada'}</p>
        </div>
      </div>

      <div className="wizard-summary-section">
        <h3 className="wizard-summary-section__title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Ítems Adquiridos ({datos.items.length})</span>
          <button type="button" className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60" onClick={() => irAlPaso(3)}>Editar</button>
        </h3>
        <div className="wizard-summary-section__content">
          <div className="overflow-x-auto w-full border border-border rounded-lg shadow-sm">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead>
                <tr>
                  <th>Descripción</th>
                  <th>Cantidad</th>
                  <th>Unidad</th>
                  <th>Precio Unitario Est.</th>
                </tr>
              </thead>
              <tbody>
                {datos.items.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.description}</td>
                    <td>{item.quantity}</td>
                    <td>{item.unit}</td>
                    <td>{item.estimatedUnitPrice ? formatearPesos(Number(item.estimatedUnitPrice)) : '---'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="wizard-summary-section">
        <h3 className="wizard-summary-section__title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Criterios de Evaluación</span>
          <button type="button" className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60" onClick={() => irAlPaso(4)}>Editar</button>
        </h3>
        <div className="wizard-summary-section__content">
          {criteriosEvaluacion.length === 0 ? (
            <p style={{ color: 'var(--color-error-tx)' }}>Sin criterios definidos. Debes definir al menos uno.</p>
          ) : (
            <div>
              {excluyentes.length > 0 && (
                <p><strong>Excluyentes:</strong> {excluyentes.map(c => c.name).join(', ')}</p>
              )}
              {ponderados.length > 0 && (
                <p><strong>Ponderados:</strong> {ponderados.map(c => `${c.name} (${c.weight}%)`).join(', ')}</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="wizard-summary-section">
        <h3 className="wizard-summary-section__title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Requisitos de Documentación</span>
          <button type="button" className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60" onClick={() => irAlPaso(5)}>Editar</button>
        </h3>
        <div className="wizard-summary-section__content">
          <p>
            <strong>Tipos exigidos:</strong> {docRequisitos.length === 0 ? 'Ninguno seleccionado' : docRequisitos.map(d => {
              if (d === 'CuitCertificate') return 'Constancia de CUIT'
              if (d === 'TaxCertificate') return 'Certificado Fiscal'
              if (d === 'LegalDocument') return 'Estatuto Legal'
              return 'Otro'
            }).join(', ')}
          </p>
        </div>
      </div>

      <div className="wizard-summary-section">
        <h3 className="wizard-summary-section__title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Configuración de la Subasta</span>
          <button type="button" className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60" onClick={() => irAlPaso(6)}>Editar</button>
        </h3>
        <div className="wizard-summary-section__content">
          <p><strong>Precio Base:</strong> {formatearPesos(Number(datos.presupuestoEstimado))}</p>
          <p><strong>Duración de Subasta:</strong> {subastaConfig.duracion} minutos</p>
          <p><strong>Decremento Mínimo:</strong> {subastaConfig.decremento}%</p>
        </div>
      </div>

      <div className="wizard-summary-section">
        <h3 className="wizard-summary-section__title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Proveedores Invitados ({invitadosIds.length})</span>
          <button type="button" className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60" onClick={() => irAlPaso(7)}>Editar</button>
        </h3>
        <div className="wizard-summary-section__content">
          {invitadosIds.length === 0 ? (
            <p style={{ color: 'var(--color-error-tx)' }}>Sin proveedores invitados. Debes elegir al menos uno.</p>
          ) : (
            <p>Total de proveedores de la red seleccionados: {invitadosIds.length}</p>
          )}
        </div>
      </div>
    </div>
  )
}
