import { ReactNode } from 'react'
import { claseEstado, etiquetaEstado } from '../../../domain/compras'
import { Alert } from '../../../shared/ui/Alert'
import { Badge } from '../../../shared/ui/Badge'
import { Collapsible } from '../../../shared/ui/Collapsible'
import { DataTable, type DataTableColumn } from '../../../shared/ui/DataTable'
import { FormSection } from '../../../shared/ui/FormSection'
import { Pagination, usePagination } from '../../../shared/ui/Pagination'
import { AuditoriaTimeline } from './AuditoriaTimeline'
import { AlertasSection } from './AlertasSection'
import { SubastaSection } from './SubastaSection'
import { EvaluacionSection } from './EvaluacionSection'
import type { ProcesoAudit, SubastaAudit, InvitacionAudit, SupplierEval, AuditoriaDetailSectionsProps } from './auditoriaDetailTypes'

function formatearPesos(monto: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(monto)
}

function InfoTerm({ label, value, fullWidth = false }: { label: string; value: ReactNode; fullWidth?: boolean }) {
  return (
    <div className={fullWidth ? 'sm:col-span-2' : ''}>
      <dt className="text-xs font-semibold uppercase text-text-muted">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-text">{value ?? '---'}</dd>
    </div>
  )
}

function TimelineSection({
  proceso,
  subasta,
  invitaciones,
  evalResults,
}: {
  proceso: ProcesoAudit
  subasta: SubastaAudit | null | undefined
  invitaciones: InvitacionAudit[]
  evalResults: { supplierEvaluations?: SupplierEval[] } | null
}) {
  const eventos: Array<{ fecha: string; texto: string; tipo: 'creado' | 'invitacion' | 'subasta' | 'evaluacion' | 'adjudicacion' | 'aprobacion' }> = [
    { fecha: proceso.creadoEn ?? '', texto: 'Proceso creado', tipo: 'creado' },
  ]

  if (invitaciones.length > 0) {
    eventos.push({
      fecha: invitaciones[0].id ?? proceso.creadoEn ?? '',
      texto: `Invitaciones enviadas a ${invitaciones.length} proveedores`,
      tipo: 'invitacion',
    })
  }

  if (subasta) {
    eventos.push({
      fecha: subasta.inicioISO?.slice(0, 10) ?? '',
      texto: `Subasta realizada (${subasta.lances?.length ?? 0} lances)`,
      tipo: 'subasta',
    })
  }

  if (evalResults?.supplierEvaluations?.length) {
    eventos.push({
      fecha: evalResults.supplierEvaluations[0].evaluatedAtUtc?.slice(0, 10) ?? proceso.creadoEn ?? '',
      texto: `Evaluación registrada (${evalResults.supplierEvaluations.filter((e) => !e.isExcluded).length} aptos)`,
      tipo: 'evaluacion',
    })
  }

  if (proceso.adjudicacion) {
    eventos.push({
      fecha: proceso.adjudicacion.fecha ?? '',
      texto: `Adjudicado a ${proceso.adjudicacion.proveedor}`,
      tipo: 'adjudicacion',
    })
  }

  if (proceso.aprobacion) {
    eventos.push({
      fecha: proceso.aprobacion.fecha ?? '',
      texto:
        proceso.aprobacion.estado === 'aprobada'
          ? 'Adjudicación aprobada por la Autoridad'
          : 'Adjudicación rechazada por la Autoridad',
      tipo: 'aprobacion',
    })
  }

  eventos.sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)))

  return (
    <FormSection title="Línea de tiempo">
      <AuditoriaTimeline eventos={eventos} />
    </FormSection>
  )
}

function DatosProcesoSection({ proceso, nombre }: { proceso: ProcesoAudit; nombre: (id: string) => string }) {
  return (
    <FormSection title="Datos del proceso">
      <dl className="grid gap-3 sm:grid-cols-2">
        <InfoTerm label="Título" value={proceso.titulo} fullWidth />
        <InfoTerm label="Descripción" value={proceso.descripcion || '---'} fullWidth />
        <InfoTerm label="Presupuesto estimado" value={formatearPesos(proceso.presupuestoEstimado ?? 0)} />
        <InfoTerm label="Creado el" value={proceso.creadoEn || '---'} />
        <InfoTerm label="Comprador" value={nombre(proceso.compradorId ?? '')} />
        <InfoTerm label="Estado actual" value={<Badge variant={claseEstado(proceso.estado ?? '')}>{etiquetaEstado(proceso.estado ?? '')}</Badge>} />
        {proceso.specificationsHash && (
          <InfoTerm label="Hash de Especificaciones" value={<code>{proceso.specificationsHash}</code>} fullWidth />
        )}
      </dl>
    </FormSection>
  )
}

function ItemsProcesoSection({ items }: { items: ProcesoAudit['items'] }) {
  const itemsArr = items as (NonNullable<ProcesoAudit['items']>[number] & Record<string, unknown>)[]
  const { paginatedItems, setPage, setPageSize, ...paginacion } = usePagination(itemsArr)

  if (!items || items.length === 0) return null

  const columns: Array<DataTableColumn<NonNullable<ProcesoAudit['items']>[number] & Record<string, unknown>>> = [
    { header: 'Descripción', accessor: 'description' },
    { header: 'Cantidad', accessor: 'quantity' },
    { header: 'Unidad', accessor: 'unit' },
    {
      header: 'Precio Unitario Est.',
      cell: (row) => (row.estimatedUnitPrice ? formatearPesos(Number(row.estimatedUnitPrice)) : '---'),
    },
  ]

  return (
    <>
      <DataTable
        columns={columns}
        rows={paginatedItems}
        getRowId={(row) => row.id ?? String(Math.random())}
      />
      <Pagination {...paginacion} onPageChange={setPage} onPageSizeChange={setPageSize} />
    </>
  )
}

