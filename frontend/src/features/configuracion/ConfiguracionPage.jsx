import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { useConfirm } from '../../context/ConfirmContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { Alert } from '../../components/ui/Alert'
import { Spinner } from '../../components/ui/Spinner.jsx'
import {
  actualizarCircuitoAprobacion,
  actualizarModalidadContratacion,
  activarPlantillaDocumento,
  crearCircuitoAprobacion,
  crearModalidadContratacion,
  crearVersionPlantillaDocumento,
  eliminarCircuitoAprobacion,
  eliminarModalidadContratacion,
  listarCircuitosAprobacion,
  listarModalidadesContratacion,
  listarPlantillasDocumento,
} from '../../api/configuracionApi'

const FORM_INICIAL = {
  name: '',
  description: '',
  minAmount: '0',
  maxAmount: '',
  requiresAuction: true,
  active: true,
}

const CIRCUITO_INICIAL = {
  name: '',
  minAmount: '0',
  maxAmount: '',
  active: true,
  levels: [{ requiredRole: '6', amountThreshold: '0' }],
}

const ROLES_APROBACION = [
  { value: '1', label: 'Administrador' },
  { value: '4', label: 'Evaluador' },
  { value: '5', label: 'Auditor' },
  { value: '6', label: 'Autoridad' },
]

const PLANTILLA_INICIAL = {
  type: '0',
  name: 'Acta de adjudicacion',
  content: '',
  activate: true,
}

const TIPOS_PLANTILLA = [
  { value: '0', label: 'Acta' },
  { value: '1', label: 'Contrato' },
  { value: '2', label: 'Orden de compra' },
]

