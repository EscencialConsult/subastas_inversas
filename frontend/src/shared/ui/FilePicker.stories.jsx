import { FilePicker } from './FilePicker'

export default {
  title: 'UI/FilePicker',
  component: FilePicker,
  tags: ['autodocs'],
  argTypes: {
    multiple: { control: 'boolean' },
    disabled: { control: 'boolean' },
    label: { control: 'text' },
    help: { control: 'text' },
    error: { control: 'text' },
    accept: { control: 'text' },
  },
}

export const Default = {
  args: {
    label: 'Pliego de Bases y Condiciones',
    help: 'Subir archivo en formato PDF (máx. 10MB)',
    accept: '.pdf',
  },
}

export const MultipleFiles = {
  args: {
    label: 'Documentos Adjuntos',
    multiple: true,
    help: 'Formatos aceptados: .pdf, .docx, .xlsx',
    accept: '.pdf,.docx,.xlsx',
  },
}

export const Disabled = {
  args: {
    label: 'Archivo Firmado (Solo lectura)',
    disabled: true,
    help: 'La subida de archivos está desactivada en este estado.',
  },
}

export const WithError = {
  args: {
    label: 'Acta de Apertura',
    error: 'El archivo excede el tamaño máximo permitido de 15MB.',
  },
}
