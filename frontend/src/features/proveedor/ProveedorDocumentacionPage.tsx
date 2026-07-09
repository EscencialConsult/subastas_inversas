import { useMemo, useState } from 'react'
import type { Dispatch, FormEvent, SetStateAction } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { UploadCloud } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import type { DocumentoProveedorMapped } from '../../shared/api/proveedoresApi'
import { getErrorMessage } from '../../shared/query/queryClient'
import { Alert } from '../../shared/ui/Alert'
import { Badge } from '../../shared/ui/Badge'
import { Button } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'
import { EmptyState } from '../../shared/ui/EmptyState'
import { FilePicker } from '../../shared/ui/FilePicker'
import { FormActions } from '../../shared/ui/FormActions'
import { Input } from '../../shared/ui/Input'
import { PageHeader } from '../../shared/ui/PageHeader'
import { PageShell } from '../../shared/ui/PageShell'
import { Select } from '../../shared/ui/Select'
import { Spinner } from '../../shared/ui/Spinner'
import { Textarea } from '../../shared/ui/Textarea'
import {
  abrirDocumentoProveedorMutation,
  proveedorHomeQuery,
  proveedoresKeys,
  subsanarDocumentoProveedorMutation,
  subirDocumentoProveedorMutation,
} from './data/proveedoresData'

const TIPOS_DOCUMENTO = [
  { valor: 'CuitCertificate', texto: 'Constancia CUIT/CUIL' },
  { valor: 'TaxCertificate', texto: 'Certificado fiscal' },
  { valor: 'LegalDocument', texto: 'Documento legal' },
  { valor: 'Other', texto: 'Otro' },
]

const DICTAMEN_DOCUMENTO = {
  aprobado: { texto: 'Aprobado', variant: 'success' as const },
  rechazado: { texto: 'Rechazado', variant: 'error' as const },
  aprobado_con_excepcion: { texto: 'Aprobado con excepcion', variant: 'warning' as const },
}

const ESTADO_DOCUMENTO = {
  vigente: { texto: 'Vigente', variant: 'success' as const },
  pendiente: { texto: 'Pendiente de dictamen', variant: 'warning' as const },
  observado: { texto: 'Observado', variant: 'warning' as const },
  vencido: { texto: 'Vencido / rechazado', variant: 'error' as const },
}

