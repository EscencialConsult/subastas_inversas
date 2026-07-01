import { Input } from '../../../../components/ui/Input.jsx'
import { Textarea } from '../../../../components/ui/Textarea.jsx'

export function Paso1DatosBasicos({ register, datos, actualizarDatos, formErrors }) {
  return (
    <div>
      <h2 className="wizard-card__title">Etapa 1: Datos Básicos</h2>
      <p className="wizard-card__sub">Identifica el proceso con un título claro y la descripción del requerimiento.</p>
      
      <Input
        label="Titulo del Proceso"
        {...register('titulo')}
        value={datos.titulo}
        onChange={(e) => actualizarDatos('titulo', e.target.value)}
        placeholder="Compra de insumos de limpieza para delegaciones"
        error={formErrors.titulo?.message}
        required
      />

      <Textarea
        label="Descripcion Detallada"
        {...register('descripcion')}
        rows={5}
        value={datos.descripcion}
        onChange={(e) => actualizarDatos('descripcion', e.target.value)}
        placeholder="Se requiere el aprovisionamiento de lavandina, desinfectantes, trapos y bolsas..."
        error={formErrors.descripcion?.message}
        required
      />
    </div>
  )
}
