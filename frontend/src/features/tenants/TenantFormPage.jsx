import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { obtenerTenant, crearTenant, actualizarTenant } from '../../api/tenantsApi'
import { Building2, Globe, Image, Palette, ShieldCheck, CheckCircle, Clipboard } from 'lucide-react'
import { Spinner } from '../../components/ui/Spinner.jsx'
import { Alert } from '../../components/ui/Alert'

const COLOR_PRIMARIO_DEFAULT = '#1d4ed8'
const VACIO = {
  nombre: '',
  subdominio: '',
  logo: '',
  colorPrimario: COLOR_PRIMARIO_DEFAULT,
  activo: true,
}
const ADMIN_VACIO = { nombre: '', apellido: '', email: '' }

function aSubdominio(texto) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function TenantFormPage() {
  const { id } = useParams()
  const esEdicion = Boolean(id)
  const navigate = useNavigate()

  const [datos, setDatos] = useState(VACIO)
  const [admin, setAdmin] = useState(ADMIN_VACIO)
  const [cargando, setCargando] = useState(esEdicion)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [errores, setErrores] = useState({})
  const [subdominioEditado, setSubdominioEditado] = useState(false)
  const [creacionExitosa, setCreacionExitosa] = useState(null)

  useEffect(() => {
    if (!esEdicion) return
    obtenerTenant({ id })
      .then((t) =>
        setDatos({
          nombre: t.nombre,
          subdominio: t.subdominio,
          logo: t.logo ?? '',
          colorPrimario: t.colorPrimario || COLOR_PRIMARIO_DEFAULT,
          activo: t.activo,
        }),
      )
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false))
  }, [esEdicion, id])

  function actualizarCampo(campo, valor) {
    setDatos((prev) => ({ ...prev, [campo]: valor }))
    if (errores[campo]) setErrores((prev) => ({ ...prev, [campo]: '' }))
  }

  function cambiarNombre(valor) {
    setDatos((prev) => ({
      ...prev,
      nombre: valor,
      subdominio: subdominioEditado ? prev.subdominio : aSubdominio(valor),
    }))
    if (errores.nombre) setErrores((prev) => ({ ...prev, nombre: '' }))
  }

  function cambiarSubdominio(valor) {
    setSubdominioEditado(true)
    const limpio = valor
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
    setDatos((prev) => ({ ...prev, subdominio: limpio }))
    if (errores.subdominio) setErrores((prev) => ({ ...prev, subdominio: '' }))
  }

  function actualizarAdmin(campo, valor) {
    setAdmin((prev) => ({ ...prev, [campo]: valor }))
    if (errores[campo]) setErrores((prev) => ({ ...prev, [campo]: '' }))
  }

  function validar() {
    const errs = {}
    if (!datos.nombre.trim()) errs.nombre = 'El nombre es obligatorio'
    if (!datos.subdominio.trim()) errs.subdominio = 'El subdominio es obligatorio'
    if (!esEdicion) {
      if (!admin.nombre.trim()) errs.nombreAdmin = 'El nombre del admin es obligatorio'
      if (!admin.apellido.trim()) errs.apellidoAdmin = 'El apellido del admin es obligatorio'
      if (!admin.email.trim()) errs.emailAdmin = 'El email del admin es obligatorio'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(admin.email.trim()))
        errs.emailAdmin = 'Email inválido'
    }
    setErrores(errs)
    return Object.keys(errs).length === 0
  }

  async function manejarSubmit(e) {
    e.preventDefault()
    setError('')
    if (!validar()) return
    setGuardando(true)
    try {
      if (esEdicion) {
        await actualizarTenant({ id, datos })
        navigate('/tenants')
      } else {
        const resultado = await crearTenant({ datos, admin })
        setCreacionExitosa(resultado)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  function cerrarModal() {
    setCreacionExitosa(null)
    navigate('/tenants')
  }

  if (cargando) return <div className="flex justify-center py-12"><Spinner /></div>

  return (
    <>
      <section className="form-pagina" style={{ maxWidth: 640 }}>
        <div className="encabezado">
          <h1>{esEdicion ? 'Editar empresa' : 'Nueva empresa'}</h1>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <form className="form" onSubmit={manejarSubmit} noValidate>
          <div className="form__seccion" style={{ border: 'none', padding: 0, background: 'none' }}>
            <h2 className="form__titulo" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Building2 size={20} /> Datos de la empresa
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <label className="campo" style={{ gridColumn: '1 / -1' }}>
                <span>Nombre de la organización *</span>
                <input
                  value={datos.nombre}
                  onChange={(e) => cambiarNombre(e.target.value)}
                  placeholder="Municipio de San Miguel de Tucumán"
                  style={errores.nombre ? { borderColor: 'var(--color-error-tx)' } : {}}
                />
                {errores.nombre && <small style={{ color: 'var(--color-error-tx)', fontSize: 12 }}>{errores.nombre}</small>}
              </label>

              <label className="campo" style={{ gridColumn: '1 / -1' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Globe size={14} /> Subdominio *
                </span>
                <input
                  value={datos.subdominio}
                  onChange={(e) => cambiarSubdominio(e.target.value)}
                  placeholder="tucuman"
                  style={errores.subdominio ? { borderColor: 'var(--color-error-tx)' } : {}}
                />
                {errores.subdominio && <small style={{ color: 'var(--color-error-tx)', fontSize: 12 }}>{errores.subdominio}</small>}
                <small className="campo__ayuda">
                  Dirección del tenant:{' '}
                  <code style={{ fontWeight: 600, color: 'var(--color-primario)' }}>
                    {datos.subdominio || 'subdominio'}.sicstmax.com
                  </code>
                </small>
              </label>

              <label className="campo">
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Image size={14} /> Logo
                </span>
                <input
                  type="url"
                  value={datos.logo}
                  onChange={(e) => actualizarCampo('logo', e.target.value)}
                  placeholder="https://empresa.com/logo.png"
                />
                <small className="campo__ayuda">URL pública del logo</small>
              </label>

              <label className="campo">
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Palette size={14} /> Color primario
                </span>
                <div className="campo-color">
                  <input
                    type="color"
                    value={/^#[0-9a-fA-F]{6}$/.test(datos.colorPrimario) ? datos.colorPrimario : COLOR_PRIMARIO_DEFAULT}
                    onChange={(e) => actualizarCampo('colorPrimario', e.target.value)}
                    aria-label="Seleccionar color primario"
                    style={{ borderRadius: 6 }}
                  />
                  <input
                    value={datos.colorPrimario}
                    onChange={(e) => actualizarCampo('colorPrimario', e.target.value)}
                    placeholder="#1d4ed8"
                    maxLength={20}
                  />
                </div>
              </label>
            </div>

            <label className="campo campo--checkbox" style={{ marginTop: 8 }}>
              <input
                type="checkbox"
                checked={datos.activo}
                onChange={(e) => actualizarCampo('activo', e.target.checked)}
              />
              <span>Tenant activo</span>
            </label>
          </div>

          {!esEdicion && (
            <div className="form__seccion" style={{ marginTop: 24 }}>
              <h2 className="form__titulo" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <ShieldCheck size={20} /> Administrador inicial
              </h2>
              <p className="form__subtitulo" style={{ marginBottom: 16 }}>
                Esta persona será el administrador de la empresa. Recibirá un acceso temporario que deberá cambiar al iniciar sesión.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                <label className="campo">
                  <span>Nombre *</span>
                  <input
                    value={admin.nombre}
                    onChange={(e) => actualizarAdmin('nombre', e.target.value)}
                    placeholder="Juan"
                    style={errores.nombreAdmin ? { borderColor: 'var(--color-error-tx)' } : {}}
                  />
                  {errores.nombreAdmin && <small style={{ color: 'var(--color-error-tx)', fontSize: 12 }}>{errores.nombreAdmin}</small>}
                </label>

                <label className="campo">
                  <span>Apellido *</span>
                  <input
                    value={admin.apellido}
                    onChange={(e) => actualizarAdmin('apellido', e.target.value)}
                    placeholder="Pérez"
                    style={errores.apellidoAdmin ? { borderColor: 'var(--color-error-tx)' } : {}}
                  />
                  {errores.apellidoAdmin && <small style={{ color: 'var(--color-error-tx)', fontSize: 12 }}>{errores.apellidoAdmin}</small>}
                </label>

                <label className="campo" style={{ gridColumn: '1 / -1' }}>
                  <span>Email *</span>
                  <input
                    type="email"
                    value={admin.email}
                    onChange={(e) => actualizarAdmin('email', e.target.value)}
                    placeholder="admin@empresa.com"
                    style={errores.emailAdmin ? { borderColor: 'var(--color-error-tx)' } : {}}
                  />
                  {errores.emailAdmin && <small style={{ color: 'var(--color-error-tx)', fontSize: 12 }}>{errores.emailAdmin}</small>}
                </label>
              </div>
            </div>
          )}

          <div className="form__acciones" style={{ marginTop: 28 }}>
            <button type="button" className="btn btn--texto" onClick={() => navigate('/tenants')}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn--primario"
              disabled={guardando}
              style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 140, justifyContent: 'center' }}
            >
              {guardando ? (
                <>Guardando…</>
              ) : (
                <><CheckCircle size={16} /> {esEdicion ? 'Guardar cambios' : 'Crear empresa'}</>
              )}
            </button>
          </div>
        </form>
      </section>

      {creacionExitosa && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={22} style={{ color: 'var(--color-ok-tx)' }} /> Empresa creada
              </h2>
            </div>
            <div className="modal__body">
              <p>
                Se creó la organización <strong>{creacionExitosa.tenant.nombre}</strong> con
                administrador <strong>{creacionExitosa.admin.nombre} {creacionExitosa.admin.apellido}</strong>.
              </p>
              <Alert variant="info"><strong>Contraseña temporal del administrador:</strong></Alert>
              <div className="contrasenia-temporal">
                <code>{creacionExitosa.passwordTemporal}</code>
                <button
                  type="button"
                  className="btn btn--icono"
                  title="Copiar contraseña"
                  onClick={() => navigator.clipboard.writeText(creacionExitosa.passwordTemporal)}
                >
                  <Clipboard size={16} />
                </button>
              </div>
              <p className="campo__ayuda" style={{ fontSize: 13 }}>
                Esta contraseña se muestra <strong>una sola vez</strong>. El administrador debe
                cambiarla al iniciar sesión. Copiala ahora antes de cerrar.
              </p>
            </div>
            <div className="modal__footer">
              <button className="btn btn--primario" onClick={cerrarModal} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle size={16} /> Entendido, cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}