export function ProveedorDocumentacionPage() {
  const { usuario } = useAuth()
  const queryClient = useQueryClient()
  const [subsanandoId, setSubsanandoId] = useState<string | null>(null)
  const [abriendoDocumentoId, setAbriendoDocumentoId] = useState<string | null>(null)
  const [errorDocumento, setErrorDocumento] = useState('')
  const [subsanaciones, setSubsanaciones] = useState<Record<string, string>>({})
  const [filePickerKey, setFilePickerKey] = useState(0)
  const [formDocumento, setFormDocumento] = useState({
    tipo: 'CuitCertificate',
    venceEl: '',
    archivo: null as File | null,
  })

  const homeQuery = useQuery({
    queryKey: proveedoresKeys.byUser(usuario.id),
    queryFn: () => proveedorHomeQuery({ usuarioId: usuario.id }),
    enabled: Boolean(usuario.id),
  })

  const subirMutation = useMutation({
    mutationFn: subirDocumentoProveedorMutation,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: proveedoresKeys.byUser(usuario.id) })
    },
  })

  const subsanarMutation = useMutation({
    mutationFn: subsanarDocumentoProveedorMutation,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: proveedoresKeys.byUser(usuario.id) })
    },
  })

  const abrirDocumentoMutation = useMutation({
    mutationFn: abrirDocumentoProveedorMutation,
  })

  const proveedor = homeQuery.data?.proveedor
  const documentos = useMemo(() => homeQuery.data?.documentos ?? [], [homeQuery.data?.documentos])

  const grupos = useMemo(() => agruparDocumentos(documentos), [documentos])

  if (homeQuery.isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    )
  }

  const error = getErrorMessage(homeQuery.error, '')
  if (error || !proveedor) return <Alert variant="error">{error || 'No se encontro el proveedor.'}</Alert>

  async function manejarSubmitDocumento(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorDocumento('')

    if (!formDocumento.archivo) {
      setErrorDocumento('Selecciona un PDF para cargar.')
      return
    }

    if (!formDocumento.venceEl) {
      setErrorDocumento('Indica la fecha de vencimiento.')
      return
    }

    try {
      await subirMutation.mutateAsync({
        proveedorId: proveedor.id,
        tipo: formDocumento.tipo,
        archivo: formDocumento.archivo,
        venceEl: formDocumento.venceEl,
      })

      setFormDocumento({
        tipo: 'CuitCertificate',
        venceEl: '',
        archivo: null,
      })
      setFilePickerKey((actual) => actual + 1)
    } catch (err) {
      setErrorDocumento(getErrorMessage(err))
    }
  }

  async function manejarSubsanacion(documentoId: string) {
    const notas = subsanaciones[documentoId]?.trim()
    if (!notas) {
      setErrorDocumento('Escribe una nota de subsanacion.')
      return
    }

    setSubsanandoId(documentoId)
    setErrorDocumento('')
    try {
      await subsanarMutation.mutateAsync({
        documentoId,
        proveedorId: proveedor.id,
        notes: notas,
      })
      setSubsanaciones((actual) => ({ ...actual, [documentoId]: '' }))
    } catch (err) {
      setErrorDocumento(getErrorMessage(err))
    } finally {
      setSubsanandoId(null)
    }
  }

  async function abrirDocumento(documentoId: string) {
    setAbriendoDocumentoId(documentoId)
    try {
      await abrirDocumentoMutation.mutateAsync({ documentoId })
    } catch (err) {
      setErrorDocumento(getErrorMessage(err))
    } finally {
      setAbriendoDocumentoId(null)
    }
  }

  return (
    <PageShell as="section" width="wide" className="px-0 py-0">
      <PageHeader
        title="Documentacion"
        description="Gestiona la documentacion fiscal y legal de tu empresa: carga nuevos archivos, revisa observaciones y realiza subsanaciones."
      />

      <Card hover={false} padding="md" className="space-y-4">
        <div className="flex items-center gap-2 text-lg font-semibold text-text">
          <UploadCloud size={18} />
          Cargar documentacion
        </div>
        <form className="grid gap-4 rounded-md border border-border bg-background p-4" onSubmit={manejarSubmitDocumento}>
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Tipo"
              name="tipo"
              value={formDocumento.tipo}
              onChange={(event) => setFormDocumento((actual) => ({ ...actual, tipo: event.target.value }))}
            >
              {TIPOS_DOCUMENTO.map((tipo) => (
                <option key={tipo.valor} value={tipo.valor}>
                  {tipo.texto}
                </option>
              ))}
            </Select>

            <Input
              label="Vencimiento"
              name="venceEl"
              type="date"
              value={formDocumento.venceEl}
              onChange={(event) => setFormDocumento((actual) => ({ ...actual, venceEl: event.target.value }))}
            />
          </div>

          <FilePicker
            key={filePickerKey}
            label="PDF"
            accept="application/pdf"
            onChange={(archivo) =>
              setFormDocumento((actual) => ({
                ...actual,
                archivo: Array.isArray(archivo) ? archivo[0] ?? null : archivo,
              }))
            }
          />

          <FormActions align="end" className="-mx-4 -mb-4 rounded-b-md">
            <Button type="submit" loading={subirMutation.isPending}>
              Subir documento
            </Button>
          </FormActions>
        </form>

        {errorDocumento && <Alert variant="error">{errorDocumento}</Alert>}
      </Card>

      <DocumentSection
        title="Documentos obligatorios"
        description="Constancia CUIT/CUIL, certificados fiscales y soporte legal."
        documentos={grupos.obligatorios}
        onOpenDocument={abrirDocumento}
        openingDocumentId={abriendoDocumentoId}
        subsanaciones={subsanaciones}
        setSubsanaciones={setSubsanaciones}
        onSubsanar={manejarSubsanacion}
        subsanandoId={subsanandoId}
      />

      <DocumentSection
        title="Observados o con seguimiento"
        description="Documentos pendientes de dictamen, con excepcion o proximos a vencer."
        documentos={grupos.observados}
        onOpenDocument={abrirDocumento}
        openingDocumentId={abriendoDocumentoId}
        subsanaciones={subsanaciones}
        setSubsanaciones={setSubsanaciones}
        onSubsanar={manejarSubsanacion}
        subsanandoId={subsanandoId}
      />

      <DocumentSection
        title="Vencidos o rechazados"
        description="Estos documentos bloquean la habilitacion hasta ser corregidos."
        documentos={grupos.vencidos}
        onOpenDocument={abrirDocumento}
        openingDocumentId={abriendoDocumentoId}
        subsanaciones={subsanaciones}
        setSubsanaciones={setSubsanaciones}
        onSubsanar={manejarSubsanacion}
        subsanandoId={subsanandoId}
      />

      <DocumentSection
        title="Aprobados"
        description="Documentos sin observaciones vigentes al momento de la consulta."
        documentos={grupos.aprobados}
        onOpenDocument={abrirDocumento}
        openingDocumentId={abriendoDocumentoId}
        subsanaciones={subsanaciones}
        setSubsanaciones={setSubsanaciones}
        onSubsanar={manejarSubsanacion}
        subsanandoId={subsanandoId}
      />
    </PageShell>
  )
}

