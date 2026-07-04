// Adjudicación por el COMPRADOR: tras cerrar la subasta, elige el proveedor
// ganador (propone). Queda pendiente de la aprobación de la Autoridad.
//
// En subasta inversa la mejor oferta es la más baja; viene preseleccionada,
// pero el comprador puede elegir otra si la más baja no corresponde.

import { FormEvent, ReactNode, useEffect, useState } from 'react'
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
import { Badge } from '../../shared/ui/Badge'
import { Alert } from '../../shared/ui/Alert'
import { Spinner } from '../../shared/ui/Spinner'
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

  useEffect(() => {
    if (!data || elegido) return
    const recommended = data.evalResults?.supplierEvaluations
      ?.filter((evaluacion: SupplierEvaluationSummary) => !evaluacion.isExcluded)
      ?.sort((a: SupplierEvaluationSummary, b: SupplierEvaluationSummary) => (b.totalWeightedScore ?? 0) - (a.totalWeightedScore ?? 0))[0]
    setElegido(data.dictamen?.tieneRecomendacion
      ? data.dictamen.proveedor ?? ''
      : recommended?.supplierName ?? data.ofertas[0]?.proveedor ?? '')
  }, [data, elegido])

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

  async function adjudicarSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
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

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>
  if (!data?.proceso) return <Alert variant="error">{getErrorMessage(error, 'No se pudo cargar la adjudicacion.')}</Alert>

  const { proceso, ofertas, evalResults, dictamen } = data

  return (
    <section className="space-y-6">
      <div className="encabezado">
        <h1>
          Adjudicar · <code>{proceso.codigo}</code>
        </h1>
        <button className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60" onClick={() => navigate('/compras')}>
          Volver
        </button>
      </div>

      {errorAccion && <Alert variant="error">{errorAccion}</Alert>}

      <p className="proceso__descripcion">{proceso.titulo}</p>

      {dictamen && (
        <div className="rounded-md border border-border bg-surface p-5 shadow-sm" style={{ marginBottom: 20 }}>
          <h2 className="text-lg font-semibold text-text">Dictamen asistido</h2>
          <Alert variant="info">{dictamen.resumen}</Alert>
          {dictamen.tieneRecomendacion && (
            <div className="subasta__panel" style={{ marginBottom: 16 }}>
              <MetricCard etiqueta="Ganador sugerido" valor={dictamen.proveedor} />
              <MetricCard etiqueta="Oferta sugerida" valor={formatearPesos(dictamen.monto)} destacado />
              <MetricCard etiqueta="Ahorro" valor={`${formatearPesos(dictamen.ahorroMonto)} (${Number(dictamen.ahorroPorcentaje ?? 0).toFixed(2)}%)`} />
              <MetricCard etiqueta="Puntaje tecnico" valor={dictamen.puntajeTecnico == null ? 'Sin puntaje' : `${dictamen.puntajeTecnico}%`} />
            </div>
          )}
          <h3 className="text-base font-semibold text-text">Riesgos detectados</h3>
          {dictamen.riesgos.length > 0 ? (
            <div className="flex flex-col gap-8">
              {dictamen.riesgos.map((riesgo) => (
                <div className={`alerta ${riesgo.severidad === 'high' ? 'alerta--error' : 'alerta--info'}`} key={riesgo.codigo}>
                  {riesgo.mensaje}
                </div>
              ))}
            </div>
          ) : (
            <Alert variant="info">No se detectaron riesgos relevantes para la recomendacion.</Alert>
          )}
        </div>
      )}

      {/* Panel de resultados de evaluación */}
      {evalResults && (
        <div className="rounded-md border border-border bg-surface p-5 shadow-sm" style={{ marginBottom: 20 }}>
          <h2 className="text-lg font-semibold text-text">Resultados de la Evaluación</h2>
          <table className="min-w-full divide-y divide-border text-sm">
            <thead>
              <tr>
                <th>Proveedor</th>
                <th>Oferta</th>
                <th>Score</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {evalResults.supplierEvaluations.map(e => {
                const oferta = ofertas.find(o => o.proveedor === e.supplierName)
                return (
                  <tr key={e.id} style={e.isExcluded ? { opacity: 0.5, textDecoration: 'line-through' } : { fontWeight: e.isExcluded ? 'normal' : 'bold' }}>
                    <td>{e.supplierName}</td>
                    <td>{oferta ? formatearPesos(oferta.monto) : '—'}</td>
                    <td>{e.isExcluded ? '—' : `${e.totalWeightedScore ?? 0}%`}</td>
                    <td>
                      {e.isExcluded ? (
                        <Badge variant="error" className="cursor-help" title={e.excludedReason || ''}>Excluido</Badge>
                      ) : (
                        <Badge variant="success">Apto</Badge>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="text-lg font-semibold text-text">Ofertas recibidas</h2>
      <table className="min-w-full divide-y divide-border text-sm">
        <thead>
          <tr>
            <th>Proveedor</th>
            <th>Monto</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {ofertas.map((o, i) => (
            <tr key={o.id}>
              <td>{o.proveedor}</td>
              <td>{formatearPesos(o.monto)}</td>
              <td>{i === 0 && <Badge variant="success">Más baja</Badge>}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <form className="rounded-md border border-border bg-surface p-5 shadow-sm" onSubmit={adjudicarSubmit} style={{ marginTop: 20 }}>
        <h2 className="text-lg font-semibold text-text">Adjudicar al proveedor</h2>
        <label className="campo">
          <span>Proveedor ganador</span>
          <select value={elegido} onChange={(e) => setElegido(e.target.value)}>
            <option value="">Elegí un proveedor…</option>
            {ofertas.map((o) => (
              <option key={o.id} value={o.proveedor}>
                {o.proveedor} — {formatearPesos(o.monto)}
              </option>
            ))}
          </select>
        </label>

        <Alert variant="info">La adjudicación queda pendiente de aprobación de la Autoridad.</Alert>

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60"
            disabled={guardando}
            onClick={() => setAccionExcepcion('impugnacion')}
          >
            Suspender por impugnacion
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md bg-error px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-error/90 disabled:opacity-60"
            disabled={guardando}
            onClick={() => setAccionExcepcion('desierto')}
          >
            Declarar desierto
          </button>
          <button type="submit" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-60" disabled={guardando}>
            {guardando ? 'Adjudicando…' : 'Adjudicar'}
          </button>
        </div>
      </form>

      {accionExcepcion && (
        <div className="rounded-md border border-border bg-surface p-5 shadow-sm" style={{ marginTop: 20 }}>
          <h2 className="text-lg font-semibold text-text">
            {accionExcepcion === 'desierto' ? 'Declarar desierto' : 'Suspender por impugnacion'}
          </h2>
          <label className="campo">
            <span>Fundamento</span>
            <textarea
              rows={4}
              value={fundamento}
              onChange={(e) => setFundamento(e.target.value)}
              placeholder={accionExcepcion === 'desierto'
                ? 'Detalla por que corresponde declarar desierto el proceso...'
                : 'Detalla la impugnacion y el motivo de suspension...'}
            />
          </label>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60"
              disabled={guardando}
              onClick={() => {
                setAccionExcepcion(null)
                setFundamento('')
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md bg-error px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-error/90 disabled:opacity-60"
              disabled={guardando}
              onClick={confirmarExcepcion}
            >
              {guardando ? 'Procesando...' : 'Confirmar'}
            </button>
          </div>
        </div>
      )}
    </section>
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
    <article className="subasta__card">
      <span className="subasta__label">{etiqueta}</span>
      <span className={`subasta__valor ${destacado ? 'subasta__valor--destacado' : ''}`}>{valor}</span>
    </article>
  )
}
