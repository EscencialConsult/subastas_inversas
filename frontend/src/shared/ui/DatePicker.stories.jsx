import { DatePicker } from './DatePicker'

export default {
  title: 'UI/DatePicker',
  component: DatePicker,
  tags: ['autodocs'],
  argTypes: {
    required: { control: 'boolean' },
    disabled: { control: 'boolean' },
    label: { control: 'text' },
    help: { control: 'text' },
    error: { control: 'text' },
  },
}

export const Default = {
  args: {
    label: 'Fecha de Publicación',
    placeholder: 'Elegir fecha...',
  },
}

export const WithValue = {
  args: {
    label: 'Fecha de Apertura de Ofertas',
    defaultValue: '2026-06-30',
  },
}

export const Disabled = {
  args: {
    label: 'Fecha de Adjudicación (Bloqueada)',
    disabled: true,
    defaultValue: '2026-07-15',
  },
}

export const WithHelp = {
  args: {
    label: 'Fecha de Cierre',
    help: 'La fecha límite en la que los proveedores pueden ofertar.',
    required: true,
  },
}

export const WithError = {
  args: {
    label: 'Fecha de Inicio',
    error: 'La fecha de inicio debe ser posterior a la fecha actual.',
    defaultValue: '2026-01-01',
  },
}
