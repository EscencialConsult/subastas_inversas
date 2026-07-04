import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { SearchX } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { getErrorMessage } from '../../shared/query/queryClient'
import { Badge } from '../../shared/ui/Badge'
import { Alert } from '../../shared/ui/Alert'
import { EmptyState } from '../../shared/ui/EmptyState'
import { Spinner } from '../../shared/ui/Spinner'
import { calificacionKeys, calificacionProveedorQuery, calificarProveedorMutation } from './data/calificacionData'

const CLASE_CALIFICACION = {
  pendiente: 'info',
  aprobado: 'success',
  observado: 'warning',
  rechazado: 'error',
}

const ETIQUETA_CALIFICACION = {
  pendiente: 'Pendiente',
  aprobado: 'Aprobado',
  observado: 'Observado',
  rechazado: 'Rechazado',
}

const ESTADOS_REVERSE = {
  aprobado: 'Approved',
  observado: 'Observed',
  rechazado: 'Rejected',
}

export function CalificacionProveedorPage() {
  const { tenantId, usuario } = useAuth()
  const { id: procesoId, invitationId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [estadoSeleccionado, setEstadoSeleccionado] = useState('')
  const [fundamento, setFundamento] = useState('')
  const [validacion, setValidacion] = useState('')
  const [exito, setExito] = useState('')

  const proveedorQuery = useQuery({
    queryKey: [...calificacionKeys.detail(tenantId, procesoId), 'proveedor', invitationId],
    queryFn: () => calificacionProveedorQuery({ tenantId, procesoId, invitationId }),
    enabled: Boolean(tenantId && procesoId && invitationId),
  })

  const calificarMutation = useMutation({
    mutationFn: calificarProveedorMutation,
    onSuccess: async (result) => {
      setExito(`Proveedor calificado como "${ETIQUETA_CALIFICACION[result.calificacion.estado]}".`)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: calificacionKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: calificacionKeys.detail(tenantId, procesoId) }),
        queryClient.invalidateQueries({ queryKey: [...calificacionKeys.detail(tenantId, procesoId), 'proveedor', invitationId] }),
      ])
    },
  })

  const proceso = proveedorQuery.data?.proceso
  const proveedor = proveedorQuery.data?.proveedor

  useEffect(() => {
    if (!proveedor?.calificacion || proveedor.calificacion.estado === 'pendiente') return
    setEstadoSeleccionado(ESTADOS_REVERSE[proveedor.calificacion.estado] ?? '')
    setFundamento(proveedor.calificacion.notas ?? '')
  }, [proveedor])

  function irAtras() {
    navigate(`/calificacion/${procesoId}`)
  }

  async function handleGuardar() {
    if (!estadoSeleccionado) {
      setValidacion('Debe seleccionar un estado de calificacion.')
      return
    }

    setValidacion('')
    setExito('')
    try {
      await calificarMutation.mutateAsync({
        tenantId,
        procesoId,
        invitationId,
        evaluatorId: usuario.id,
        qualificationStatus: estadoSeleccionado,
        notes: fundamento.trim() || '',
      })
    } catch {
      // El error se muestra desde la mutation.
    }
  }

  if (proveedorQuery.isLoading) return <div className="flex justify-center py-12"><Spinner /></div>

  const error = validacion || getErrorMessage(calificarMutation.error ?? proveedorQuery.error, !proveedor ? 'Proveedor no encontrado en este proceso.' : '')
  if (error && !proveedor) return <Alert variant="error">{error}</Alert>
  if (!proceso || !proveedor) return <EmptyState icon={SearchX} title="Sin datos" description="Datos no disponibles." />

  const cal = proveedor.calificacion
  const yaCalificado = cal && cal.estado !== 'pendiente'

  return (
    <section className="space-y-6">
      <div className="encabezado">
        <button className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60" onClick={irAtras}>
          &larr; Volver al proceso
        </button>
        <h1>{proveedor.businessName}</h1>
        <p className="proceso__descripcion">
          <code>{proveedor.cuit}</code> &middot; {proceso.titulo} (<code>{proceso.codigo}</code>)
          {cal && (
            <span>
              &middot; Calificacion actual:{' '}
              <Badge variant={CLASE_CALIFICACION[cal.estado] ?? 'info'}>
                {ETIQUETA_CALIFICACION[cal.estado]}
              </Badge>
            </span>
          )}
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {exito && <Alert variant="success">{exito}</Alert>}

      {yaCalificado && (
        <Alert variant="info">
          {cal.estado === 'aprobado'
            ? 'Este proveedor ya fue aprobado y no se puede modificar su calificacion.'
            : cal.estado === 'observado'
              ? 'Este proveedor fue observado. Puede cambiarlo a Aprobado si subsano las observaciones.'
              : 'Este proveedor fue rechazado.'}
          {cal.evaluador && <span> Evaluado por: {cal.evaluador}.</span>}
          {cal.fecha && <span> Fecha: {new Date(cal.fecha).toLocaleDateString()}.</span>}
        </Alert>
      )}

      {(!yaCalificado || (yaCalificado && cal.estado === 'observado')) && (
        <div className="rounded-md border border-border bg-surface p-5 shadow-sm" style={{ maxWidth: 600 }}>
          <h2 className="text-lg font-semibold text-text">Calificacion</h2>

          <div className="campo">
            <label className="campo__etiqueta">Estado *</label>
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              {[
                { value: 'Approved', label: 'Aprobado', desc: 'Podra participar en la subasta' },
                { value: 'Observed', label: 'Observado', desc: 'No podra participar (subsanable)' },
                { value: 'Rejected', label: 'Rechazado', desc: 'No podra participar' },
              ].map((op) => (
                <label
                  key={op.value}
                  className={[
                    'flex-1 cursor-pointer rounded-md border px-3 py-3 text-center text-sm font-medium transition-colors',
                    estadoSeleccionado === op.value
                      ? 'border-primary bg-primary text-white'
                      : 'border-border bg-surface text-text hover:bg-background',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    name="estado"
                    value={op.value}
                    checked={estadoSeleccionado === op.value}
                    onChange={(event) => setEstadoSeleccionado(event.target.value)}
                    style={{ display: 'none' }}
                  />
                  <div><strong>{op.label}</strong></div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{op.desc}</div>
                </label>
              ))}
            </div>
          </div>

          <div className="campo">
            <label className="campo__etiqueta" htmlFor="fundamento">
              Fundamento {estadoSeleccionado === 'Rejected' ? '*' : '(opcional)'}
            </label>
            <textarea
              id="fundamento"
              className="campo__input"
              rows={4}
              placeholder="Explique el motivo de la calificacion..."
              value={fundamento}
              onChange={(event) => setFundamento(event.target.value)}
            />
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <button className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60" onClick={irAtras}>
              Cancelar
            </button>
            <button
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
              onClick={handleGuardar}
              disabled={calificarMutation.isPending}
            >
              {calificarMutation.isPending ? 'Guardando...' : 'Guardar calificacion'}
            </button>
          </div>
        </div>
      )}

      {yaCalificado && cal.estado !== 'observado' && (
        <div className="flex flex-wrap justify-end gap-2">
          <button className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-60" onClick={irAtras}>
            Volver
          </button>
        </div>
      )}
    </section>
  )
}
