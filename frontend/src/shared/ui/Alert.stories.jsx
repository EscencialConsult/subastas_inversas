import { Alert } from './Alert'

export default {
  title: 'UI/Alert',
  component: Alert,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['info', 'success', 'warning', 'error'],
    },
    dismissible: { control: 'boolean' },
    title: { control: 'text' },
  },
}

export const Info = {
  args: {
    variant: 'info',
    title: 'Información',
    children: 'Este es un mensaje informativo para el usuario.',
  },
}

export const Success = {
  args: {
    variant: 'success',
    title: 'Operación Exitosa',
    children: 'Los datos se guardaron correctamente en el sistema.',
  },
}

export const Warning = {
  args: {
    variant: 'warning',
    title: 'Advertencia',
    children: 'Por favor, revise los campos antes de confirmar el envío.',
  },
}

export const Error = {
  args: {
    variant: 'error',
    title: 'Error Crítico',
    children: 'No se pudo establecer conexión con el servidor. Intente nuevamente.',
  },
}

export const Dismissible = {
  args: {
    variant: 'info',
    title: 'Cerrable',
    dismissible: true,
    children: 'Puedes hacer clic en el botón X de la derecha para ocultarme.',
  },
}
