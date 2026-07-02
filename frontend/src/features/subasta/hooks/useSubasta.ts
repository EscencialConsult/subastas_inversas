import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ProcesoMapped } from '../../../shared/api/comprasApi'
import type { SubastaMapped } from '../../../shared/api/subastasApi'
import { getErrorMessage } from '../../../shared/query/queryClient'
import { procesosKeys } from '../../compras/data/procesosData'
import {
  cerrarSubastaMutation,
  obtenerSubastaProcesoQuery,
  simularLanceMutation,
  subastaKeys,
} from '../data/subastaData'

interface UseSubastaParams {
  tenantId?: string | null
  procesoId?: string | null
}

export function useSubasta({ tenantId, procesoId }: UseSubastaParams) {
  const queryClient = useQueryClient()
  const [manualError, setManualError] = useState('')
  const [restante, setRestante] = useState<number | null>(null)
  const [ahoraMs, setAhoraMs] = useState(() => Date.now())

  const query = useQuery({
    queryKey: subastaKeys.proceso(tenantId, procesoId),
    queryFn: () => obtenerSubastaProcesoQuery({ tenantId: tenantId ?? '', procesoId: procesoId ?? '' }),
    enabled: Boolean(tenantId && procesoId),
  })

  const invalidateSubasta = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: subastaKeys.proceso(tenantId, procesoId) }),
      queryClient.invalidateQueries({ queryKey: procesosKeys.lists() }),
      queryClient.invalidateQueries({ queryKey: procesosKeys.detail(tenantId, procesoId) }),
    ])
  }

  const simularMutation = useMutation({
    mutationFn: simularLanceMutation,
    onSuccess: async (subasta) => {
      queryClient.setQueryData(subastaKeys.proceso(tenantId, procesoId), (actual: { proceso: ProcesoMapped; subasta: SubastaMapped } | undefined) =>
        actual ? { ...actual, subasta } : actual,
      )
      await invalidateSubasta()
    },
  })

  const cerrarMutation = useMutation({
    mutationFn: cerrarSubastaMutation,
    onSuccess: invalidateSubasta,
  })

  const proceso = query.data?.proceso ?? null
  const subasta = query.data?.subasta ?? null

  useEffect(() => {
    if (!subasta) return undefined

    const inicio = new Date(subasta.inicioISO).getTime()
    const cierre = new Date(subasta.finISO).getTime()
    const tick = () => {
      const ahora = Date.now()
      setAhoraMs(ahora)
      setRestante(ahora < inicio ? inicio - ahora : cierre - ahora)
    }

    tick()
    const intervalo = setInterval(tick, 1000)
    return () => clearInterval(intervalo)
  }, [subasta])

  async function simularNuevoLance() {
    setManualError('')
    if (!tenantId || !procesoId) return
    await simularMutation.mutateAsync({ tenantId, procesoId })
  }

  async function cerrar() {
    setManualError('')
    if (!tenantId || !procesoId) return
    await cerrarMutation.mutateAsync({ tenantId, procesoId })
  }

  const error = manualError || getErrorMessage(simularMutation.error ?? cerrarMutation.error ?? query.error, '')

  return {
    proceso,
    subasta,
    cargando: query.isLoading || query.isFetching,
    error,
    setError: setManualError,
    restante,
    ahoraMs,
    recargar: query.refetch,
    simularNuevoLance,
    cerrar,
  }
}