export function ConfiguracionPage() {
  const { tenantId } = useAuth()
  const confirm = useConfirm()
  const toast = useToast()
  const [modalidades, setModalidades] = useState([])
  const [circuitos, setCircuitos] = useState([])
  const [plantillas, setPlantillas] = useState([])
  const [form, setForm] = useState(FORM_INICIAL)
  const [circuitoForm, setCircuitoForm] = useState(CIRCUITO_INICIAL)
  const [plantillaForm, setPlantillaForm] = useState(PLANTILLA_INICIAL)
  const [editandoId, setEditandoId] = useState(null)
  const [editandoCircuitoId, setEditandoCircuitoId] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [guardandoCircuito, setGuardandoCircuito] = useState(false)
  const [guardandoPlantilla, setGuardandoPlantilla] = useState(false)
  const [error, setError] = useState('')

  const cargarConfiguracion = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      const [modalidadesData, circuitosData, plantillasData] = await Promise.all([
        listarModalidadesContratacion({ tenantId }),
        listarCircuitosAprobacion({ tenantId }),
        listarPlantillasDocumento({ tenantId }),
      ])
      setModalidades(modalidadesData)
      setCircuitos(circuitosData)
      setPlantillas(plantillasData)
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }, [tenantId])

  useEffect(() => {
    const timeout = setTimeout(() => {
      cargarConfiguracion()
    }, 0)

    return () => clearTimeout(timeout)
  }, [cargarConfiguracion])

  function actualizarCampo(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  function editar(modalidad) {
    setEditandoId(modalidad.id)
    setForm({
      name: modalidad.name,
      description: modalidad.description ?? '',
      minAmount: String(modalidad.minAmount ?? 0),
      maxAmount: modalidad.maxAmount == null ? '' : String(modalidad.maxAmount),
      requiresAuction: modalidad.requiresAuction,
      active: modalidad.active,
    })
  }

  function cancelarEdicion() {
    setEditandoId(null)
    setForm(FORM_INICIAL)
  }

  async function guardar(e) {
    e.preventDefault()
    setError('')
    setGuardando(true)
    try {
      if (editandoId) {
        await actualizarModalidadContratacion({ tenantId, id: editandoId, datos: form })
      } else {
        await crearModalidadContratacion({ tenantId, datos: form })
      }
      cancelarEdicion()
      await cargarConfiguracion()
      toast.success(editandoId ? 'Modalidad actualizada.' : 'Modalidad creada.')
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar(id) {
    const confirmado = await confirm({
      variant: 'danger',
      title: 'Eliminar modalidad',
      message: 'Eliminar esta modalidad? Si esta en uso, quedara inactiva.',
      confirmText: 'Eliminar',
    })
    if (!confirmado) return

    setError('')
    try {
      await eliminarModalidadContratacion({ tenantId, id })
      await cargarConfiguracion()
      if (editandoId === id) cancelarEdicion()
      toast.success('Modalidad eliminada o inactivada.')
    } catch (err) {
      setError(err.message)
    }
  }

  function actualizarCircuitoCampo(campo, valor) {
    setCircuitoForm((prev) => ({ ...prev, [campo]: valor }))
  }

  function actualizarNivel(index, campo, valor) {
    setCircuitoForm((prev) => ({
      ...prev,
      levels: prev.levels.map((level, i) =>
        i === index ? { ...level, [campo]: valor } : level
      ),
    }))
  }

  function agregarNivel() {
    setCircuitoForm((prev) => ({
      ...prev,
      levels: [...prev.levels, { requiredRole: '6', amountThreshold: prev.minAmount || '0' }],
    }))
  }

  function quitarNivel(index) {
    setCircuitoForm((prev) => ({
      ...prev,
      levels: prev.levels.filter((_, i) => i !== index),
    }))
  }

  function editarCircuito(circuito) {
    setEditandoCircuitoId(circuito.id)
    setCircuitoForm({
      name: circuito.name,
      minAmount: circuito.minAmount == null ? '' : String(circuito.minAmount),
      maxAmount: circuito.maxAmount == null ? '' : String(circuito.maxAmount),
      active: circuito.active,
      levels: (circuito.levels ?? []).map((level) => ({
        requiredRole: String(level.requiredRole),
        amountThreshold: String(level.amountThreshold ?? 0),
      })),
    })
  }

  function cancelarCircuito() {
    setEditandoCircuitoId(null)
    setCircuitoForm(CIRCUITO_INICIAL)
  }

  async function guardarCircuito(e) {
    e.preventDefault()
    setError('')
    setGuardandoCircuito(true)
    try {
      if (editandoCircuitoId) {
        await actualizarCircuitoAprobacion({
          tenantId,
          id: editandoCircuitoId,
          datos: circuitoForm,
        })
      } else {
        await crearCircuitoAprobacion({ tenantId, datos: circuitoForm })
      }
      cancelarCircuito()
      await cargarConfiguracion()
      toast.success(editandoCircuitoId ? 'Circuito actualizado.' : 'Circuito creado.')
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardandoCircuito(false)
    }
  }

  async function eliminarCircuito(id) {
    const confirmado = await confirm({
      variant: 'danger',
      title: 'Eliminar circuito',
      message: 'Eliminar este circuito? Si esta en uso, quedara inactivo.',
      confirmText: 'Eliminar',
    })
    if (!confirmado) return

    setError('')
    try {
      await eliminarCircuitoAprobacion({ tenantId, id })
      await cargarConfiguracion()
      if (editandoCircuitoId === id) cancelarCircuito()
      toast.success('Circuito eliminado o inactivado.')
    } catch (err) {
      setError(err.message)
    }
  }

  function actualizarPlantillaCampo(campo, valor) {
    setPlantillaForm((prev) => ({ ...prev, [campo]: valor }))
  }

  function cargarPlantillaActual(tipo) {
    const activa = plantillas.find((plantilla) =>
      String(plantilla.type) === String(tipo) && plantilla.active
    )

    setPlantillaForm({
      type: String(tipo),
      name: activa?.name ?? etiquetaTipoPlantilla(tipo),
      content: activa?.content ?? '',
      activate: true,
    })
  }

  async function guardarPlantilla(e) {
    e.preventDefault()
    setError('')
    setGuardandoPlantilla(true)
    try {
      await crearVersionPlantillaDocumento({ tenantId, datos: plantillaForm })
      setPlantillaForm((prev) => ({ ...prev, content: '' }))
      await cargarConfiguracion()
      toast.success('Version de plantilla creada.')
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardandoPlantilla(false)
    }
  }

  async function activarPlantilla(id) {
    setError('')
    try {
      await activarPlantillaDocumento({ tenantId, id })
      await cargarConfiguracion()
      toast.success('Plantilla activada.')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section className="form-pagina">
      <div className="encabezado">
        <h1>Configuracion</h1>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <form className="form" onSubmit={guardar}>
        <h2 className="form__titulo">
          {editandoId ? 'Editar modalidad' : 'Nueva modalidad'}
        </h2>

        <label className="campo">
          <span>Nombre</span>
          <input
            value={form.name}
            onChange={(e) => actualizarCampo('name', e.target.value)}
            placeholder="Compra directa"
          />
        </label>

        <label className="campo">
          <span>Descripcion</span>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => actualizarCampo('description', e.target.value)}
            placeholder="Reglas generales de la modalidad"
          />
        </label>

        <label className="campo">
          <span>Monto minimo</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.minAmount}
            onChange={(e) => actualizarCampo('minAmount', e.target.value)}
          />
        </label>

        <label className="campo">
          <span>Monto maximo</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.maxAmount}
            onChange={(e) => actualizarCampo('maxAmount', e.target.value)}
            placeholder="Sin tope"
          />
        </label>

        <label className="campo campo--checkbox">
          <input
            type="checkbox"
            checked={form.requiresAuction}
            onChange={(e) => actualizarCampo('requiresAuction', e.target.checked)}
          />
          <span>Requiere subasta</span>
        </label>

        <label className="campo campo--checkbox">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => actualizarCampo('active', e.target.checked)}
          />
          <span>Activa</span>
        </label>

        <div className="form__acciones">
          {editandoId && (
            <button type="button" className="btn btn--texto" onClick={cancelarEdicion}>
              Cancelar
            </button>
          )}
          <button type="submit" className="btn btn--primario" disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>

      <div className="form">
        <h2 className="form__titulo">Modalidades</h2>
        {cargando ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : modalidades.length === 0 ? (
          <div className="empty-state">
            <p>No hay modalidades configuradas.</p>
          </div>
        ) : (
          <table className="tabla">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Rango</th>
                <th>Subasta</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {modalidades.map((modalidad) => (
                <tr key={modalidad.id}>
                  <td>{modalidad.name}</td>
                  <td>{formatearRango(modalidad)}</td>
                  <td>{modalidad.requiresAuction ? 'Si' : 'No'}</td>
                  <td>
                    <span className={`badge ${modalidad.active ? 'badge--ok' : 'badge--off'}`}>
                      {modalidad.active ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn--texto"
                      onClick={() => editar(modalidad)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn btn--texto"
                      onClick={() => eliminar(modalidad.id)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <form className="form" onSubmit={guardarCircuito}>
        <h2 className="form__titulo">
          {editandoCircuitoId ? 'Editar circuito' : 'Nuevo circuito de aprobacion'}
        </h2>

        <label className="campo">
          <span>Nombre</span>
          <input
            value={circuitoForm.name}
            onChange={(e) => actualizarCircuitoCampo('name', e.target.value)}
            placeholder="Aprobacion de compras mayores"
          />
        </label>

        <label className="campo">
          <span>Monto minimo</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={circuitoForm.minAmount}
            onChange={(e) => actualizarCircuitoCampo('minAmount', e.target.value)}
          />
        </label>

        <label className="campo">
          <span>Monto maximo</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={circuitoForm.maxAmount}
            onChange={(e) => actualizarCircuitoCampo('maxAmount', e.target.value)}
            placeholder="Sin tope"
          />
        </label>

        <label className="campo campo--checkbox">
          <input
            type="checkbox"
            checked={circuitoForm.active}
            onChange={(e) => actualizarCircuitoCampo('active', e.target.checked)}
          />
          <span>Activo</span>
        </label>

        <h3 className="form__subtitulo">Niveles</h3>
        {circuitoForm.levels.map((level, index) => (
          <div className="perfil__solo-lectura" key={index}>
            <span>Nivel {index + 1}</span>
            <label className="campo">
              <span>Rol</span>
              <select
                value={level.requiredRole}
                onChange={(e) => actualizarNivel(index, 'requiredRole', e.target.value)}
              >
                {ROLES_APROBACION.map((role) => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            </label>
            <label className="campo">
              <span>Umbral</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={level.amountThreshold}
                onChange={(e) => actualizarNivel(index, 'amountThreshold', e.target.value)}
              />
            </label>
            {circuitoForm.levels.length > 1 && (
              <button type="button" className="btn btn--texto" onClick={() => quitarNivel(index)}>
                Quitar
              </button>
            )}
          </div>
        ))}

        <div className="form__acciones">
          <button type="button" className="btn btn--texto" onClick={agregarNivel}>
            Agregar nivel
          </button>
          {editandoCircuitoId && (
            <button type="button" className="btn btn--texto" onClick={cancelarCircuito}>
              Cancelar
            </button>
          )}
          <button type="submit" className="btn btn--primario" disabled={guardandoCircuito}>
            {guardandoCircuito ? 'Guardando...' : 'Guardar circuito'}
          </button>
        </div>
      </form>

      <div className="form">
        <h2 className="form__titulo">Circuitos de aprobacion</h2>
        {cargando ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : circuitos.length === 0 ? (
          <div className="empty-state">
            <p>No hay circuitos configurados.</p>
          </div>
        ) : (
          <table className="tabla">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Rango</th>
                <th>Niveles</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {circuitos.map((circuito) => (
                <tr key={circuito.id}>
                  <td>{circuito.name}</td>
                  <td>{formatearRango(circuito)}</td>
                  <td>{formatearNiveles(circuito.levels)}</td>
                  <td>
                    <span className={`badge ${circuito.active ? 'badge--ok' : 'badge--off'}`}>
                      {circuito.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn--texto"
                      onClick={() => editarCircuito(circuito)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn btn--texto"
                      onClick={() => eliminarCircuito(circuito.id)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <form className="form" onSubmit={guardarPlantilla}>
        <h2 className="form__titulo">Nueva version de plantilla</h2>

        <label className="campo">
          <span>Tipo</span>
          <select
            value={plantillaForm.type}
            onChange={(e) => {
              actualizarPlantillaCampo('type', e.target.value)
              cargarPlantillaActual(e.target.value)
            }}
          >
            {TIPOS_PLANTILLA.map((tipo) => (
              <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
            ))}
          </select>
        </label>

        <label className="campo">
          <span>Nombre</span>
          <input
            value={plantillaForm.name}
            onChange={(e) => actualizarPlantillaCampo('name', e.target.value)}
            placeholder="Contrato estandar"
          />
        </label>

        <label className="campo">
          <span>Contenido</span>
          <textarea
            rows={8}
            value={plantillaForm.content}
            onChange={(e) => actualizarPlantillaCampo('content', e.target.value)}
            placeholder="Texto de plantilla con placeholders como {{process.code}}"
          />
        </label>

        <label className="campo campo--checkbox">
          <input
            type="checkbox"
            checked={plantillaForm.activate}
            onChange={(e) => actualizarPlantillaCampo('activate', e.target.checked)}
          />
          <span>Activar esta version</span>
        </label>

        <div className="form__acciones">
          <button
            type="button"
            className="btn btn--texto"
            onClick={() => cargarPlantillaActual(plantillaForm.type)}
          >
            Usar version activa
          </button>
          <button type="submit" className="btn btn--primario" disabled={guardandoPlantilla}>
            {guardandoPlantilla ? 'Guardando...' : 'Crear version'}
          </button>
        </div>
      </form>

      <div className="form">
        <h2 className="form__titulo">Plantillas de documentos</h2>
        {cargando ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : plantillas.length === 0 ? (
          <div className="empty-state">
            <p>No hay plantillas configuradas.</p>
          </div>
        ) : (
          <table className="tabla">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Nombre</th>
                <th>Version</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {plantillas.map((plantilla) => (
                <tr key={plantilla.id}>
                  <td>{etiquetaTipoPlantilla(plantilla.type)}</td>
                  <td>{plantilla.name}</td>
                  <td>v{plantilla.version}</td>
                  <td>
                    <span className={`badge ${plantilla.active ? 'badge--ok' : 'badge--off'}`}>
                      {plantilla.active ? 'Activa' : 'Historica'}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn--texto"
                      onClick={() => setPlantillaForm({
                        type: String(plantilla.type),
                        name: plantilla.name,
                        content: plantilla.content,
                        activate: true,
                      })}
                    >
                      Nueva version
                    </button>
                    {!plantilla.active && (
                      <button
                        type="button"
                        className="btn btn--texto"
                        onClick={() => activarPlantilla(plantilla.id)}
                      >
                        Activar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}

function formatearRango(modalidad) {
  const min = formatearPesos(modalidad.minAmount)
  if (modalidad.maxAmount == null) return `Desde ${min}`
  return `${min} a ${formatearPesos(modalidad.maxAmount)}`
}

function formatearPesos(monto) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(monto)
}

function formatearNiveles(levels = []) {
  return [...levels]
    .sort((a, b) => a.levelOrder - b.levelOrder)
    .map((level) => `N${level.levelOrder}: ${etiquetaRol(level.requiredRole)} desde ${formatearPesos(level.amountThreshold)}`)
    .join(' / ')
}

function etiquetaRol(role) {
  const match = ROLES_APROBACION.find((item) => Number(item.value) === Number(role))
  return match?.label ?? 'Autoridad'
}

function etiquetaTipoPlantilla(type) {
  const match = TIPOS_PLANTILLA.find((item) => Number(item.value) === Number(type))
  return match?.label ?? 'Acta'
}