function InvitacionesSection({ invitaciones }: { invitaciones: InvitacionAudit[] }) {
  const invitacionesArr = invitaciones as (InvitacionAudit & Record<string, unknown>)[]
  const { paginatedItems, setPage, setPageSize, ...paginacion } = usePagination(invitacionesArr)

  if (invitaciones.length === 0) return null

  function badgePorEstado(estado?: string) {
    switch (estado) {
      case 'pendiente':
        return <Badge variant="warning">Pendiente</Badge>
      case 'aceptada':
        return <Badge variant="success">Aceptada</Badge>
      case 'rechazada':
        return <Badge variant="error">Rechazada</Badge>
      default:
        return <Badge variant="neutral">{estado ?? '---'}</Badge>
    }
  }

  function detallePorEstado(inv: InvitacionAudit) {
    if (inv.estado === 'rechazada' && inv.rejectionReason) {
      return `Rechazado: ${inv.rejectionReason}`
    }
    if (inv.estado === 'aceptada') return 'Confirmado'
    return 'Esperando respuesta'
  }

  const columns: Array<DataTableColumn<InvitacionAudit & Record<string, unknown>>> = [
    { header: 'Proveedor', accessor: 'proveedor' },
    {
      header: 'CUIT',
      cell: (row) => <code>{row.cuit}</code>,
    },
    {
      header: 'Estado',
      cell: (row) => badgePorEstado(row.estado),
    },
    {
      header: 'Detalle',
      cell: (row) => detallePorEstado(row),
    },
  ]

  return (
    <>
      <DataTable
        columns={columns}
        rows={paginatedItems}
        getRowId={(row) => row.id ?? String(Math.random())}
      />
      <Pagination {...paginacion} onPageChange={setPage} onPageSizeChange={setPageSize} />
    </>
  )
}

function AdjudicacionSection({ proceso, nombre }: { proceso: ProcesoAudit; nombre: (id: string) => string }) {
  if (!proceso.adjudicacion) return null

  return (
    <FormSection title="Adjudicación">
      <dl className="grid gap-3 sm:grid-cols-2">
        <InfoTerm label="Adjudicado a" value={proceso.adjudicacion.proveedor ?? '---'} fullWidth />
        <InfoTerm label="Monto" value={formatearPesos(proceso.adjudicacion.monto ?? 0)} />
        <InfoTerm label="Propuesto por" value={nombre(proceso.adjudicacion.compradorId ?? '')} />
        <InfoTerm label="Fecha" value={proceso.adjudicacion.fecha ?? '---'} />
      </dl>
    </FormSection>
  )
}

function AprobacionSection({ proceso, nombre }: { proceso: ProcesoAudit; nombre: (id: string) => string }) {
  if (!proceso.aprobacion) return null

  return (
    <FormSection title="Aprobación de la Autoridad">
      <dl className="grid gap-3 sm:grid-cols-2">
        <InfoTerm
          label="Resultado"
          value={proceso.aprobacion.estado === 'aprobada' ? 'Aprobada' : 'Rechazada'}
        />
        <InfoTerm label="Por" value={nombre(proceso.aprobacion.autoridadId ?? '')} />
        <InfoTerm label="Fecha" value={proceso.aprobacion.fecha ?? '---'} />
        {proceso.aprobacion.motivo && (
          <InfoTerm label="Motivo" value={proceso.aprobacion.motivo} fullWidth />
        )}
      </dl>
    </FormSection>
  )
}

export function AuditoriaDetailSections({
  proceso,
  subasta,
  invitaciones,
  evalResults,
  alertasRiesgo,
  nombres,
}: AuditoriaDetailSectionsProps) {
  const nombre = (idUsuario: string) => nombres[idUsuario] ?? '---'

  return (
    <div className="space-y-6">
      <Alert variant="info">Vista de auditoría: solo lectura. No se puede modificar nada desde acá.</Alert>
      <AlertasSection alertas={alertasRiesgo} />
      <TimelineSection proceso={proceso} subasta={subasta} invitaciones={invitaciones} evalResults={evalResults} />
      <DatosProcesoSection proceso={proceso} nombre={nombre} />

      <Collapsible title={`Items (${proceso.items?.length ?? 0})`}>
        <ItemsProcesoSection items={proceso.items ?? []} />
      </Collapsible>

      <Collapsible title={`Invitaciones (${invitaciones.length})`}>
        <InvitacionesSection invitaciones={invitaciones} />
      </Collapsible>

      <Collapsible title="Subasta">
        <SubastaSection subasta={subasta} />
      </Collapsible>

      <Collapsible title="Evaluación con Criterios">
        <EvaluacionSection evalResults={evalResults} />
      </Collapsible>

      <AdjudicacionSection proceso={proceso} nombre={nombre} />
      <AprobacionSection proceso={proceso} nombre={nombre} />
    </div>
  )
}
