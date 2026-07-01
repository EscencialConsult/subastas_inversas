// Listado de procesos de compra del tenant. Entrada principal del comprador.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { listarProcesos, publicarProceso } from '../../api/comprasApi'
import { iniciarSubasta } from '../../api/subastasApi'
import { useToast } from '../../context/ToastContext.jsx'
import {
  ESTADO_PROCESO,
  ESTADO_INFO,
  etiquetaEstado,
  claseEstado,
  esEditable,
} from '../../domain/compras'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card.jsx'
import { EmptyState } from '../../components/ui/EmptyState.jsx'
import { Input } from '../../components/ui/Input.jsx'
import { Modal } from '../../components/ui/Modal'
import { Pagination, usePagination } from '../../components/ui/Pagination.jsx'
import { Select } from '../../components/ui/Select.jsx'
import { Spinner } from '../../components/ui/Spinner.jsx'
import { Table } from '../../components/ui/Table.jsx'
import { SearchX } from 'lucide-react'

export function ProcesosListPage() {
  const { tenantId } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const [procesos, setProcesos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState('')
  const procesosPagination = usePagination(procesos, { initialPageSize: 10 })

  const [procesoParaConfigurar, setProcesoParaConfigurar] = useState(null)
  const [basePrice, setBasePrice] = useState('')
  const [minDecrement, setMinDecrement] = useState('1')
  const [startsAt, setStartsAt] = useState('')
  const [duration, setDuration] = useState('10')
  const [extension, setExtension] = useState('3')
  const [pabThreshold, setPabThreshold] = useState('')
  const [configCargando, setConfigCargando] = useState(false)
  const [ahoraMs, setAhoraMs] = useState(() => Date.now())

  async function cargar() {
    setCargando(true)
    setError('')
    try {
      const lista = await listarProcesos({ tenantId, busqueda, estado })
      setProcesos(lista)
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(cargar, 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, busqueda, estado])

  useEffect(() => {
    if (!procesoParaConfigurar) return undefined
    const intervalo = setInterval(() => setAhoraMs(Date.now()), 1000)
    return () => clearInterval(intervalo)
  }, [procesoParaConfigurar])

  async function publicar(proceso) {
    try {
      await publicarProceso({ tenantId, id: proceso.id })
      cargar()
    } catch (err) {
      setError(err.message)
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

    setConfigCargando(true)
    try {
      const startsAtDate = new Date(startsAt)
      await iniciarSubasta({
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
      toast.error(err.message)
    } finally {
      setConfigCargando(false)
    }
  }

  const subastaEsFutura = startsAt ? new Date(startsAt).getTime() > ahoraMs : false
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
            <Button variant="ghost" size="sm" onClick={() => publicar(proceso)}>
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Procesos de compra</h1>
          <p className="mt-1 text-sm text-text-muted">
            Gestiona borradores, publicaciones y subastas del tenant actual.
          </p>
        </div>
        <Button onClick={() => navigate('/compras/nuevo')}>+ Nuevo proceso</Button>
      </div>

      <Card hover={false} className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
        <Input
          label="Buscar"
          placeholder="Buscar por codigo o titulo..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <Select label="Estado" value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {Object.entries(ESTADO_INFO).map(([clave, info]) => (
            <option key={clave} value={clave}>
              {info.label}
            </option>
          ))}
        </Select>
      </Card>

      {error && <Alert variant="error">{error}</Alert>}

      {cargando ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : procesos.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="Sin resultados"
          description="No hay procesos de compra que coincidan con el filtro."
        />
      ) : (
        <div>
          <Table
            columns={columnasProcesos}
            data={procesosPagination.paginatedItems}
            sortable={false}
            emptyTitle="Sin resultados"
            emptyDescription="No hay procesos de compra que coincidan con el filtro."
          />
          <Pagination
            page={procesosPagination.page}
            pageSize={procesosPagination.pageSize}
            totalItems={procesosPagination.totalItems}
            totalPages={procesosPagination.totalPages}
            onPageChange={procesosPagination.setPage}
            onPageSizeChange={procesosPagination.setPageSize}
          />
        </div>
      )}

      <Modal
        open={!!procesoParaConfigurar}
        onClose={() => setProcesoParaConfigurar(null)}
        title="Configurar subasta inversa"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setProcesoParaConfigurar(null)} disabled={configCargando}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmarInicio} disabled={configCargando} loading={configCargando}>
              {subastaEsFutura ? 'Programar subasta' : 'Iniciar subasta'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-muted mb-4">
          Establece los parametros de la subasta para el proceso <strong>{procesoParaConfigurar?.codigo}</strong>:
        </p>

        <div className="flex flex-col gap-4">
          <Input
            type="number"
            label="Precio base (ARS)"
            value={basePrice}
            onChange={(e) => setBasePrice(e.target.value)}
            placeholder="Ingrese el precio base"
            min="1"
            required
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              type="number"
              label="Decremento minimo (%)"
              value={minDecrement}
              onChange={(e) => setMinDecrement(e.target.value)}
              min="0"
              max="100"
              step="0.1"
              required
            />
            <Input
              type="number"
              label="Umbral PAB (ARS)"
              help="Ofertas bajo este monto seran marcadas como PAB."
              value={pabThreshold}
              onChange={(e) => setPabThreshold(e.target.value)}
              placeholder="Umbral de precio anormalmente bajo"
              min="0"
            />
          </div>

          <Input
            type="datetime-local"
            label="Fecha y hora de inicio (local)"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            required
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              type="number"
              label="Duracion (minutos)"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              min="1"
              required
            />
            <Input
              type="number"
              label="Extension automatica (minutos)"
              help="Extiende la subasta si se oferta al final."
              value={extension}
              onChange={(e) => setExtension(e.target.value)}
              min="0"
              required
            />
          </div>
        </div>
      </Modal>
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
