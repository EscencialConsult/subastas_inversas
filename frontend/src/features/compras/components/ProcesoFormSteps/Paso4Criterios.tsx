import { X } from 'lucide-react'
import { Alert } from '../../../../shared/ui/Alert'
import { Button } from '../../../../shared/ui/Button'
import { Input } from '../../../../shared/ui/Input'

export function Paso4Criterios({ criteriosEvaluacion, setCriteriosEvaluacion }) {
  const excluyentes = criteriosEvaluacion.filter((criterio) => criterio.type === 'Exclusionary')
  const ponderados = criteriosEvaluacion.filter((criterio) => criterio.type === 'Weighted')
  const weightSum = ponderados.reduce((suma, criterio) => suma + (Number(criterio.weight) || 0), 0)

  function actualizarCriterio(index, field, value) {
    const next = [...criteriosEvaluacion]
    next[index] = { ...next[index], [field]: value }
    setCriteriosEvaluacion(next)
  }

  function quitarCriterio(index) {
    setCriteriosEvaluacion((prev) => prev.filter((_, itemIndex) => itemIndex !== index))
  }

  return (
    <div>
      <h2 className="wizard-card__title">Etapa 4: Criterios de evaluacion</h2>
      <p className="wizard-card__sub">
        Define criterios para evaluar objetivamente a los proveedores. Los excluyentes filtran postores; los ponderados se puntuan 0-100% con un peso asignado.
      </p>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="m-0 text-base font-semibold text-text">Criterios excluyentes</h3>
            <p className="m-0 mt-1 text-sm text-text-muted">Condiciones que un proveedor debe cumplir para participar.</p>
          </div>
          <Button
            type="button"
            onClick={() => {
              setCriteriosEvaluacion((prev) => [...prev, { id: null, name: '', description: '', type: 'Exclusionary', weight: 0 }])
            }}
          >
            Agregar criterio
          </Button>
        </div>

        {excluyentes.length === 0 ? (
          <p className="rounded-md border border-border bg-background px-3 py-2 text-sm text-text-muted">
            No hay criterios excluyentes definidos.
          </p>
        ) : (
          <div className="w-full overflow-x-auto">
            <div className="grid min-w-[520px] gap-2">
              {excluyentes.map((criterio) => {
                const realIdx = criteriosEvaluacion.indexOf(criterio)
                return (
                  <div key={realIdx} className="grid grid-cols-[2fr_3fr_40px] gap-3">
                    <Input
                      value={criterio.name}
                      onChange={(event) => actualizarCriterio(realIdx, 'name', event.target.value)}
                      placeholder="Nombre del criterio"
                    />
                    <Input
                      value={criterio.description || ''}
                      onChange={(event) => actualizarCriterio(realIdx, 'description', event.target.value)}
                      placeholder="Descripcion opcional"
                    />
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => quitarCriterio(realIdx)}
                      aria-label="Quitar criterio excluyente"
                      icon={<X size={14} />}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </section>

      <section className="mt-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="m-0 text-base font-semibold text-text">Criterios ponderados</h3>
            <p className="m-0 mt-1 text-sm text-text-muted">Criterios con peso porcentual para ranking tecnico/economico.</p>
          </div>
          <Button
            type="button"
            onClick={() => {
              setCriteriosEvaluacion((prev) => [...prev, { id: null, name: '', description: '', type: 'Weighted', weight: 0 }])
            }}
          >
            Agregar criterio
          </Button>
        </div>

        {ponderados.length === 0 ? (
          <p className="rounded-md border border-border bg-background px-3 py-2 text-sm text-text-muted">
            No hay criterios ponderados definidos.
          </p>
        ) : (
          <div className="w-full overflow-x-auto">
            <div className="min-w-[620px]">
              <div className="mb-2 grid grid-cols-[2fr_3fr_80px_40px] gap-3 border-b border-border px-2 pb-2 text-xs font-semibold text-text-muted">
                <span>Nombre</span>
                <span>Descripcion</span>
                <span>Peso %</span>
                <span></span>
              </div>
              <div className="grid gap-2">
                {ponderados.map((criterio) => {
                  const realIdx = criteriosEvaluacion.indexOf(criterio)
                  return (
                    <div key={realIdx} className="grid grid-cols-[2fr_3fr_80px_40px] gap-3">
                      <Input
                        value={criterio.name}
                        onChange={(event) => actualizarCriterio(realIdx, 'name', event.target.value)}
                        placeholder="Nombre del criterio"
                      />
                      <Input
                        value={criterio.description || ''}
                        onChange={(event) => actualizarCriterio(realIdx, 'description', event.target.value)}
                        placeholder="Descripcion opcional"
                      />
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={criterio.weight}
                        onChange={(event) => actualizarCriterio(realIdx, 'weight', event.target.value)}
                      />
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => quitarCriterio(realIdx)}
                        aria-label="Quitar criterio ponderado"
                        icon={<X size={14} />}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {ponderados.length > 0 && weightSum !== 100 && (
          <Alert variant="warning">La suma de pesos debe ser 100% (actual: {weightSum}%).</Alert>
        )}
      </section>
    </div>
  )
}
