import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../auth/AuthContext'
import { Alert } from '../../../shared/ui/Alert'
import { Spinner } from '../../../shared/ui/Spinner'
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

export function EvaluacionProcesoPage() {
  const { id } = useParams<{ id: string }>()
  const { tenantId, usuario } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [criteria, setCriteria] = useState<any[]>([])
  const [scores, setScores] = useState<Record<string, string>>({})
  const [pasaronExcluyentes, setPasaronExcluyentes] = useState<Record<string, boolean>>({})
  const [notas, setNotas] = useState<Record<string, string>>({})
  const [results, setResults] = useState<any>(null)
  const [validationError, setValidationError] = useState('')
  const [editandoCriterios, setEditandoCriterios] = useState(false)
  const [criteriaForm, setCriteriaForm] = useState<any[]>([])

  const evaluacionQuery = useQuery({
    queryKey: evaluacionKeys.detail(tenantId, id),
    queryFn: () => evaluacionProcesoQuery({ tenantId, procesoId: id }),
    enabled: Boolean(tenantId && id),
  })

  const evaluarMutation = useMutation({
    mutationFn: evaluarProveedoresMutation,
    onSuccess: async (data) => {
      setResults(data)
      await queryClient.invalidateQueries({ queryKey: evaluacionKeys.detail(tenantId, id) })
    },
  })

  const guardarCriteriosMutation = useMutation({
    mutationFn: guardarCriteriosEvaluacionMutation,
    onSuccess: async (data) => {
      setCriteria(data)
      setCriteriaForm(toCriteriaForm(data))
      initEmptyScores(data)
      setEditandoCriterios(false)
      await queryClient.invalidateQueries({ queryKey: evaluacionKeys.detail(tenantId, id) })
    },
  })

  function initEmptyScores(criteriaList: any[]) {
    const initialScores: Record<string, string> = {}
    const initialPasaron: Record<string, boolean> = {}
    const initialNotas: Record<string, string> = {}
    for (const criterion of criteriaList) {
      initialScores[criterion.id] = ''
      initialPasaron[criterion.id] = true
      initialNotas[criterion.id] = ''
    }
    setScores(initialScores)
    setPasaronExcluyentes(initialPasaron)
    setNotas(initialNotas)
  }

  function initScores(existingResults: any) {
    const initialScores: Record<string, string> = {}
    const initialPasaron: Record<string, boolean> = {}
    const initialNotas: Record<string, string> = {}

    for (const criterion of existingResults.criteria ?? []) {
      initialScores[criterion.id] = ''
      initialPasaron[criterion.id] = true
      initialNotas[criterion.id] = ''
    }

    if (existingResults.supplierEvaluations?.length > 0) {
      const firstEval = existingResults.supplierEvaluations[0]
      for (const result of firstEval.criterionResults ?? []) {
        if (result.criterionType === 'Weighted') {
          initialScores[result.evaluationCriterionId] = result.score ?? ''
        } else {
          initialPasaron[result.evaluationCriterionId] = result.passed
        }
        initialNotas[result.evaluationCriterionId] = result.notes ?? ''
      }
    }

    setScores(initialScores)
    setPasaronExcluyentes(initialPasaron)
    setNotas(initialNotas)
  }

  useEffect(() => {
    if (!evaluacionQuery.data) return
    const criteriaList = evaluacionQuery.data.criteria ?? []
    setResults(evaluacionQuery.data.results)
    setCriteria(criteriaList)
    setCriteriaForm(toCriteriaForm(criteriaList))
    if (evaluacionQuery.data.results) initScores(evaluacionQuery.data.results)
    else initEmptyScores(criteriaList)
  }, [evaluacionQuery.data])

  const proceso = evaluacionQuery.data?.proceso ?? null
  const subasta = evaluacionQuery.data?.subasta ?? null

  const postores: Array<{ id: string; name: string; monto: number }> = subasta?.lances
    ? ([...new Map<string, { id: string; name: string; monto: number }>(
      subasta.lances.map((lance: any) => [lance.proveedorId || lance.proveedor, { id: lance.proveedorId || lance.proveedor, name: lance.proveedor, monto: lance.monto }])
    ).values()] as Array<{ id: string; name: string; monto: number }>)
      .sort((left, right) => left.monto - right.monto)
    : []

  const exclusionaryCriteria = criteria.filter(criterion => criterion.type === 'Exclusionary')
  const weightedCriteria = criteria.filter(criterion => criterion.type === 'Weighted')

  function handleScoreChange(criterionId: string, supplierId: string, value: string) {
    setScores(prev => ({ ...prev, [`${supplierId}_${criterionId}`]: value }))
  }

  function handlePassedChange(criterionId: string, supplierId: string, passed: boolean) {
    setPasaronExcluyentes(prev => ({ ...prev, [`${supplierId}_${criterionId}`]: passed }))
  }

  function getScore(criterionId: string, supplierId: string) {
    return scores[`${supplierId}_${criterionId}`] ?? ''
  }

  function getPassed(criterionId: string, supplierId: string) {
    return pasaronExcluyentes[`${supplierId}_${criterionId}`] ?? true
  }

  function getNotes(criterionId: string, supplierId: string) {
    return notas[`${supplierId}_${criterionId}`] ?? ''
  }

  function isSupplierExcluded(supplierId: string) {
    return exclusionaryCriteria.some(criterion => !getPassed(criterion.id, supplierId))
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

  async function guardarEvaluacion(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || !id || !usuario) return
    setValidationError('')

    try {
      const supplierEvaluations = postores.map(supplier => ({
        supplierId: supplier.id,
        results: [
          ...exclusionaryCriteria.map(criterion => ({
            evaluationCriterionId: criterion.id,
            score: null,
            passed: getPassed(criterion.id, supplier.id),
            notes: getNotes(criterion.id, supplier.id) || null,
          })),
          ...weightedCriteria.map(criterion => ({
            evaluationCriterionId: criterion.id,
            score: parseFloat(getScore(criterion.id, supplier.id)) || null,
            passed: true,
            notes: getNotes(criterion.id, supplier.id) || null,
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
    setCriteriaForm(prev => [...prev, {
      id: null,
      name: '',
      description: '',
      type: tipo,
      weight: tipo === 'Weighted' ? 0 : 0,
      sortOrder: prev.length + 1,
      _new: true,
    }])
  }

  function actualizarCriterioForm(idx: number, field: string, value: unknown) {
    setCriteriaForm(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
      return next
    })
  }

  function quitarCriterioForm(idx: number) {
    setCriteriaForm(prev => prev.filter((_, index) => index !== idx))
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
          id: criterion.id,
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

  if (evaluacionQuery.isLoading) return <div className="flex justify-center py-12"><Spinner /></div>
  const guardando = evaluarMutation.isPending || guardarCriteriosMutation.isPending
  const error = validationError || getErrorMessage(evaluacionQuery.error ?? evaluarMutation.error ?? guardarCriteriosMutation.error, '')
  if (!proceso) return <Alert variant="error">{error}</Alert>

  if (results && !editandoCriterios) {
    return (
      <EvaluacionCompletadaSection
        proceso={proceso}
        onBack={() => navigate('/evaluacion')}
        onEdit={() => {
          setResults(null)
          setEditandoCriterios(true)
        }}
      />
    )
  }

  return (
    <section className="space-y-6">
      <div className="encabezado">
        <h1>Evaluar Proveedores · <code>{proceso.codigo}</code></h1>
        <button className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60" onClick={() => navigate('/evaluacion')}>Volver</button>
      </div>

      <p className="proceso__descripcion">{proceso.titulo}</p>
      {error && <Alert variant="error">{error}</Alert>}

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
        <Alert variant="info" className="mt-4">No hay postores en la subasta para evaluar.</Alert>
      )}
    </section>
  )
}

function toCriteriaForm(criteriaList: any[]) {
  return criteriaList.map(criterion => ({
    id: criterion.id,
    name: criterion.name,
    description: criterion.description || '',
    type: criterion.type,
    weight: criterion.weight,
    sortOrder: criterion.sortOrder,
  }))
}
