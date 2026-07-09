import { Alert } from '../../../../shared/ui/Alert'
import { Checkbox } from '../../../../shared/ui/Checkbox'

const REQUISITOS = [
  { id: 'CuitCertificate', label: 'Constancia de CUIT (obligatorio)' },
  { id: 'TaxCertificate', label: 'Certificado fiscal (inscripciones de impuestos)' },
  { id: 'LegalDocument', label: 'Estatuto social / documentacion legal' },
  { id: 'Other', label: 'Otros antecedentes comerciales' },
]

export function Paso5Requisitos({ docRequisitos, setDocRequisitos }) {
  const toggleRequisito = (requisito, checked) => {
    if (checked) {
      setDocRequisitos([...docRequisitos, requisito])
    } else {
      setDocRequisitos(docRequisitos.filter((documento) => documento !== requisito))
    }
  }

  return (
    <div>
      <h2 className="wizard-card__title">Etapa 5: Requisitos de documentacion de proveedores</h2>
      <p className="wizard-card__sub">
        Indica que credenciales y documentacion deben tener al dia los proveedores para participar.
      </p>

      <div className="my-4 grid gap-3">
        {REQUISITOS.map((requisito) => (
          <Checkbox
            key={requisito.id}
            label={requisito.label}
            checked={docRequisitos.includes(requisito.id)}
            onChange={(event) => toggleRequisito(requisito.id, event.target.checked)}
            className="mb-0 rounded-md border border-border bg-surface px-3 py-2"
          />
        ))}
      </div>

      <Alert variant="info" className="mt-4">
        <strong>Regla de habilitacion de la empresa:</strong>
        <p className="m-0 mt-1 text-sm">
          El sistema exige la validacion estricta de documentos globales de la Red de Proveedores antes de permitir ofertas en subastas.
        </p>
      </Alert>
    </div>
  )
}
