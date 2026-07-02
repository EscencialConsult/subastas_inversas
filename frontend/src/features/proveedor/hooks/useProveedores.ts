import { useQuery } from '@tanstack/react-query'
import type { ProveedorMapped } from '../../../shared/api/proveedoresApi'
import { getErrorMessage } from '../../../shared/query/queryClient'
import { listarProveedoresQuery, proveedoresKeys } from '../data/proveedoresData'

interface UseProveedoresParams {
  tenantId?: string | null
  busqueda?: string
  estado?: string
  rubro?: string
  provincia?: string
  localidad?: string
  cercania?: string
  soloVerificados?: boolean
  enabled?: boolean
}

export function useProveedores({
  tenantId,
  busqueda = '',
  estado = '',
  rubro = '',
  provincia = '',
  localidad = '',
  cercania = '',
  soloVerificados = false,
  enabled = true,
}: UseProveedoresParams = {}) {
  const params = {
    tenantId,
    busqueda,
    estado,
    rubro,
    provincia,
    localidad,
    cercania,
    soloVerificados,
  }

  const query = useQuery({
    queryKey: proveedoresKeys.list(params),
    queryFn: () => listarProveedoresQuery(params),
    enabled: Boolean(enabled && tenantId),
    placeholderData: (previousData) => previousData,
  })

  return {
    proveedores: (query.data ?? []) as ProveedorMapped[],
    cargando: query.isLoading || query.isFetching,
    error: getErrorMessage(query.error, ''),
    setError: () => undefined,
    recargar: query.refetch,
  }
}
