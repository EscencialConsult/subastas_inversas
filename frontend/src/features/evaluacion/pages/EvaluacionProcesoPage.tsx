import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../auth/AuthContext'
import { useToast } from '../../../context/ToastContext'
import { Alert } from '../../../shared/ui/Alert'
import { Button } from '../../../shared/ui/Button'
import { LoadingState } from '../../../shared/ui/StateViews'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { PageShell } from '../../../shared/ui/PageShell'
import { ProgressBar } from '../../../shared/ui/ProgressBar'
import { getErrorMessage } from '../../../shared/query/queryClient'
import {
  CriteriosEvaluacionSection,
  EvaluacionCompletadaSection,
  EvaluacionProveedorFormSection,
} from '../components/EvaluacionProcesoSections'
import {
  evaluacionKeys,
  evaluacionProcesoQuery,
  evaluarProveedoresMutation,
  guardarCriteriosEvaluacionMutation,
} from '../data/evaluacionData'

interface Criterion {
  id: string
  name: string
  description?: string
  type: string
  weight?: number
  sortOrder?: number
}

export function EvaluacionProcesoPage() {
  const { id } = useParams<{ id: string }>()
  const { tenantId, usuario } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()

  const [scores, setScores] = useState<Record<string, string>>({})
  const [pasaronExcluyentes, setPasaronExcluyentes] = useState<Record<string, boolean>>({})
  const [results, setResults] = useState<Record<string, unknown> | null>(null)
  const [validationError, setValidationError] = useState('')
  const [editandoCriterios, setEditandoCriterios] = useState(false)
  const [criteriaForm, setCriteriaForm] = useState<Criterion[]>([])

  function initEmptyScores(criteriaList: Criterion[]) {
    const initialScores: Record<string, string> = {}
    const initialPasaron: Record<string, boolean> = {}
    for (const criterion of criteriaList) {
      initialScores[criterion.id] = ''
      initialPasaron[criterion.id] = true
    }
    setScores(initialScores)
    setPasaronExcluyentes(initialPasaron)
  }

  function initScores(existingResults: Record<string, unknown>) {
    const initialScores: Record<string, string> = {}
    const initialPasaron: Record<string, boolean> = {}

    for (const criterion of (existingResults.criteria as Criterion[]) ?? []) {
      initialScores[criterion.id] = ''
      initialPasaron[criterion.id] = true
    }

    const supplierEvaluations = existingResults.supplierEvaluations as Array<Record<string, unknown>> | undefined
    if (supplierEvaluations?.length > 0) {
      const firstEval = supplierEvaluations[0]
      const criterionResults = firstEval.criterionResults as Array<Record<string, unknown>> | undefined
      for (const result of criterionResults ?? []) {
        if (result.criterionType === 'Weighted') {
          initialScores[result.evaluationCriterionId as string] = (result.score as string) ?? ''
        } else {
          initialPasaron[result.evaluationCriterionId as string] = (result.passed as boolean) ?? true
        }
      }
    }

    setScores(initialScores)
    setPasaronExcluyentes(initialPasaron)
  }

  const evaluacionQuery = useQuery({
    queryKey: evaluacionKeys.detail(tenantId, id),
    queryFn: () => evaluacionProcesoQuery({ tenantId, procesoId: id }),
    enabled: Boolean(tenantId && id),
  })

  const evaluarMutation = useMutation({
    mutationFn: evaluarProveedoresMutation,
    onSuccess: async (data) => {
      setResults(data as unknown as Record<string, unknown>)
      toast.success('Evaluación guardada correctamente.')
      await queryClient.invalidateQueries({ queryKey: evaluacionKeys.detail(tenantId, id) })
    },
  })

  const guardarCriteriosMutation = useMutation({
    mutationFn: guardarCriteriosEvaluacionMutation,
    onSuccess: async (data) => {
      const typedData = data as Criterion[]
      setCriteriaForm(toCriteriaForm(typedData))
      initEmptyScores(typedData)
      setEditandoCriterios(false)
      toast.success('Criterios guardados correctamente.')
      await queryClient.invalidateQueries({ queryKey: evaluacionKeys.detail(tenantId, id) })
    },
  })

  const queryData = evaluacionQuery.data

  const criteria = useMemo(() => (queryData?.criteria ?? []) as Criterion[], [queryData?.criteria])
  const queryResults = queryData?.results ?? null

  useEffect(() => {
    if (!queryData) return
    setResults(queryResults as Record<string, unknown> | null)
    setCriteriaForm(toCriteriaForm(criteria))
    if (queryResults) initScores(queryResults as Record<string, unknown>)
    else initEmptyScores(criteria)
  }, [queryData])

  const proceso = queryData?.proceso ?? null
  const subasta = queryData?.subasta ?? (null as Record<string, unknown> | null)

  const postores = useMemo(() => {
    const lances = subasta?.lances as Array<Record<string, unknown>> | undefined
    if (!lances) return []
    const unique = [...new Map<string, { id: string; name: string; monto: number }>(
      lances.map((lance) => [
        (lance.proveedorId || lance.proveedor) as string,
        { id: (lance.proveedorId || lance.proveedor) as string, name: lance.proveedor as string, monto: lance.monto as number },
      ]),
    ).values()]
    return unique.sort((left, right) => left.monto - right.monto)
  }, [subasta])

  const exclusionaryCriteria = criteria.filter((c) => c.type === 'Exclusionary')
  const weightedCriteria = criteria.filter((c) => c.type === 'Weighted')

  const totalProveedores = postores.length
  const progresoEvaluacion = totalProveedores > 0 && criteria.length > 0
    ? Math.round((Object.keys(scores).length / (totalProveedores * criteria.length)) * 100)
    : 0

  function handleScoreChange(criterionId: string, supplierId: string, value: string) {
    setScores((prev) => ({ ...prev, [`${supplierId}_${criterionId}`]: value }))
  }

  function handlePassedChange(criterionId: string, supplierId: string, passed: boolean) {
    setPasaronExcluyentes((prev) => ({ ...prev, [`${supplierId}_${criterionId}`]: passed }))
  }

  function getScore(criterionId: string, supplierId: string) {
    return scores[`${supplierId}_${criterionId}`] ?? ''
  }

  function getPassed(criterionId: string, supplierId: string) {
    return pasaronExcluyentes[`${supplierId}_${criterionId}`] ?? true
  }

  function isSupplierExcluded(supplierId: string) {
    return exclusionaryCriteria.some((criterion) => !getPassed(criterion.id, supplierId))
  }

  function getSupplierWeightedScore(supplierId: string) {
    let sum = 0
    let appliedWeight = 0
    for (const criterion of weightedCriteria) {
      const value = parseFloat(getScore(criterion.id, supplierId))
      if (!Number.isNaN(value)) {
        sum += value * (criterion.weight ?? 0)
        appliedWeight += criterion.weight ?? 0
      }
    }
    return appliedWeight > 0 ? Math.round((sum / appliedWeight) * 100) / 100 : null
  }

  async function guardarEvaluacion(event: React.FormEvent) {
    event.preventDefault()
    if (!tenantId || !id || !usuario) return
    setValidationError('')

    try {
      const supplierEvaluations = postores.map((supplier) => ({
        supplierId: supplier.id,
        results: [
          ...exclusionaryCriteria.map((criterion) => ({
            evaluationCriterionId: criterion.id,
            score: null,
            passed: getPassed(criterion.id, supplier.id),
            notes: null,
          })),
          ...weightedCriteria.map((criterion) => ({
            evaluationCriterionId: criterion.id,
            score: parseFloat(getScore(criterion.id, supplier.id)) || null,
            passed: true,
            notes: null,
          })),
        ],
      }))

      await evaluarMutation.mutateAsync({
        tenantId,
        procesoId: id,
        evaluatorId: usuario.id,
        supplierEvaluations,
      })
    } catch {
      // El error se muestra desde la mutation.
    }
  }

  function agregarCriterio(tipo: string) {
    setCriteriaForm((prev) => [...prev, {
      id: '',
      name: '',
      description: '',
      type: tipo,
      weight: tipo === 'Weighted' ? 0 : 0,
      sortOrder: prev.length + 1,
    }])
  }

  function actualizarCriterioForm(idx: number, field: string, value: unknown) {
    setCriteriaForm((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
      return next
    })
  }

  function quitarCriterioForm(idx: number) {
    setCriteriaForm((prev) => prev.filter((_, index) => index !== idx))
  }

  async function guardarCriterios() {
    if (!tenantId || !id || !usuario) return
    setValidationError('')
    try {
      await guardarCriteriosMutation.mutateAsync({
        tenantId,
        procesoId: id,
        userId: usuario.id,
        criteria: criteriaForm.map((criterion, index) => ({
          id: criterion.id || null,
          name: criterion.name,
          description: criterion.description || null,
          type: criterion.type,
          weight: Number(criterion.weight) || 0,
          sortOrder: index + 1,
        })),
      })
    } catch {
      // El error se muestra desde la mutation.
    }
  }

  if (evaluacionQuery.isLoading) {
    return <LoadingState label="Cargando proceso..." />
  }

  const guardando = evaluarMutation.isPending || guardarCriteriosMutation.isPending
  const error = validationError || getErrorMessage(evaluacionQuery.error ?? evaluarMutation.error ?? guardarCriteriosMutation.error, '')
  if (!proceso) return <Alert variant="error">{error}</Alert>

  if (results && !editandoCriterios) {
    return (
      <PageShell width="wide">
        <PageHeader
          title={<>Evaluación completada <code>{proceso.codigo}</code></>}
          description={proceso.titulo}
          actions={(
            <Button variant="secondary" onClick={() => navigate('/evaluacion')}>
              Volver
            </Button>
          )}
        />
        <EvaluacionCompletadaSection
          onBack={() => navigate('/evaluacion')}
          onEdit={() => {
            setResults(null)
            setEditandoCriterios(true)
          }}
        />
      </PageShell>
    )
  }

  return (
    <PageShell width="wide">
      <PageHeader
        title={<>Evaluar proveedores <code>{proceso.codigo}</code></>}
        description={proceso.titulo}
        actions={(
          <Button variant="secondary" onClick={() => navigate('/evaluacion')}>
            Volver
          </Button>
        )}
      />
      {error && <Alert variant="error">{error}</Alert>}

      {criteria.length > 0 && postores.length > 0 && (
        <ProgressBar
          value={progresoEvaluacion}
          label="Progreso de evaluación"
          showPercent
          variant={progresoEvaluacion === 100 ? 'success' : 'primary'}
        />
      )}

      <CriteriosEvaluacionSection
        criteria={criteria}
        criteriaForm={criteriaForm}
        exclusionaryCriteria={exclusionaryCriteria}
        weightedCriteria={weightedCriteria}
        editandoCriterios={editandoCriterios}
        guardando={guardando}
        onToggleEdit={() => setEditandoCriterios(!editandoCriterios)}
        onAddCriterion={agregarCriterio}
        onUpdateCriterion={actualizarCriterioForm}
        onRemoveCriterion={quitarCriterioForm}
        onSaveCriteria={guardarCriterios}
      />

      {!editandoCriterios && criteria.length > 0 && postores.length > 0 && (
        <EvaluacionProveedorFormSection
          criteria={criteria}
          postores={postores}
          guardando={guardando}
          onSubmit={guardarEvaluacion}
          getPassed={getPassed}
          getScore={getScore}
          getSupplierWeightedScore={getSupplierWeightedScore}
          isSupplierExcluded={isSupplierExcluded}
          onPassedChange={handlePassedChange}
          onScoreChange={handleScoreChange}
        />
      )}

      {!editandoCriterios && postores.length === 0 && (
        <Alert variant="info">No hay postores en la subasta para evaluar.</Alert>
      )}
    </PageShell>
  )
}

function toCriteriaForm(criteriaList: Criterion[]): Criterion[] {
  return criteriaList.map((criterion) => ({
    id: criterion.id,
    name: criterion.name,
    description: criterion.description || '',
    type: criterion.type,
    weight: criterion.weight,
    sortOrder: criterion.sortOrder,
  }))
}
