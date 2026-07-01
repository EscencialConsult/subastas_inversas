import { Alert } from '../../../../components/ui/Alert'

export function Paso5Requisitos({ docRequisitos, setDocRequisitos }) {
  const toggleRequisito = (requisito, checked) => {
    if (checked) {
      setDocRequisitos([...docRequisitos, requisito])
    } else {
      setDocRequisitos(docRequisitos.filter(d => d !== requisito))
    }
  }

  return (
    <div>
      <h2 className="wizard-card__title">Etapa 5: Requisitos de Documentación de Proveedores</h2>
      <p className="wizard-card__sub">Indica qué credenciales y documentación deben tener al día los proveedores para participar.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: '16px 0' }}>
        <label className="campo campo--checkbox" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={docRequisitos.includes('CuitCertificate')}
            onChange={(e) => toggleRequisito('CuitCertificate', e.target.checked)}
          />
          <span>Constancia de CUIT (Obligatorio)</span>
        </label>

        <label className="campo campo--checkbox" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={docRequisitos.includes('TaxCertificate')}
            onChange={(e) => toggleRequisito('TaxCertificate', e.target.checked)}
          />
          <span>Certificado Fiscal (Inscripciones de impuestos)</span>
        </label>

        <label className="campo campo--checkbox" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={docRequisitos.includes('LegalDocument')}
            onChange={(e) => toggleRequisito('LegalDocument', e.target.checked)}
          />
          <span>Estatuto Social / Documentación Legal</span>
        </label>

        <label className="campo campo--checkbox" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={docRequisitos.includes('Other')}
            onChange={(e) => toggleRequisito('Other', e.target.checked)}
          />
          <span>Otros antecedentes comerciales</span>
        </label>
      </div>

      <Alert variant="info" className="mt-4">
        <strong>Regla de Habilitación de la Empresa:</strong>
        <p style={{ margin: '4px 0 0', fontSize: '13px' }}>
          El sistema exige la validación estricta de documentos globales de la Red de Proveedores antes de permitir ofertas en subastas.
        </p>
      </Alert>
    </div>
  )
}
