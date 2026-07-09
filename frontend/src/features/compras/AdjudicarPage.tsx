// Adjudicacion por el comprador: tras cerrar la subasta, elige el proveedor ganador.

import { FormEvent, ReactNode, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import {
  adjudicarProcesoMutation,
  adjudicarProcesoPageQuery,
  declararProcesoDesiertoMutation,
  procesosKeys,
  suspenderProcesoPorImpugnacionMutation,
} from './data/procesosData'
import { Alert } from '../../shared/ui/Alert'
import { Badge } from '../../shared/ui/Badge'
import { Button } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'
import { PageHeader } from '../../shared/ui/PageHeader'
import { PageShell } from '../../shared/ui/PageShell'
import { Select } from '../../shared/ui/Select'
import { Spinner } from '../../shared/ui/Spinner'
import { Table } from '../../shared/ui/Table'
import { Textarea } from '../../shared/ui/Textarea'
import { getErrorMessage } from '../../shared/query/queryClient'

interface SupplierEvaluationSummary {
  isExcluded?: boolean
  totalWeightedScore?: number | null
  supplierName?: string | null
}

export function AdjudicarPage() {
  const { id } = useParams()
  const { tenantId, usuario } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [elegido, setElegido] = useState('')
  const [accionExcepcion, setAccionExcepcion] = useState<'desierto' | 'impugnacion' | null>(null)
  const [fundamento, setFundamento] = useState('')
  const [errorAccion, setErrorAccion] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: [...procesosKeys.detail(tenantId, id), 'adjudicar'],
    queryFn: () => adjudicarProcesoPageQuery({ tenantId, id }),
    enabled: Boolean(tenantId && id),
  })

  const [elegidoInited, setElegidoInited] = useState(false)
  if (data && !elegidoInited) {
    setElegidoInited(true)
    const recommended = data.evalResults?.supplierEvaluations
      ?.filter((evaluacion: SupplierEvaluationSummary) => !evaluacion.isExcluded)
      ?.sort((a: SupplierEvaluationSummary, b: SupplierEvaluationSummary) => (b.totalWeightedScore ?? 0) - (a.totalWeightedScore ?? 0))[0]
    setElegido(data.dictamen?.tieneRecomendacion
      ? data.dictamen.proveedor ?? ''
      : recommended?.supplierName ?? data.ofertas[0]?.proveedor ?? '')
  }

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: procesosKeys.lists() }),
      queryClient.invalidateQueries({ queryKey: procesosKeys.detail(tenantId, id) }),
    ])
  }

  const adjudicar = useMutation({
    mutationFn: adjudicarProcesoMutation,
    onSuccess: async () => {
      await invalidate()
      navigate('/compras')
    },
    onError: (err) => setErrorAccion(getErrorMessage(err)),
  })

  const excepcion = useMutation({
    mutationFn: (params: { accion: 'desierto' | 'impugnacion'; tenantId: string; id: string; operadorId: string; fundamento: string }) =>
      params.accion === 'desierto'
        ? declararProcesoDesiertoMutation(params)
        : suspenderProcesoPorImpugnacionMutation(params),
    onSuccess: async () => {
      await invalidate()
      navigate('/compras')
    },
    onError: (err) => setErrorAccion(getErrorMessage(err)),
  })

  const guardando = adjudicar.isPending || excepcion.isPending

  async function adjudicarSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorAccion('')
    adjudicar.mutate({
      tenantId: tenantId ?? '',
      id: id ?? '',
      compradorId: usuario?.id ?? '',
      proveedor: elegido,
    })
  }

  async function confirmarExcepcion() {
    if (!accionExcepcion) return
    setErrorAccion('')
    excepcion.mutate({
      accion: accionExcepcion,
      tenantId: tenantId ?? '',
      id: id ?? '',
      operadorId: usuario?.id ?? '',
      fundamento,
    })
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    )
  }

  if (!data?.proceso) {
    return <Alert variant="error">{getErrorMessage(error, 'No se pudo cargar la adjudicacion.')}</Alert>
  }

  const { proceso, ofertas, evalResults, dictamen } = data

  return (
    <PageShell as="section" width="wide" className="px-0 py-0">
      <PageHeader
        title={<>Adjudicar <code>{proceso.codigo}</code></>}
        description={proceso.titulo}
        actions={(
          <Button type="button" variant="secondary" onClick={() => navigate('/compras')}>
            Volver
          </Button>
        )}
      />

      {errorAccion && <Alert variant="error">{errorAccion}</Alert>}

      {dictamen && (
        <Card hover={false} padding="md" className="space-y-4">
          <h2 className="m-0 text-lg font-semibold text-text">Dictamen asistido</h2>
          <Alert variant="info">{dictamen.resumen}</Alert>
          {dictamen.tieneRecomendacion && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard etiqueta="Ganador sugerido" valor={dictamen.proveedor} />
              <MetricCard etiqueta="Oferta sugerida" valor={formatearPesos(dictamen.monto)} destacado />
              <MetricCard etiqueta="Ahorro" valor={`${formatearPesos(dictamen.ahorroMonto)} (${Number(dictamen.ahorroPorcentaje ?? 0).toFixed(2)}%)`} />
              <MetricCard etiqueta="Puntaje tecnico" valor={dictamen.puntajeTecnico == null ? 'Sin puntaje' : `${dictamen.puntajeTecnico}%`} />
            </div>
          )}
          <section className="space-y-2">
            <h3 className="m-0 text-base font-semibold text-text">Riesgos detectados</h3>
            {dictamen.riesgos.length > 0 ? (
              <div className="grid gap-2">
                {dictamen.riesgos.map((riesgo) => (
                  <Alert variant={riesgo.severidad === 'high' ? 'error' : 'info'} key={riesgo.codigo}>
                    {riesgo.mensaje}
                  </Alert>
                ))}
              </div>
            ) : (
              <Alert variant="info">No se detectaron riesgos relevantes para la recomendacion.</Alert>
            )}
          </section>
        </Card>
      )}

      {evalResults && (
        <Card hover={false} padding="md" className="space-y-4">
          <h2 className="m-0 text-lg font-semibold text-text">Resultados de la evaluacion</h2>
          <Table
            data={evalResults.supplierEvaluations}
            sortable={false}
            columns={[
              { header: 'Proveedor', accessor: 'supplierName' },
              {
                header: 'Oferta',
                accessor: 'supplierName',
                render: (value) => {
                  const oferta = ofertas.find((item) => item.proveedor === value)
                  return oferta ? formatearPesos(oferta.monto) : '---'
                },
              },
              {
                header: 'Score',
                accessor: 'totalWeightedScore',
                render: (value, evaluacion) => evaluacion.isExcluded ? '---' : `${Number(value ?? 0)}%`,
              },
              {
                header: 'Estado',
                accessor: 'isExcluded',
                render: (_value, evaluacion) => evaluacion.isExcluded
                  ? <Badge variant="error" className="cursor-help" title={String(evaluacion.excludedReason || '')}>Excluido</Badge>
                  : <Badge variant="success">Apto</Badge>,
              },
            ]}
          />
        </Card>
      )}

      <Card hover={false} padding="md" className="space-y-4">
        <h2 className="m-0 text-lg font-semibold text-text">Ofertas recibidas</h2>
        <Table
          data={ofertas}
          sortable={false}
          columns={[
            { header: 'Proveedor', accessor: 'proveedor' },
            {
              header: 'Monto',
              accessor: 'monto',
              render: (value) => formatearPesos(Number(value) || 0),
            },
            {
              header: '',
              accessor: 'id',
              render: (_value, oferta) => ofertas[0]?.id === oferta.id ? <Badge variant="success">Mas baja</Badge> : null,
              sortKey: false,
            },
          ]}
        />
      </Card>

      <Card hover={false} padding="md">
        <form className="space-y-4" onSubmit={adjudicarSubmit}>
          <h2 className="m-0 text-lg font-semibold text-text">Adjudicar al proveedor</h2>
          <Select
            label="Proveedor ganador"
            value={elegido}
            onChange={(event) => setElegido(event.target.value)}
          >
            <option value="">Elegi un proveedor...</option>
            {ofertas.map((oferta) => (
              <option key={oferta.id} value={oferta.proveedor}>
                {oferta.proveedor} - {formatearPesos(oferta.monto)}
              </option>
            ))}
          </Select>

          <Alert variant="info">La adjudicacion queda pendiente de aprobacion de la Autoridad.</Alert>

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={guardando}
              onClick={() => setAccionExcepcion('impugnacion')}
            >
              Suspender por impugnacion
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={guardando}
              onClick={() => setAccionExcepcion('desierto')}
            >
              Declarar desierto
            </Button>
            <Button type="submit" disabled={guardando} loading={guardando}>
              Adjudicar
            </Button>
          </div>
        </form>
      </Card>

      {accionExcepcion && (
        <Card hover={false} padding="md" className="space-y-4">
          <h2 className="m-0 text-lg font-semibold text-text">
            {accionExcepcion === 'desierto' ? 'Declarar desierto' : 'Suspender por impugnacion'}
          </h2>
          <Textarea
            label="Fundamento"
            rows={4}
            value={fundamento}
            onChange={(event) => setFundamento(event.target.value)}
            placeholder={accionExcepcion === 'desierto'
              ? 'Detalla por que corresponde declarar desierto el proceso...'
              : 'Detalla la impugnacion y el motivo de suspension...'}
          />
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={guardando}
              onClick={() => {
                setAccionExcepcion(null)
                setFundamento('')
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={guardando}
              loading={guardando}
              onClick={confirmarExcepcion}
            >
              Confirmar
            </Button>
          </div>
        </Card>
      )}
    </PageShell>
  )
}

function formatearPesos(monto: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(monto)
}

function MetricCard({ etiqueta, valor, destacado = false }: { etiqueta: string; valor: ReactNode; destacado?: boolean }) {
  return (
    <article className="rounded-md border border-border bg-background p-3">
      <span className="block text-xs font-semibold uppercase tracking-wider text-text-muted">{etiqueta}</span>
      <span className={['mt-1 block text-base font-semibold', destacado ? 'text-primary' : 'text-text'].join(' ')}>
        {valor}
      </span>
    </article>
  )
}
