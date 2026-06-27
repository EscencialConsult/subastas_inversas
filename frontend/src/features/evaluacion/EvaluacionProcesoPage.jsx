import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext.jsx'
import { obtenerProcesoParaEvaluacion } from '../../api/comprasApi.js'
import { obtenerSubastaDeProcesoParaEvaluacion } from '../../api/subastasApi.js'
import {
  obtenerCriteriosEvaluacionParaEvaluador,
  guardarCriteriosEvaluacionParaEvaluador,
  evaluarProveedores,
  obtenerResultadosEvaluacionParaEvaluador,
} from '../../api/comprasApi.js'

export function EvaluacionProcesoPage() {
  const { id } = useParams()
  const { tenantId, usuario } = useAuth()
  const navigate = useNavigate()

  const [proceso, setProceso] = useState(null)
  const [subasta, setSubasta] = useState(null)
  const [criteria, setCriteria] = useState([])
  const [scores, setScores] = useState({})
  const [pasaronExcluyentes, setPasaronExcluyentes] = useState({})
  const [notas, setNotas] = useState({})
  const [results, setResults] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [editandoCriterios, setEditandoCriterios] = useState(false)
  const [criteriaForm, setCriteriaForm] = useState([])

  async function cargar() {
    try {
      const p = await obtenerProcesoParaEvaluacion({ tenantId, id })
      setProceso(p)

      try {
        setSubasta(await obtenerSubastaDeProcesoParaEvaluacion({ tenantId, procesoId: id }))
      } catch {
        setSubasta(null)
      }

      let criteriaList = []
      let existingResults = null

      try {
        existingResults = await obtenerResultadosEvaluacionParaEvaluador({ tenantId, procesoId: id })
        if (existingResults) {
          setResults(existingResults)
          criteriaList = existingResults.criteria
          setCriteria(criteriaList)
          initScores(existingResults)
          return
        }
      } catch { /* no results yet */ }

      try {
        criteriaList = await obtenerCriteriosEvaluacionParaEvaluador({ tenantId, procesoId: id })
      } catch { /* no criteria defined yet */ }

      if (!criteriaList || criteriaList.length === 0) {
        criteriaList = []
      }

      setCriteria(criteriaList)
      setCriteriaForm(criteriaList.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description || '',
        type: c.type,
        weight: c.weight,
        sortOrder: c.sortOrder,
      })))
      initEmptyScores(criteriaList)
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  function initEmptyScores(criteriaList) {
    const initialScores = {}
    const initialPasaron = {}
    const initialNotas = {}
    for (const c of criteriaList) {
      initialScores[c.id] = ''
      initialPasaron[c.id] = true
      initialNotas[c.id] = ''
    }
    setScores(initialScores)
    setPasaronExcluyentes(initialPasaron)
    setNotas(initialNotas)
  }

  function initScores(results) {
    const initialScores = {}
    const initialPasaron = {}
    const initialNotas = {}

    for (const criteria of results.criteria) {
      initialScores[criteria.id] = ''
      initialPasaron[criteria.id] = true
      initialNotas[criteria.id] = ''
    }

    if (results.supplierEvaluations && results.supplierEvaluations.length > 0) {
      const firstEval = results.supplierEvaluations[0]
      for (const r of firstEval.criterionResults) {
        if (r.criterionType === 'Weighted') {
          initialScores[r.evaluationCriterionId] = r.score ?? ''
        } else {
          initialPasaron[r.evaluationCriterionId] = r.passed
        }
        initialNotas[r.evaluationCriterionId] = r.notes ?? ''
      }
    }

    setScores(initialScores)
    setPasaronExcluyentes(initialPasaron)
    setNotas(initialNotas)
  }

  useEffect(() => {
    const t = setTimeout(cargar, 0)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, id])

  const postores = subasta?.lances
    ? [...new Map(subasta.lances.map(l => [l.proveedorId || l.proveedor, { id: l.proveedorId || l.proveedor, name: l.proveedor, monto: l.monto }])).values()]
      .sort((a, b) => a.monto - b.monto)
    : []

  const exclusionaryCriteria = criteria.filter(c => c.type === 'Exclusionary')
  const weightedCriteria = criteria.filter(c => c.type === 'Weighted')

  function handleScoreChange(criterionId, supplierId, value) {
    setScores(prev => ({
      ...prev,
      [`${supplierId}_${criterionId}`]: value
    }))
  }

  function handlePassedChange(criterionId, supplierId, passed) {
    setPasaronExcluyentes(prev => ({
      ...prev,
      [`${supplierId}_${criterionId}`]: passed
    }))
  }

  function getScore(criterionId, supplierId) {
    const key = `${supplierId}_${criterionId}`
    return scores[key] ?? ''
  }

  function getPassed(criterionId, supplierId) {
    const key = `${supplierId}_${criterionId}`
    return pasaronExcluyentes[key] ?? true
  }

  function getNotes(criterionId, supplierId) {
    const key = `${supplierId}_${criterionId}`
    return notas[key] ?? ''
  }

  function isSupplierExcluded(supplierId) {
    for (const c of exclusionaryCriteria) {
      if (!getPassed(c.id, supplierId)) return true
    }
    return false
  }

  function getSupplierWeightedScore(supplierId) {
    let sum = 0
    let appliedWeight = 0
    for (const c of weightedCriteria) {
      const val = parseFloat(getScore(c.id, supplierId))
      if (!isNaN(val)) {
        sum += val * c.weight
        appliedWeight += c.weight
      }
    }
    return appliedWeight > 0 ? Math.round((sum / appliedWeight) * 100) / 100 : null
  }

  async function guardarEvaluacion(e) {
    e.preventDefault()
    setError('')
    setGuardando(true)

    try {
      const supplierEvaluations = postores.map(s => ({
        supplierId: s.id,
        results: [
          ...exclusionaryCriteria.map(c => ({
            evaluationCriterionId: c.id,
            score: null,
            passed: getPassed(c.id, s.id),
            notes: getNotes(c.id, s.id) || null,
          })),
          ...weightedCriteria.map(c => ({
            evaluationCriterionId: c.id,
            score: parseFloat(getScore(c.id, s.id)) || null,
            passed: true,
            notes: getNotes(c.id, s.id) || null,
          })),
        ],
      }))

      const data = await evaluarProveedores({
        tenantId,
        procesoId: id,
        evaluatorId: usuario.id,
        supplierEvaluations,
      })

      setResults(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  function agregarCriterio(tipo) {
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

  function actualizarCriterioForm(idx, field, value) {
    setCriteriaForm(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
      return next
    })
  }

  function quitarCriterioForm(idx) {
    setCriteriaForm(prev => prev.filter((_, i) => i !== idx))
  }

  async function guardarCriterios() {
    setError('')
    setGuardando(true)
    try {
      const data = await guardarCriteriosEvaluacionParaEvaluador({
        tenantId,
        procesoId: id,
        userId: usuario.id,
        criteria: criteriaForm.map((c, i) => ({
          id: c.id,
          name: c.name,
          description: c.description || null,
          type: c.type,
          weight: Number(c.weight) || 0,
          sortOrder: i + 1,
        })),
      })
      setCriteria(data)
      setCriteriaForm(data.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description || '',
        type: c.type,
        weight: c.weight,
        sortOrder: c.sortOrder,
      })))
      initEmptyScores(data)
      setEditandoCriterios(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) return <p className="estado-cargando">Cargando...</p>
  if (!proceso) return <div className="alerta alerta--error">{error}</div>

  if (results && !editandoCriterios) {
    return (
      <section className="form-pagina">
        <div className="encabezado">
          <h1>Evaluación Completada · <code>{proceso.codigo}</code></h1>
          <button className="btn btn--texto" onClick={() => navigate('/evaluacion')}>Volver</button>
        </div>
        <p className="proceso__descripcion">{proceso.titulo}</p>
        <div className="alerta alerta--ok">Evaluación registrada exitosamente.</div>
        <button className="btn btn--texto" onClick={() => { setResults(null); setEditandoCriterios(true) }}>
          Editar evaluación
        </button>
      </section>
    )
  }

  return (
    <section className="form-pagina">
      <div className="encabezado">
        <h1>Evaluar Proveedores · <code>{proceso.codigo}</code></h1>
        <button className="btn btn--texto" onClick={() => navigate('/evaluacion')}>Volver</button>
      </div>

      <p className="proceso__descripcion">{proceso.titulo}</p>

      {error && <div className="alerta alerta--error">{error}</div>}

      <div className="form">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="form__titulo" style={{ margin: 0 }}>Criterios de Evaluación</h2>
          <button
            type="button"
            className="btn btn--texto"
            onClick={() => setEditandoCriterios(!editandoCriterios)}
          >
            {editandoCriterios ? 'Ver evaluación' : 'Editar criterios'}
          </button>
        </div>

        {editandoCriterios ? (
          <div style={{ marginTop: '16px' }}>
            <h3 className="form__subtitulo">Criterios Excluyentes</h3>
            {criteriaForm.filter(c => c.type === 'Exclusionary').length === 0 && (
              <p className="form__seccion-ayuda">No hay criterios excluyentes definidos.</p>
            )}
            {criteriaForm.filter(c => c.type === 'Exclusionary').map((c, idx) => {
              const realIdx = criteriaForm.indexOf(c)
              return (
                <div key={idx} className="wizard-item-row" style={{ marginBottom: '8px' }}>
                  <input value={c.name} onChange={e => actualizarCriterioForm(realIdx, 'name', e.target.value)} placeholder="Nombre del criterio" style={{ flex: 2 }} />
                  <input value={c.description || ''} onChange={e => actualizarCriterioForm(realIdx, 'description', e.target.value)} placeholder="Descripción (opcional)" style={{ flex: 3 }} />
                  <button type="button" className="btn btn--texto btn--texto-peligro" onClick={() => quitarCriterioForm(realIdx)}>✕</button>
                </div>
              )
            })}
            <button type="button" className="btn btn--primario" onClick={() => agregarCriterio('Exclusionary')} style={{ marginBottom: '16px' }}>
              + Agregar criterio excluyente
            </button>

            <h3 className="form__subtitulo">Criterios Ponderados</h3>
            {criteriaForm.filter(c => c.type === 'Weighted').length === 0 && (
              <p className="form__seccion-ayuda">No hay criterios ponderados definidos.</p>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr 80px 40px', gap: '8px', padding: '0 8px 8px', borderBottom: '1px solid var(--color-borde)', marginBottom: '8px', fontSize: '12px', fontWeight: 'bold' }}>
              <span>Nombre</span>
              <span>Descripción</span>
              <span>Peso %</span>
              <span></span>
            </div>
            {criteriaForm.filter(c => c.type === 'Weighted').map((c, idx) => {
              const realIdx = criteriaForm.indexOf(c)
              return (
                <div key={idx} className="wizard-item-row" style={{ marginBottom: '8px' }}>
                  <input value={c.name} onChange={e => actualizarCriterioForm(realIdx, 'name', e.target.value)} placeholder="Nombre del criterio" />
                  <input value={c.description || ''} onChange={e => actualizarCriterioForm(realIdx, 'description', e.target.value)} placeholder="Descripción (opcional)" />
                  <input type="number" min="0" max="100" value={c.weight} onChange={e => actualizarCriterioForm(realIdx, 'weight', e.target.value)} />
                  <button type="button" className="btn btn--texto btn--texto-peligro" onClick={() => quitarCriterioForm(realIdx)}>✕</button>
                </div>
              )
            })}
            {(() => {
              const weightSum = criteriaForm.filter(c => c.type === 'Weighted').reduce((s, c) => s + (Number(c.weight) || 0), 0)
              if (criteriaForm.filter(c => c.type === 'Weighted').length > 0 && weightSum !== 100) {
                return <div className="alerta alerta--advertencia">La suma de pesos debe ser 100% (actual: {weightSum}%)</div>
              }
              return null
            })()}
            <button type="button" className="btn btn--primario" onClick={() => agregarCriterio('Weighted')} style={{ marginRight: '8px' }}>
              + Agregar criterio ponderado
            </button>
            <button type="button" className="btn btn--primario" onClick={guardarCriterios} disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar criterios'}
            </button>
          </div>
        ) : (
          <>
            {criteria.length > 0 && (
              <div style={{ marginTop: '16px', marginBottom: '8px' }}>
                {exclusionaryCriteria.length > 0 && (
                  <div style={{ marginBottom: '4px' }}>
                    <strong>Excluyentes:</strong> {exclusionaryCriteria.map(c => c.name).join(', ')}
                  </div>
                )}
                {weightedCriteria.length > 0 && (
                  <div>
                    <strong>Ponderados:</strong> {weightedCriteria.map(c => `${c.name} (${c.weight}%)`).join(', ')}
                  </div>
                )}
              </div>
            )}

            {criteria.length === 0 && (
              <div className="alerta alerta--info" style={{ marginTop: '16px' }}>
                No hay criterios definidos. Haz clic en "Editar criterios" para crearlos.
              </div>
            )}
          </>
        )}
      </div>

      {!editandoCriterios && criteria.length > 0 && postores.length > 0 && (
        <form className="form" onSubmit={guardarEvaluacion} style={{ marginTop: '16px' }}>
          <h2 className="form__titulo">Evaluación por Proveedor</h2>
          <p className="form__seccion-ayuda">
            Exclusionary: marcar ✓ o ✗. Ponderados: asignar puntaje de 0 a 100.
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table className="tabla" style={{ minWidth: '800px' }}>
              <thead>
                <tr>
                  <th style={{ minWidth: '180px' }}>Proveedor</th>
                  <th style={{ minWidth: '100px' }}>Oferta</th>
                  {criteria.map(c => (
                    <th key={c.id} style={{ minWidth: '120px' }}>
                      {c.name}
                      {c.type === 'Weighted' && <span className="campo__ayuda"> ({c.weight}%)</span>}
                    </th>
                  ))}
                  <th style={{ minWidth: '80px' }}>Score</th>
                  <th style={{ minWidth: '80px' }}>Excluido</th>
                </tr>
              </thead>
              <tbody>
                {postores.map(s => {
                  const excluded = isSupplierExcluded(s.id)
                  const score = getSupplierWeightedScore(s.id)
                  return (
                    <tr key={s.id} style={excluded ? { opacity: 0.5 } : {}}>
                      <td>{s.name}</td>
                      <td>{formatearPesos(s.monto)}</td>
                      {criteria.map(c => (
                        <td key={c.id}>
                          {c.type === 'Exclusionary' ? (
                            <select
                              value={getPassed(c.id, s.id) ? 'true' : 'false'}
                              onChange={e => handlePassedChange(c.id, s.id, e.target.value === 'true')}
                            >
                              <option value="true">✓ Sí</option>
                              <option value="false">✗ No</option>
                            </select>
                          ) : (
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={getScore(c.id, s.id)}
                              onChange={e => handleScoreChange(c.id, s.id, e.target.value)}
                              style={{ width: '80px' }}
                              placeholder="0-100"
                            />
                          )}
                        </td>
                      ))}
                      <td>{score !== null ? `${score}%` : '—'}</td>
                      <td>
                        {excluded ? (
                          <span className="badge badge--error">Excluido</span>
                        ) : (
                          <span className="badge badge--ok">Apto</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="form__acciones" style={{ marginTop: '16px' }}>
            <button type="submit" className="btn btn--primario" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar Evaluación'}
            </button>
          </div>
        </form>
      )}

      {!editandoCriterios && postores.length === 0 && (
        <div className="alerta alerta--info" style={{ marginTop: '16px' }}>
          No hay postores en la subasta para evaluar.
        </div>
      )}
    </section>
  )
}

function formatearPesos(monto) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(monto)
}
