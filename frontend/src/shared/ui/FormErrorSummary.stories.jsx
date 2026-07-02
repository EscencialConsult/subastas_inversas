import { FormErrorSummary } from './FormErrorSummary'

export default {
  title: 'UI/FormErrorSummary',
  component: FormErrorSummary,
  tags: ['autodocs'],
}

export const Default = {
  args: {
    errors: [
      { field: 'Titulo', message: 'El titulo es obligatorio.' },
      { field: 'Presupuesto', message: 'Debe ingresar un monto valido.' },
      'Debe invitar al menos un proveedor.',
    ],
  },
}
