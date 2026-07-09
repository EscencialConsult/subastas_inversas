import { expect, fn, userEvent, within } from 'storybook/test'
import { ProcesoWizard } from './ProcesoWizard'

const baseFormState = {
  currentStep: 8,
  datos: {
    titulo: 'Compra de insumos críticos',
    descripcion: 'Reposición trimestral para dependencias operativas.',
    presupuestoEstimado: '1250000',
    items: [
      {
        description: 'Insumos de limpieza',
        quantity: 120,
        unit: 'caja',
        estimatedUnitPrice: 8500,
      },
    ],
  },
  form: {
    register: (name) => ({ name }),
    formState: { errors: {} },
  },
  modalidadSugerida: null,
  modalidades: [],
  criteriosEvaluacion: [
    { name: 'Cumplimiento técnico', type: 'Exclusionary' },
    { name: 'Precio', type: 'Weighted', weight: 70 },
  ],
  setCriteriosEvaluacion: fn(),
  docRequisitos: ['CuitCertificate', 'TaxCertificate'],
  setDocRequisitos: fn(),
  subastaConfig: { duracion: 20, decremento: 2 },
  setSubastaConfig: fn(),
  cargandoProveedores: false,
  proveedores: [],
  invitadosIds: ['proveedor-1'],
  guardando: false,
  actualizarDatos: fn(),
  agregarItem: fn(),
  actualizarItem: fn(),
  quitarItem: fn(),
  manejarInvitacion: fn(),
  modalidadActual: { name: 'Licitación privada' },
  irAlPaso: fn(),
  anterior: fn(),
  siguiente: fn(),
  publicar: fn(),
}

export default {
  title: 'Compras/ProcesoWizard',
  component: ProcesoWizard,
}

export const RevisionListaParaPublicar = {
  args: {
    formState: baseFormState,
    navigate: fn(),
    formatearPesos: (valor) =>
      new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        maximumFractionDigits: 0,
      }).format(valor),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByText(/Compra de insumos críticos/i)).toBeInTheDocument()
    await userEvent.click(canvas.getAllByRole('button', { name: /Editar/i })[0])
    await expect(args.formState.irAlPaso).toHaveBeenCalledWith(1)

    await userEvent.click(canvas.getByRole('button', { name: /Publicar Proceso/i }))

    const dialog = canvas.getByRole('dialog')
    await expect(dialog).toBeVisible()

    await userEvent.click(within(dialog).getByRole('button', { name: /Publicar/i }))
    await expect(args.formState.publicar).toHaveBeenCalled()
  },
}
