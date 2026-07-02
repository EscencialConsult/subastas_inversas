import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type AccessLogMapped,
  type ExportSignedCsvMapped,
  type IntegrityVerificationMapped,
  type RiskAlertMapped,
  type RiskDashboardMapped,
} from '../../../shared/api/auditoriaApi'
import type { ProcesoMapped } from '../../../shared/api/comprasApi'
import { getErrorMessage } from '../../../shared/query/queryClient'
import {
  auditoriaKeys,
  auditoriaQuery,
  exportarAuditoriaMutation,
  verificarIntegridadMutation,
} from '../data/auditoriaData'

interface UseAuditoriaParams {
  tenantId?: string | null
  busqueda?: string
  estado?: string
  emailAcceso?: string
  exitoAcceso?: string
  severidadAlerta?: string
  debounceMs?: number
}

export function useAuditoria({
  tenantId,
  busqueda = '',
  estado = '',
  emailAcceso = '',
  exitoAcceso = '',
  severidadAlerta = '',
  debounceMs = 250,
}: UseAuditoriaParams) {
  const queryClient = useQueryClient()
  const [manualError, setManualError] = useState('')
  const [debouncedFilters, setDebouncedFilters] = useState({
    busqueda,
    estado,
    emailAcceso,
    exitoAcceso,
    severidadAlerta,
  })

  useEffect(() => {
    const t = setTimeout(
      () => setDebouncedFilters({ busqueda, estado, emailAcceso, exitoAcceso, severidadAlerta }),
      debounceMs,
    )
    return () => clearTimeout(t)
  }, [busqueda, debounceMs, emailAcceso, estado, exitoAcceso, severidadAlerta])

  const params = { tenantId, ...debouncedFilters }
  const query = useQuery({
    queryKey: auditoriaKeys.list(params),
    queryFn: () => auditoriaQuery(params),
    enabled: Boolean(tenantId),
    placeholderData: (previousData) => previousData,
  })

  const integridadMutation = useMutation({
    mutationFn: verificarIntegridadMutation,
    onSuccess: async (resultado) => {
      queryClient.setQueryData(auditoriaKeys.integrity(tenantId), resultado)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: auditoriaKeys.panel(tenantId) }),
        queryClient.invalidateQueries({ queryKey: auditoriaKeys.list(params) }),
      ])
    },
  })

  const exportarMutation = useMutation({
    mutationFn: exportarAuditoriaMutation,
  })

  async function ejecutarVerificacionIntegridad() {
    setManualError('')
    if (!tenantId) return
    await integridadMutation.mutateAsync({ tenantId })
  }

  async function exportarCsvFirmado(): Promise<ExportSignedCsvMapped | null> {
    setManualError('')
    if (!tenantId) return null
    try {
      return await exportarMutation.mutateAsync({ tenantId })
    } catch (err) {
      setManualError(getErrorMessage(err))
      return null
    }
  }

  const data = query.data
  const error = manualError || getErrorMessage(integridadMutation.error ?? exportarMutation.error ?? query.error, '')

  return {
    procesos: (data?.procesos ?? []) as ProcesoMapped[],
    accesos: (data?.accesos ?? []) as AccessLogMapped[],
    alertas: (data?.alertas ?? []) as RiskAlertMapped[],
    panelRiesgo: (data?.panelRiesgo ?? null) as RiskDashboardMapped | null,
    integridad: (integridadMutation.data ?? queryClient.getQueryData(auditoriaKeys.integrity(tenantId)) ?? null) as IntegrityVerificationMapped | null,
    cargando: query.isLoading || query.isFetching,
    verificandoIntegridad: integridadMutation.isPending,
    exportandoCsv: exportarMutation.isPending,
    error,
    setError: setManualError,
    recargar: query.refetch,
    ejecutarVerificacionIntegridad,
    exportarCsvFirmado,
  }
}
