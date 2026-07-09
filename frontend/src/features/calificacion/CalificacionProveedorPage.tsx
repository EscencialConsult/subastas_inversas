import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { SearchX } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { puedeCalificarProveedores } from '../../auth/permisos'
import { getErrorMessage } from '../../shared/query/queryClient'
import { Alert } from '../../shared/ui/Alert'
import { Badge } from '../../shared/ui/Badge'
import { Button } from '../../shared/ui/Button'
import { EmptyState } from '../../shared/ui/EmptyState'
import { FormActions } from '../../shared/ui/FormActions'
import { FormSection } from '../../shared/ui/FormSection'
import { LoadingState } from '../../shared/ui/StateViews'
import { PageHeader } from '../../shared/ui/PageHeader'
import { PageShell } from '../../shared/ui/PageShell'
import { Textarea } from '../../shared/ui/Textarea'
import { calificacionKeys, calificacionProveedorQuery, calificarProveedorMutation } from './data/calificacionData'

interface Calificacion {
  estado: string
  evaluador?: string
  notas?: string
  fecha?: string
}

interface Proveedor {
  businessName: string
  cuit: string
  calificacion?: Calificacion | null
}

interface Proceso {
  titulo: string
  codigo: string
}

const CLASE_CALIFICACION = {
  pendiente: 'info' as const,
  aprobado: 'success' as const,
  observado: 'warning' as const,
  rechazado: 'error' as const,
}

const ETIQUETA_CALIFICACION: Record<string, string> = {
  pendiente: 'Pendiente',
  aprobado: 'Aprobado',
  observado: 'Observado',
  rechazado: 'Rechazado',
}

const OPCIONES_CALIFICACION = [
  { value: 'Approved', label: 'Aprobado', desc: 'Podrá participar en la subasta' },
  { value: 'Observed', label: 'Observado', desc: 'No podrá participar (subsanable)' },
  { value: 'Rejected', label: 'Rechazado', desc: 'No podrá participar' },
] as const

export function CalificacionProveedorPage() {
  const { tenantId, usuario, rol } = useAuth()
  const { id: procesoId, invitationId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const puedeCalificar = puedeCalificarProveedores(rol)

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
    onSuccess: async (result: { calificacion: { estado: string } }) => {
      setExito(`Proveedor calificado como "${ETIQUETA_CALIFICACION[result.calificacion.estado]}".`)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: calificacionKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: calificacionKeys.detail(tenantId, procesoId) }),
        queryClient.invalidateQueries({
          queryKey: [...calificacionKeys.detail(tenantId, procesoId), 'proveedor', invitationId],
        }),
      ])
    },
  })

  const data = proveedorQuery.data as { proceso?: Proceso; proveedor?: Proveedor } | undefined
  const proceso = data?.proceso
  const proveedor = data?.proveedor
  const [califInit, setCalifInit] = useState(false)

  if (proveedor?.calificacion && proveedor.calificacion.estado !== 'pendiente' && !califInit) {
    setCalifInit(true)
    setEstadoSeleccionado(
      proveedor.calificacion.estado === 'aprobado'
        ? 'Approved'
        : proveedor.calificacion.estado === 'observado'
          ? 'Observed'
          : 'Rejected',
    )
    setFundamento(proveedor.calificacion.notas ?? '')
  }

  function irAtras() {
    navigate(`/calificacion/${procesoId}`)
  }

  async function handleGuardar() {
    if (!puedeCalificar) return

    if (!estadoSeleccionado) {
      setValidacion('Debe seleccionar un estado de calificación.')
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

  if (proveedorQuery.isLoading) return <LoadingState label="Cargando proveedor..." />

  const error = validacion || getErrorMessage(calificarMutation.error ?? proveedorQuery.error, '')
  if (error && !proveedor) return <Alert variant="error">{error}</Alert>
  if (!proceso || !proveedor) return <EmptyState icon={SearchX} title="Sin datos" description="Datos no disponibles." />

  const cal = proveedor.calificacion
  const yaCalificado = cal && cal.estado !== 'pendiente'

  return (
    <PageShell>
      <PageHeader
        title={proveedor.businessName}
        description={
          <>
            <code>{proveedor.cuit}</code> &middot; {proceso.titulo} (<code>{proceso.codigo}</code>)
            {cal && (
              <span>
                &middot; Calificación actual:{' '}
                <Badge variant={CLASE_CALIFICACION[cal.estado] ?? 'info'}>
                  {ETIQUETA_CALIFICACION[cal.estado]}
                </Badge>
              </span>
            )}
          </>
        }
        actions={
          <Button variant="ghost" onClick={irAtras}>
            &larr; Volver al proceso
          </Button>
        }
      />

      {error && <Alert variant="error">{error}</Alert>}
      {exito && <Alert variant="success">{exito}</Alert>}
      {!puedeCalificar && (
        <Alert variant="info">
          Vista de solo lectura. La calificación de proveedores corresponde al evaluador.
        </Alert>
      )}

      {yaCalificado && (
        <Alert variant="info">
          {cal.estado === 'aprobado'
            ? 'Este proveedor ya fue aprobado y no se puede modificar su calificación.'
            : cal.estado === 'observado'
              ? 'Este proveedor fue observado. Puede cambiarlo a Aprobado si subsanó las observaciones.'
              : 'Este proveedor fue rechazado.'}
          {cal.evaluador && <span> Evaluado por: {cal.evaluador}.</span>}
          {cal.fecha && <span> Fecha: {new Date(cal.fecha).toLocaleDateString()}.</span>}
        </Alert>
      )}

      {puedeCalificar && (!yaCalificado || (yaCalificado && cal.estado === 'observado')) && (
        <FormSection title="Calificación">
          <div className="space-y-4">
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-text">
                Estado <span className="text-error">*</span>
              </legend>
              <div className="grid gap-3 sm:grid-cols-3">
                {OPCIONES_CALIFICACION.map((op) => (
                  <button
                    key={op.value}
                    type="button"
                    className={[
                      'rounded-md border px-4 py-3 text-center text-sm font-medium transition-colors',
                      estadoSeleccionado === op.value
                        ? 'border-primary bg-primary text-white'
                        : 'border-border bg-surface text-text hover:bg-background',
                    ].join(' ')}
                    onClick={() => setEstadoSeleccionado(op.value)}
                  >
                    <div className="font-semibold">{op.label}</div>
                    <div className="mt-0.5 text-xs opacity-70">{op.desc}</div>
                  </button>
                ))}
              </div>
            </fieldset>

            <Textarea
              label={
                <>
                  Fundamento{' '}
                  {estadoSeleccionado === 'Rejected' ? (
                    <span className="text-error">*</span>
                  ) : (
                    <span className="text-text-muted">(opcional)</span>
                  )}
                </>
              }
              placeholder="Explique el motivo de la calificación..."
              value={fundamento}
              onChange={(e) => setFundamento(e.target.value)}
              rows={4}
            />
          </div>

          <FormActions>
            <Button variant="ghost" onClick={irAtras}>
              Cancelar
            </Button>
            <Button onClick={handleGuardar} loading={calificarMutation.isPending}>
              Guardar calificación
            </Button>
          </FormActions>
        </FormSection>
      )}

      {(!puedeCalificar || (yaCalificado && cal.estado !== 'observado')) && (
        <FormActions>
          <Button onClick={irAtras}>Volver</Button>
        </FormActions>
      )}
    </PageShell>
  )
}
