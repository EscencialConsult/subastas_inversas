import { useState } from 'react'
import { Button } from './Button'
import { ConfirmDialog } from './ConfirmDialog'

export default {
  title: 'UI/ConfirmDialog',
  component: ConfirmDialog,
  tags: ['autodocs'],
}

export const Danger = {
  render: () => {
    const [open, setOpen] = useState(true)
    return (
      <>
        <Button variant="danger" onClick={() => setOpen(true)}>Abrir confirmacion</Button>
        <ConfirmDialog
          open={open}
          title="Eliminar registro"
          description="Esta accion no se puede deshacer. El registro dejara de estar disponible para los usuarios."
          confirmLabel="Eliminar"
          onCancel={() => setOpen(false)}
          onConfirm={() => setOpen(false)}
        />
      </>
    )
  },
}
