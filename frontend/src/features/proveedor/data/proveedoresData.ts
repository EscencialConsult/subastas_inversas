import {
  dictaminarDocumentoProveedor,
  eliminarProveedor,
  habilitarProveedorEmpresa,
  abrirDocumentoProveedor,
  listarDocumentosProveedor,
  listarHistorialArcaProveedor,
  listarInvitacionesDeProveedor,
  listarProveedores,
  listarProveedoresParaAuditoria,
  listarProveedoresParaEvaluacion,
  listarSubastasProveedor,
  obtenerSubastaProveedor,
  observarDocumentoProveedor,
  registrarProveedor,
  reintentarVerificacionArcaProveedor,
  realizarLance,
  obtenerProveedorDeUsuario,
  responderInvitacion,
  subsanarDocumentoProveedor,
  subirDocumentoProveedor,
  type LanceMapped,
  type ListarProveedoresQueryParams,
  type RegistrarProveedorInput,
  type HabilitarProveedorEmpresaInput,
} from '../../../shared/api/proveedoresApi'

export const proveedoresKeys = {
  all: ['proveedores'] as const,
  lists: () => [...proveedoresKeys.all, 'list'] as const,
  list: (params: ListarProveedoresQueryParams & { soloVerificados?: boolean }) =>
    [...proveedoresKeys.lists(), params] as const,
  byUser: (usuarioId?: string | null) => [...proveedoresKeys.all, 'by-user', usuarioId ?? ''] as const,
  documents: (proveedorId?: string | null) => [...proveedoresKeys.all, 'documents', proveedorId ?? ''] as const,
  opportunities: (proveedorId?: string | null) => [...proveedoresKeys.all, 'opportunities', proveedorId ?? ''] as const,
  supplierAuction: (usuarioId?: string | null, auctionId?: string | null) =>
    [...proveedoresKeys.all, 'supplier-auction', usuarioId ?? '', auctionId ?? ''] as const,
  evaluationList: (params: ListarProveedoresQueryParams) => [...proveedoresKeys.all, 'evaluation-list', params] as const,
  arcaHistory: (proveedorId?: string | null) => [...proveedoresKeys.all, 'arca-history', proveedorId ?? ''] as const,
}

export function listarHistorialArcaProveedorQuery({ proveedorId }: { proveedorId?: string | null }) {
  return listarHistorialArcaProveedor({ proveedorId: proveedorId ?? '' })
}

export async function listarProveedoresQuery(params: ListarProveedoresQueryParams & { soloVerificados?: boolean }) {
  const lista = await listarProveedores(params)
  return params.soloVerificados ? lista.filter((p) => p.estado === 'verificado') : lista
}

export function obtenerProveedorDeUsuarioQuery({ usuarioId }: { usuarioId?: string | null }) {
  return obtenerProveedorDeUsuario({ usuarioId: usuarioId ?? '' })
}

export function listarDocumentosProveedorQuery({ proveedorId }: { proveedorId?: string | null }) {
  return listarDocumentosProveedor({ proveedorId: proveedorId ?? '' })
}

export function abrirDocumentoProveedorMutation(params: { documentoId: string }) {
  return abrirDocumentoProveedor(params)
}

export async function proveedorHomeQuery({ usuarioId }: { usuarioId?: string | null }) {
  const proveedor = await obtenerProveedorDeUsuarioQuery({ usuarioId })
  const documentos = await listarDocumentosProveedorQuery({ proveedorId: proveedor.id })
  return { proveedor, documentos }
}

export async function oportunidadesProveedorQuery({ usuarioId }: { usuarioId?: string | null }) {
  const proveedor = await obtenerProveedorDeUsuarioQuery({ usuarioId })
  const [invitaciones, subastas] = await Promise.all([
    listarInvitacionesDeProveedor({ proveedorId: proveedor.id }),
    listarSubastasProveedor({ proveedorId: proveedor.id }),
  ])
  return { proveedor, invitaciones, subastas }
}

export async function proveedorSubastaLiveQuery({
  usuarioId,
  auctionId,
}: {
  usuarioId?: string | null
  auctionId?: string | null
}) {
  const proveedor = await obtenerProveedorDeUsuarioQuery({ usuarioId })
  const subasta = await obtenerSubastaProveedor({ proveedorId: proveedor.id, auctionId: auctionId ?? '' })
  return { proveedor, subasta }
}

export function subirDocumentoProveedorMutation(params: { proveedorId: string; tipo: number | string; archivo: File; venceEl: string }) {
  return subirDocumentoProveedor(params)
}

export function registrarProveedorMutation(params: { datos: RegistrarProveedorInput }) {
  return registrarProveedor(params)
}

export function subsanarDocumentoProveedorMutation(params: { documentoId: string; proveedorId: string; notes: string }) {
  return subsanarDocumentoProveedor(params)
}

export function responderInvitacionMutation(params: { invitacionId: string; proveedorId: string; aceptar: boolean; rejectionReason?: string }) {
  return responderInvitacion(params)
}

export function listarProveedoresEvaluacionQuery(params: ListarProveedoresQueryParams = {}) {
  return listarProveedoresParaEvaluacion(params)
}

export function listarProveedoresAuditoriaQuery(params: ListarProveedoresQueryParams = {}) {
  return listarProveedoresParaAuditoria(params)
}

export function observarDocumentoProveedorMutation(params: { documentoId: string; evaluadorId: string; notas: string }) {
  return observarDocumentoProveedor(params)
}

export function dictaminarDocumentoProveedorMutation(params: Parameters<typeof dictaminarDocumentoProveedor>[0]) {
  return dictaminarDocumentoProveedor(params)
}

export function habilitarProveedorEmpresaMutation(params: HabilitarProveedorEmpresaInput) {
  return habilitarProveedorEmpresa(params)
}

export function eliminarProveedorMutation(params: { proveedorId: string }) {
  return eliminarProveedor(params)
}

export function reintentarVerificacionArcaProveedorMutation(params: { proveedorId: string }) {
  return reintentarVerificacionArcaProveedor(params)
}

export function realizarLanceProveedorMutation(params: {
  tenantId: string
  auctionId: string
  supplierId: string
  monto: number
}): Promise<LanceMapped> {
  return realizarLance(params)
}
