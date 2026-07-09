export interface ProcesoAudit {
  id?: string
  codigo?: string
  titulo?: string
  descripcion?: string
  presupuestoEstimado?: number
  creadoEn?: string
  compradorId?: string
  estado?: string
  specificationsHash?: string
  items?: Array<{
    id?: string
    description?: string
    quantity?: number
    unit?: string
    estimatedUnitPrice?: number
  }>
  adjudicacion?: {
    proveedor?: string
    monto?: number
    compradorId?: string
    fecha?: string
  } | null
  aprobacion?: {
    estado?: string
    autoridadId?: string
    fecha?: string
    motivo?: string
  } | null
  isEvaluationActSigned?: boolean
  evaluationActSignedByName?: string
  evaluationActSignedAtUtc?: string
  evaluationActHash?: string
  evaluationActSignature?: string
}

export interface SubastaAudit {
  precioBase?: number
  lances?: Array<{ id?: string; proveedor?: string; monto?: number }>
  inicioISO?: string
}

export interface InvitacionAudit {
  id?: string
  proveedor?: string
  cuit?: string
  estado?: string
  rejectionReason?: string
}

export interface AlertaRiesgo {
  codigo?: string
  mensaje?: string
  severidad?: string
  detectadaEn?: string
  valor?: number | null
  unidad?: string
}

export interface SupplierEval {
  id?: string
  supplierName?: string
  totalWeightedScore?: number | null
  isExcluded?: boolean
  excludedReason?: string
  evaluatedAtUtc?: string
}

export interface AuditoriaDetailSectionsProps {
  proceso: ProcesoAudit
  subasta: SubastaAudit | null | undefined
  invitaciones: InvitacionAudit[]
  evalResults: {
    criteria?: Array<{ type?: string; name?: string; weight?: number }>
    supplierEvaluations?: SupplierEval[]
  } | null
  alertasRiesgo: AlertaRiesgo[]
  nombres: Record<string, string>
}
