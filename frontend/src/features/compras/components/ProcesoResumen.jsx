export function ProcesoResumen({ proceso, datos, modalidadActual, formatearPesos }) {
  return (
    <>
      {proceso && (
        <div className="perfil__solo-lectura" style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span>Codigo del Proceso: <strong>{proceso.codigo}</strong></span>
          <span>Fecha de Creacion: {proceso.creadoEn}</span>
          <span>Estado: <strong style={{ color: 'var(--color-primario)' }}>{proceso.estado}</strong></span>
          {proceso.specificationsHash && (
            <span>Hash de Especificaciones: <code>{proceso.specificationsHash}</code></span>
          )}
        </div>
      )}

      <div className="wizard-summary-section">
        <h3 className="wizard-summary-section__title">Informacion General</h3>
        <div className="wizard-summary-section__content">
          <p><strong>Titulo:</strong> {datos.titulo}</p>
          <p style={{ whiteSpace: 'pre-wrap' }}><strong>Descripcion:</strong> {datos.descripcion}</p>
        </div>
      </div>

      <div className="wizard-summary-section">
        <h3 className="wizard-summary-section__title">Presupuesto y Modalidad</h3>
        <div className="wizard-summary-section__content">
          <p><strong>Presupuesto Estimado:</strong> {formatearPesos(Number(datos.presupuestoEstimado))}</p>
          <p><strong>Modalidad:</strong> {modalidadActual?.name ?? 'No especificada'}</p>
        </div>
      </div>

      <div className="wizard-summary-section">
        <h3 className="wizard-summary-section__title">Items Adquiridos ({datos.items.length})</h3>
        <div className="wizard-summary-section__content">
          <div className="overflow-x-auto w-full border border-border rounded-lg shadow-sm">
            <table className="tabla min-w-full">
              <thead>
                <tr>
                  <th>Descripcion</th>
                  <th>Cantidad</th>
                  <th>Unidad</th>
                  <th>Precio Unitario Est.</th>
                </tr>
              </thead>
              <tbody>
                {datos.items.map((item, idx) => (
                  <tr key={`${item.description}:${idx}`}>
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
    </>
  )
}
