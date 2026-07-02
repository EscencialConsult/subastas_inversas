import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ProcesoMapped } from '../../../shared/api/comprasApi'
import { getErrorMessage } from '../../../shared/query/queryClient'
import { listarProcesosQuery, procesosKeys, publicarProcesoMutation } from '../data/procesosData'

interface UseProcesosParams {
  tenantId?: string | null
  busqueda?: string
  estado?: string
  auditoria?: boolean
  debounceMs?: number
}

export function useProcesos({ tenantId, busqueda = '', estado = '', auditoria = false, debounceMs = 250 }: UseProcesosParams) {
  const queryClient = useQueryClient()
  const [debouncedFilters, setDebouncedFilters] = useState({ busqueda, estado })

  useEffect(() => {
    const t = setTimeout(() => setDebouncedFilters({ busqueda, estado }), debounceMs)
    return () => clearTimeout(t)
  }, [busqueda, debounceMs, estado])

  const queryParams = {
    tenantId: tenantId ?? '',
    busqueda: debouncedFilters.busqueda,
    estado: debouncedFilters.estado,
    auditoria,
  }

  const query = useQuery({
    queryKey: procesosKeys.list(queryParams),
    queryFn: () => listarProcesosQuery(queryParams),
    enabled: Boolean(tenantId),
    placeholderData: (previousData) => previousData,
  })

  const publicarMutation = useMutation({
    mutationFn: publicarProcesoMutation,
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: procesosKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: procesosKeys.detail(variables.tenantId, variables.id) }),
      ])
    },
  })

  async function publicar(id: string) {
    if (!tenantId) return
    await publicarMutation.mutateAsync({ tenantId, id })
  }

  const error = getErrorMessage(publicarMutation.error ?? query.error, '')

  return {
    procesos: (query.data ?? []) as ProcesoMapped[],
    cargando: query.isLoading || query.isFetching,
    error,
    setError: () => undefined,
    recargar: query.refetch,
    publicar,
  }
}
