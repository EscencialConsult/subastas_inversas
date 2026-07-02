import {
  listarProveedores,
  type ListarProveedoresQueryParams,
} from '../../../shared/api/proveedoresApi'

export const proveedoresKeys = {
  all: ['proveedores'] as const,
  lists: () => [...proveedoresKeys.all, 'list'] as const,
  list: (params: ListarProveedoresQueryParams & { soloVerificados?: boolean }) =>
    [...proveedoresKeys.lists(), params] as const,
}

export async function listarProveedoresQuery(params: ListarProveedoresQueryParams & { soloVerificados?: boolean }) {
  const lista = await listarProveedores(params)
  return params.soloVerificados ? lista.filter((p) => p.estado === 'verificado') : lista
}
