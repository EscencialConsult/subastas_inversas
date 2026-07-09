import { Alert } from '../../../../shared/ui/Alert'
import { Button } from '../../../../shared/ui/Button'
import { Table } from '../../../../shared/ui/Table'

interface CriterioEvaluacionForm {
  id?: string | null
  name: string
  description: string
  type: string
  weight: number | string
  sortOrder?: number
}

interface ProcesoFormItem {
  id?: string
  description: string
  quantity: number | string
  unit?: string
  estimatedUnitPrice?: number | string | null
}

interface ProcesoFormData {
  titulo: string
  descripcion: string
  presupuestoEstimado: string
  modalidadContratacionId: string
  items: ProcesoFormItem[]
}

interface ModalidadInfo {
  id?: string
  name?: string
}

interface SubastaConfig {
  duracion: number
  decremento: number
}

interface Paso8RevisionProps {
  datos: ProcesoFormData
  modalidadActual: ModalidadInfo | undefined
  formatearPesos: (monto: number) => string
  criteriosEvaluacion: CriterioEvaluacionForm[]
  docRequisitos: string[]
  subastaConfig: SubastaConfig
  invitadosIds: string[]
  irAlPaso: (step: number) => void
}

export function Paso8Revision({
  datos,
  modalidadActual,
  formatearPesos,
  criteriosEvaluacion,
  docRequisitos,
  subastaConfig,
  invitadosIds,
  irAlPaso,
}: Paso8RevisionProps) {
  const excluyentes = criteriosEvaluacion.filter((criterio) => criterio.type === 'Exclusionary')
  const ponderados = criteriosEvaluacion.filter((criterio) => criterio.type === 'Weighted')
  const itemRows = datos.items.map((item, index) => ({ ...item, id: index }))

  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold text-text">Etapa 8: Revisión y confirmación del proceso</h2>
      <p className="mb-6 text-sm text-text-muted">
        Verifica toda la información recopilada del asistente antes de guardar o publicar en cartelera.
      </p>

      <SummarySection title="Información general" step={1} irAlPaso={irAlPaso}>
        <p><strong>Título:</strong> {datos.titulo}</p>
        <p className="whitespace-pre-wrap"><strong>Descripción:</strong> {datos.descripcion}</p>
      </SummarySection>

      <SummarySection title="Presupuesto y modalidad" step={2} irAlPaso={irAlPaso}>
        <p><strong>Presupuesto estimado:</strong> {formatearPesos(Number(datos.presupuestoEstimado))}</p>
        <p><strong>Modalidad seleccionada:</strong> {modalidadActual?.name ?? 'No especificada'}</p>
      </SummarySection>

      <SummarySection title={`Items adquiridos (${datos.items.length})`} step={3} irAlPaso={irAlPaso}>
        <Table
          data={itemRows}
          sortable={false}
          columns={[
            { header: 'Descripción', accessor: 'description' },
            { header: 'Cantidad', accessor: 'quantity' },
            { header: 'Unidad', accessor: 'unit' },
            {
              header: 'Precio unitario est.',
              accessor: 'estimatedUnitPrice',
              render: (value) => value ? formatearPesos(Number(value)) : '---',
            },
          ]}
        />
      </SummarySection>

      <SummarySection title="Criterios de evaluación" step={4} irAlPaso={irAlPaso}>
        {criteriosEvaluacion.length === 0 ? (
          <Alert variant="error">Sin criterios definidos. Debes definir al menos uno.</Alert>
        ) : (
          <div className="space-y-2">
            {excluyentes.length > 0 && (
              <p><strong>Excluyentes:</strong> {excluyentes.map((criterio) => criterio.name).join(', ')}</p>
            )}
            {ponderados.length > 0 && (
              <p><strong>Ponderados:</strong> {ponderados.map((criterio) => `${criterio.name} (${criterio.weight}%)`).join(', ')}</p>
            )}
          </div>
        )}
      </SummarySection>

      <SummarySection title="Requisitos de documentación" step={5} irAlPaso={irAlPaso}>
        <p>
          <strong>Tipos exigidos:</strong>{' '}
          {docRequisitos.length === 0 ? 'Ninguno seleccionado' : docRequisitos.map(etiquetaDocumento).join(', ')}
        </p>
      </SummarySection>

      <SummarySection title="Configuración de la subasta" step={6} irAlPaso={irAlPaso}>
        <p><strong>Precio base:</strong> {formatearPesos(Number(datos.presupuestoEstimado))}</p>
        <p><strong>Duración de subasta:</strong> {subastaConfig.duracion} minutos</p>
        <p><strong>Decremento mínimo:</strong> {subastaConfig.decremento}%</p>
      </SummarySection>

      <SummarySection title={`Proveedores invitados (${invitadosIds.length})`} step={7} irAlPaso={irAlPaso}>
        {invitadosIds.length === 0 ? (
          <Alert variant="error">Sin proveedores invitados. Debes elegir al menos uno.</Alert>
        ) : (
          <p>Total de proveedores de la red seleccionados: {invitadosIds.length}</p>
        )}
      </SummarySection>
    </div>
  )
}

function SummarySection({
  title,
  step,
  irAlPaso,
  children,
}: {
  title: string
  step: number
  irAlPaso: (step: number) => void
  children: React.ReactNode
}) {
  return (
    <section className="mb-4 rounded-md border border-border bg-surface p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <h3 className="m-0 text-base font-semibold text-text">{title}</h3>
        <Button type="button" variant="secondary" size="sm" onClick={() => irAlPaso(step)}>
          Editar
        </Button>
      </div>
      <div className="space-y-2 text-sm text-text">{children}</div>
    </section>
  )
}

function etiquetaDocumento(documento: string) {
  if (documento === 'CuitCertificate') return 'Constancia de CUIT'
  if (documento === 'TaxCertificate') return 'Certificado fiscal'
  if (documento === 'LegalDocument') return 'Estatuto legal'
  return 'Otro'
}
