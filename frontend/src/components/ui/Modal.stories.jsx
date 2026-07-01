import { useState } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'

export default {
  title: 'UI/Modal',
  component: Modal,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
    },
    open: { control: 'boolean' },
  },
}

const Template = (args) => {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <div>
      <Button onClick={() => setIsOpen(true)}>Abrir Modal</Button>
      <Modal {...args} open={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  )
}

export const Interactive = Template.bind({})
Interactive.args = {
  title: 'Título del Modal',
  children: 'Este es el contenido del cuerpo del modal. Puedes presionar ESC o hacer clic fuera del modal para cerrarlo.',
  footer: (
    <>
      <Button variant="secondary">Cancelar</Button>
      <Button variant="primary">Confirmar</Button>
    </>
  ),
}