function DocumentSection({
  title,
  description,
  documentos,
  onOpenDocument,
  openingDocumentId,
  subsanaciones,
  setSubsanaciones,
  onSubsanar,
  subsanandoId,
}: {
  title: string
  description: string
  documentos: DocumentoProveedorMapped[]
  onOpenDocument: (documentoId: string) => void
  openingDocumentId: string | null
  subsanaciones: Record<string, string>
  setSubsanaciones: Dispatch<SetStateAction<Record<string, string>>>
  onSubsanar: (documentoId: string) => void
  subsanandoId: string | null
}) {
  return (
    <Card hover={false} padding="md" className="space-y-4">
      <div>
        <h2 className="m-0 text-lg font-semibold text-text">{title}</h2>
        <p className="mb-0 mt-1 text-sm text-text-muted">{description}</p>
      </div>

      {documentos.length === 0 ? (
        <EmptyState title="Sin documentos en esta seccion" description="Todavia no hay archivos para mostrar aca." />
      ) : (
        <div className="space-y-3">
          {documentos.map((documento) => (
            <Card key={documento.id} hover={false} padding="sm" className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-text">{documento.tipoNombre}</div>
                  <div className="text-sm text-text-muted">{documento.nombreArchivo}</div>
                  <div className="text-xs text-text-muted">
                    Vence {formatearFecha(documento.venceEl)} · Hash {documento.hashCorto}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={(ESTADO_DOCUMENTO[obtenerEstadoDocumento(documento)] ?? ESTADO_DOCUMENTO.pendiente).variant}>
                    {(ESTADO_DOCUMENTO[obtenerEstadoDocumento(documento)] ?? ESTADO_DOCUMENTO.pendiente).texto}
                  </Badge>
                  {documento.dictamen ? (
                    <Badge variant={(DICTAMEN_DOCUMENTO[documento.dictamen] ?? DICTAMEN_DOCUMENTO.aprobado).variant}>
                      {(DICTAMEN_DOCUMENTO[documento.dictamen] ?? DICTAMEN_DOCUMENTO.aprobado).texto}
                    </Badge>
                  ) : (
                    <Badge variant="neutral">Sin dictamen</Badge>
                  )}
                </div>
              </div>

              {documento.revisiones.length > 0 && (
                <div className="rounded-md border border-border bg-background p-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-text-muted">Ultimas revisiones</div>
                  <div className="mt-2 space-y-2">
                    {documento.revisiones.slice(-3).reverse().map((revision) => (
                      <div key={revision.id} className="text-sm text-text-muted">
                        <span className="font-medium text-text">
                          {String(revision.accion === 0 ? 'Observacion' : revision.accion === 1 ? 'Subsanacion' : 'Dictamen')}
                        </span>
                        {' · '}
                        {revision.notas || 'Sin notas'}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <Textarea
                  rows={2}
                  value={subsanaciones[documento.id] ?? ''}
                  onChange={(event) =>
                    setSubsanaciones((actual) => ({
                      ...actual,
                      [documento.id]: event.target.value,
                    }))
                  }
                  placeholder="Responder observacion o dejar aclaracion para el evaluador"
                  fieldClassName="mb-0"
                />
                <div className="flex flex-wrap items-end gap-2">
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => onOpenDocument(documento.id)}
                    loading={openingDocumentId === documento.id}
                  >
                    Ver PDF
                  </Button>
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() => onSubsanar(documento.id)}
                    loading={subsanandoId === documento.id}
                  >
                    Subsanar
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Card>
  )
}

function agruparDocumentos(documentos: DocumentoProveedorMapped[]) {
  const obligatorios = documentos.filter((documento) =>
    ['Constancia CUIT/CUIL', 'Certificado fiscal', 'Documento legal'].includes(documento.tipoNombre))
  const observados = documentos.filter((documento) => obtenerEstadoDocumento(documento) === 'observado' || obtenerEstadoDocumento(documento) === 'pendiente')
  const vencidos = documentos.filter((documento) => obtenerEstadoDocumento(documento) === 'vencido')
  const aprobados = documentos.filter((documento) => obtenerEstadoDocumento(documento) === 'vigente')

  return { obligatorios, observados, vencidos, aprobados }
}

function obtenerEstadoDocumento(documento: DocumentoProveedorMapped) {
  if (documento.estado === 'vencido' || documento.dictamen === 'rechazado') return 'vencido'
  if (documento.dictamen == null) return 'pendiente'
  if (documento.estado === 'por_vencer' || documento.dictamen === 'aprobado_con_excepcion') return 'observado'
  return 'vigente'
}

function formatearFecha(fechaIso?: string | null) {
  if (!fechaIso) return '---'
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'short' }).format(new Date(String(fechaIso)))
}
