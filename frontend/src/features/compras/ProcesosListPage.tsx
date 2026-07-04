// Listado de procesos de compra del tenant. Entrada principal del comprador.

import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { useToast } from '../../context/ToastContext'
import {
  ESTADO_PROCESO,
  etiquetaEstado,
  claseEstado,
  esEditable,
} from '../../domain/compras'
import { Badge } from '../../shared/ui/Badge'
import { Button } from '../../shared/ui/Button'
import { usePagination } from '../../shared/ui/Pagination'
import {
  ConfigurarSubastaModal,
  ProcesosFilters,
  ProcesosListHeader,
  ProcesosTableSection,
} from './components/ProcesosListSections'
import { useProcesos } from './hooks/useProcesos'
import { iniciarSubastaProcesoMutation, procesosKeys } from './data/procesosData'
import { subastaKeys } from '../subasta/data/subastaData'
import { getErrorMessage } from '../../shared/query/queryClient'

export function ProcesosListPage() {
  const { tenantId } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()

  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState('')
  const { procesos, cargando, error, setError, publicar } = useProcesos({ tenantId, busqueda, estado })
  const procesosPagination = usePagination(procesos, { initialPageSize: 10 })

  const [procesoParaConfigurar, setProcesoParaConfigurar] = useState(null)
  const [basePrice, setBasePrice] = useState('')
  const [minDecrement, setMinDecrement] = useState('1')
  const [startsAt, setStartsAt] = useState('')
  const [duration, setDuration] = useState('10')
  const [extension, setExtension] = useState('3')
  const [pabThreshold, setPabThreshold] = useState('')
  const [ahoraMs, setAhoraMs] = useState(() => Date.now())

  const iniciarSubastaMutation = useMutation({
    mutationFn: iniciarSubastaProcesoMutation,
    onSuccess: async (_subasta, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: procesosKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: procesosKeys.detail(variables.tenantId, variables.procesoId) }),
        queryClient.invalidateQueries({ queryKey: subastaKeys.proceso(variables.tenantId, variables.procesoId) }),
      ])
    },
  })

  useEffect(() => {
    if (!procesoParaConfigurar) return undefined
    const intervalo = setInterval(() => setAhoraMs(Date.now()), 1000)
    return () => clearInterval(intervalo)
  }, [procesoParaConfigurar])

  async function publicarProcesoSeleccionado(proceso) {
    try {
      await publicar(proceso.id)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  function abrirConfiguracion(proceso) {
    setProcesoParaConfigurar(proceso)
    setBasePrice(proceso.presupuestoEstimado || '')
    setMinDecrement('1')
    setAhoraMs(Date.now())

    const localNow = new Date()
    localNow.setMinutes(localNow.getMinutes() - localNow.getTimezoneOffset())
    setStartsAt(localNow.toISOString().slice(0, 16))

    setDuration('10')
    setExtension('3')
    setPabThreshold(proceso.presupuestoEstimado ? Math.round(proceso.presupuestoEstimado * 0.7).toString() : '')
  }

  async function handleConfirmarInicio() {
    if (!basePrice || Number(basePrice) <= 0) {
      toast.error('El precio base debe ser mayor a cero.')
      return
    }
    if (Number(minDecrement) < 0 || Number(minDecrement) > 100) {
      toast.error('El decremento debe estar entre 0 y 100.')
      return
    }
    if (Number(duration) <= 0) {
      toast.error('La duracion debe ser mayor a cero.')
      return
    }
    if (Number(extension) < 0) {
      toast.error('La extension no puede ser negativa.')
      return
    }
    if (Number(pabThreshold) < 0) {
      toast.error('El umbral PAB no puede ser negativo.')
      return
    }

    try {
      const startsAtDate = new Date(startsAt)
      await iniciarSubastaMutation.mutateAsync({
        tenantId,
        procesoId: procesoParaConfigurar.id,
        basePrice,
        minimumDecrementPercentage: minDecrement,
        startsAtUtc: startsAtDate.toISOString(),
        durationMinutes: duration,
        autoExtensionMinutes: extension,
        pabThreshold,
      })
      setProcesoParaConfigurar(null)
      navigate(`/subasta/${procesoParaConfigurar.id}`)
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  const subastaEsFutura = startsAt ? new Date(startsAt).getTime() > ahoraMs : false
  const valoresSubasta = { basePrice, minDecrement, startsAt, duration, extension, pabThreshold }
  function actualizarValorSubasta(campo, valor) {
    const setters = {
      basePrice: setBasePrice,
      minDecrement: setMinDecrement,
      startsAt: setStartsAt,
      duration: setDuration,
      extension: setExtension,
      pabThreshold: setPabThreshold,
    }
    setters[campo]?.(valor)
  }

  const columnasProcesos = [
    {
      header: 'Codigo',
      accessor: 'codigo',
      render: (codigo) => <code className="text-mono text-xs text-primary font-semibold">{codigo}</code>,
    },
    {
      header: 'Titulo',
      accessor: 'titulo',
    },
    {
      header: 'Presupuesto est.',
      accessor: 'presupuestoEstimado',
      render: (monto) => formatearPesos(monto),
    },
    {
      header: 'Estado',
      accessor: 'estado',
      render: (estadoProceso) => (
        <Badge variant={claseEstado(estadoProceso)}>{etiquetaEstado(estadoProceso)}</Badge>
      ),
    },
    {
      header: '',
      accessor: 'acciones',
      sortKey: false,
      render: (_, proceso) => (
        <div className="flex flex-wrap justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/compras/${proceso.id}`)}>
            {esEditable(proceso.estado) ? 'Editar' : 'Ver'}
          </Button>
          {esEditable(proceso.estado) && (
            <Button variant="ghost" size="sm" onClick={() => publicarProcesoSeleccionado(proceso)}>
              Publicar
            </Button>
          )}
          {proceso.estado === ESTADO_PROCESO.PUBLICADO && !proceso.tieneSubasta && (
            proceso.isEvaluationActSigned ? (
              <Button variant="ghost" size="sm" onClick={() => abrirConfiguracion(proceso)}>
                Programar subasta
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-error font-bold"
                onClick={() => navigate(`/calificacion/${proceso.id}`)}
                title="Debe firmar el acta de evaluacion antes de iniciar la subasta."
              >
                Firmar Acta
              </Button>
            )
          )}
          {proceso.tieneSubasta && (
            <Button variant="ghost" size="sm" onClick={() => navigate(`/subasta/${proceso.id}`)}>
              Ver subasta
            </Button>
          )}
          {proceso.estado === ESTADO_PROCESO.CERRADA && proceso.tieneSubasta && (
            <Button variant="ghost" size="sm" onClick={() => navigate(`/compras/${proceso.id}/adjudicar`)}>
              Adjudicar
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <section className="space-y-5">
      <ProcesosListHeader onCreate={() => navigate('/compras/nuevo')} />
      <ProcesosFilters
        busqueda={busqueda}
        estado={estado}
        onBusquedaChange={setBusqueda}
        onEstadoChange={setEstado}
      />
      <ProcesosTableSection
        error={error}
        cargando={cargando}
        procesos={procesos}
        pagination={procesosPagination}
        columns={columnasProcesos}
      />

      <ConfigurarSubastaModal
        proceso={procesoParaConfigurar}
        open={!!procesoParaConfigurar}
        loading={iniciarSubastaMutation.isPending}
        subastaEsFutura={subastaEsFutura}
        values={valoresSubasta}
        onChange={actualizarValorSubasta}
        onClose={() => setProcesoParaConfigurar(null)}
        onConfirm={handleConfirmarInicio}
      />
    </section>
  )
}

function formatearPesos(monto) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(monto)
}
