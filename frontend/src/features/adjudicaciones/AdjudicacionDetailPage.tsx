// Detalle para la AUTORIDAD: ve la adjudicación propuesta por el comprador y
// las ofertas, y la aprueba o la rechaza (con motivo).

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { analisisSubasta } from '../../shared/api/subastasApi'
import { ESTADO_PROCESO } from '../../domain/compras'
import { getErrorMessage } from '../../shared/query/queryClient'
import { Badge } from '../../shared/ui/Badge'
import { Alert } from '../../shared/ui/Alert'
import { Spinner } from '../../shared/ui/Spinner'
import {
  adjudicacionDetalleQuery,
  adjudicacionesKeys,
  aprobarAdjudicacionMutation,
  devolverAdjudicacionMutation,
  rechazarAdjudicacionMutation,
} from './data/adjudicacionesData'

export function AdjudicacionDetailPage() {
  const { id } = useParams()
  const { tenantId, usuario } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [accionMotivo, setAccionMotivo] = useState(null)
  const [motivo, setMotivo] = useState('')

  const detalleQuery = useQuery({
    queryKey: adjudicacionesKeys.detail(tenantId, id),
    queryFn: () => adjudicacionDetalleQuery({ tenantId, id }),
    enabled: Boolean(tenantId && id),
  })

  const invalidateAdjudicaciones = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adjudicacionesKeys.lists() }),
      queryClient.invalidateQueries({ queryKey: adjudicacionesKeys.detail(tenantId, id) }),
    ])
  }

  const aprobarMutation = useMutation({ mutationFn: aprobarAdjudicacionMutation, onSuccess: invalidateAdjudicaciones })
  const rechazarMutation = useMutation({ mutationFn: rechazarAdjudicacionMutation, onSuccess: invalidateAdjudicaciones })
  const devolverMutation = useMutation({ mutationFn: devolverAdjudicacionMutation, onSuccess: invalidateAdjudicaciones })

  async function aprobar() {
    try {
      await aprobarMutation.mutateAsync({ tenantId, id, autoridadId: usuario.id })
      navigate('/adjudicaciones')
    } catch {
      // El error se muestra desde la mutation.
    }
  }

  async function confirmarRechazo() {
    try {
      if (accionMotivo === 'devolver') {
        await devolverMutation.mutateAsync({ tenantId, id, autoridadId: usuario.id, motivo })
      } else {
        await rechazarMutation.mutateAsync({ tenantId, id, autoridadId: usuario.id, motivo })
      }
      navigate('/adjudicaciones')
    } catch {
      // El error se muestra desde la mutation.
    }
  }

  if (detalleQuery.isLoading) return <div className="flex justify-center py-12"><Spinner /></div>
  const error = getErrorMessage(detalleQuery.error ?? aprobarMutation.error ?? rechazarMutation.error ?? devolverMutation.error, '')
  const proceso = detalleQuery.data?.proceso
  const subasta = detalleQuery.data?.subasta
  const ofertas = detalleQuery.data?.ofertas ?? []
  const procesando = aprobarMutation.isPending || rechazarMutation.isPending || devolverMutation.isPending
  if (!proceso) return <Alert variant="error">{error}</Alert>

  const pendiente = proceso.estado === ESTADO_PROCESO.ADJUDICADA
  const estaDevolviendo = accionMotivo === 'devolver'
  const adj = proceso.adjudicacion
  const adjudicado = adj?.proveedor

  const analisis = subasta ? analisisSubasta(subasta) : null
  const masBaja = ofertas[0] ?? null
  const adjudicaNoEsLaMasBaja = adj && masBaja && !esOfertaAdjudicada(masBaja, adj)

  return (
    <section className="space-y-6">
      <div className="encabezado">
        <h1>
          Adjudicación · <code>{proceso.codigo}</code>
        </h1>
        <button className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60" onClick={() => navigate('/adjudicaciones')}>
          Volver
        </button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <p className="proceso__descripcion">{proceso.titulo}</p>

      <div className="rounded-md border border-border bg-surface p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-text">Adjudicación propuesta</h2>
        <div className="perfil__solo-lectura">
          <span>Proveedor: {adjudicado ?? '—'}</span>
          {adj && <span>Monto: {formatearPesos(adj.monto)}</span>}
          {adj && <span>Propuesta el: {adj.fecha}</span>}
          {adj?.documentHash && <span>Hash acta: <code>{adj.documentHash.slice(0, 16)}</code></span>}
          {adj?.immutableHash && <span>Hash registro: <code>{adj.immutableHash.slice(0, 16)}</code></span>}
        </div>

        {/* Contexto de la subasta para que la Autoridad decida con información. */}
        {analisis && (
          <>
            <h2 className="text-lg font-semibold text-text">Resultado de la subasta</h2>
            <div className="perfil__solo-lectura">
              <span>Proveedores que ofertaron: {analisis.oferentes}</span>
              <span>Presupuesto base: {formatearPesos(analisis.base)}</span>
              <span>Oferta más baja: {formatearPesos(analisis.mejor)}</span>
              <span>Baja lograda: {analisis.bajaPorcentaje.toFixed(1)}%</span>
            </div>
          </>
        )}

        {/* Aviso de gobernanza: si NO se adjudicó a la oferta más baja. */}
        {adjudicaNoEsLaMasBaja && (
          <Alert variant="info">Atención: la adjudicación propuesta no es la oferta más baja
            ({masBaja?.proveedor}, {formatearPesos(masBaja?.monto)}). Revisá la
            justificación antes de aprobar.</Alert>
        )}

        <h2 className="text-lg font-semibold text-text">Ofertas</h2>
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
                <td className="flex flex-wrap justify-end gap-2">
{i === 0 && <Badge variant="neutral">Más baja</Badge>}
                  {esOfertaAdjudicada(o, adj) && (
                    <Badge variant="success">Adjudicado</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {pendiente && !accionMotivo && (
          <div className="flex flex-wrap justify-end gap-2">
            <button
              className="inline-flex items-center justify-center rounded-md bg-error px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-error/90 disabled:opacity-60"
              onClick={() => setAccionMotivo('rechazar')}
              disabled={procesando}
            >
              Rechazar
            </button>
            <button
              className="inline-flex items-center justify-center rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-text transition-colors hover:bg-background disabled:opacity-60"
              onClick={() => setAccionMotivo('devolver')}
              disabled={procesando}
            >
              Devolver
            </button>
            <button className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-60" onClick={aprobar} disabled={procesando}>
              {procesando ? 'Procesando…' : 'Aprobar adjudicación'}
            </button>
          </div>
        )}

        {pendiente && accionMotivo && (
          <div className="rechazo">
            <label className="campo">
              <span>{estaDevolviendo ? 'Motivo de la devolucion' : 'Motivo del rechazo'}</span>
              <textarea
                rows={3}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder={estaDevolviendo
                  ? 'Indicá qué debe corregir el equipo evaluador…'
                  : 'Explicá por qué se rechaza la adjudicación…'}
              />
            </label>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60"
                onClick={() => {
                  setAccionMotivo(null)
                  setMotivo('')
                }}
                disabled={procesando}
              >
                Cancelar
              </button>
              <button
                className="inline-flex items-center justify-center rounded-md bg-error px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-error/90 disabled:opacity-60"
                onClick={confirmarRechazo}
                disabled={procesando}
              >
                {procesando
                  ? 'Procesando…'
                  : estaDevolviendo
                    ? 'Confirmar devolución'
                    : 'Confirmar rechazo'}
              </button>
            </div>
          </div>
        )}

        {!pendiente && (
          <Alert variant="info">Esta adjudicación ya fue resuelta.</Alert>
        )}
      </div>
    </section>
  )
}

function esOfertaAdjudicada(oferta, adjudicacion) {
  if (!oferta || !adjudicacion) return false

  return oferta.proveedor === adjudicacion.proveedor && Number(oferta.monto) === Number(adjudicacion.monto)
}

function formatearPesos(monto) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(monto)
}
