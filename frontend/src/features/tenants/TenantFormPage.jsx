// Alta y edición de tenant. Solo super-admin.

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { obtenerTenant, crearTenant, actualizarTenant } from '../../api/tenantsApi.js'

const VACIO = { nombre: '', subdominio: '', activo: true }
const ADMIN_VACIO = { nombre: '', apellido: '', email: '' }

// Convierte un texto cualquiera en un subdominio válido:
// saca acentos, pasa a minúsculas, y reemplaza todo lo no permitido por guiones.
// Ej: "Fundación para el Desarrollo" -> "fundacion-para-el-desarrollo"
function aSubdominio(texto) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita los acentos (á -> a)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // espacios, guiones bajos, etc. -> guion medio
    .replace(/^-+|-+$/g, '') // sin guiones al principio ni al final
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
  // Mientras el usuario no toque el subdominio a mano, lo generamos del nombre.
  const [subdominioEditado, setSubdominioEditado] = useState(false)

  useEffect(() => {
    if (!esEdicion) return
    obtenerTenant({ id })
      .then((t) =>
        setDatos({ nombre: t.nombre, subdominio: t.subdominio, activo: t.activo }),
      )
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false))
  }, [esEdicion, id])

  function actualizarCampo(campo, valor) {
    setDatos((prev) => ({ ...prev, [campo]: valor }))
  }

  // Al escribir el nombre, autocompletamos el subdominio (solo si no se editó a mano).
  function cambiarNombre(valor) {
    setDatos((prev) => ({
      ...prev,
      nombre: valor,
      subdominio: subdominioEditado ? prev.subdominio : aSubdominio(valor),
    }))
  }

  // Si el usuario edita el subdominio, lo dejamos mandar a él, pero igual
  // bloqueamos caracteres inválidos en vivo (sin recortar guiones, así puede
  // escribir "foo-bar" cómodo). El recorte final lo hace la API al guardar.
  function cambiarSubdominio(valor) {
    setSubdominioEditado(true)
    const limpio = valor
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
    setDatos((prev) => ({ ...prev, subdominio: limpio }))
  }

  function actualizarAdmin(campo, valor) {
    setAdmin((prev) => ({ ...prev, [campo]: valor }))
  }

  async function manejarSubmit(e) {
    e.preventDefault()
    setError('')
    setGuardando(true)
    try {
      if (esEdicion) {
        await actualizarTenant({ id, datos })
      } else {
        await crearTenant({ datos, admin })
      }
      navigate('/tenants')
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) return <p className="estado-cargando">Cargando…</p>

  return (
    <section className="form-pagina">
      <div className="encabezado">
        <h1>{esEdicion ? 'Editar tenant' : 'Nuevo tenant'}</h1>
      </div>

      {error && <div className="alerta alerta--error">{error}</div>}

      <form className="form" onSubmit={manejarSubmit}>
        <label className="campo">
          <span>Nombre de la organización</span>
          <input
            value={datos.nombre}
            onChange={(e) => cambiarNombre(e.target.value)}
            placeholder="Municipio de San Miguel de Tucumán"
          />
        </label>

        <label className="campo">
          <span>Subdominio</span>
          <input
            value={datos.subdominio}
            onChange={(e) => cambiarSubdominio(e.target.value)}
            placeholder="tucuman"
          />
          <small className="campo__ayuda">
            Se genera solo a partir del nombre. Dirección del tenant:{' '}
            <code>{datos.subdominio || 'subdominio'}</code>.sicstmax.com
          </small>
        </label>

        <label className="campo campo--checkbox">
          <input
            type="checkbox"
            checked={datos.activo}
            onChange={(e) => actualizarCampo('activo', e.target.checked)}
          />
          <span>Tenant activo</span>
        </label>

        {/* El admin inicial solo se pide al crear: un tenant nuevo necesita
            alguien que pueda entrar. En edición, ese admin ya existe. */}
        {!esEdicion && (
          <fieldset className="form__seccion">
            <legend>Administrador inicial del tenant</legend>
            <p className="form__seccion-ayuda">
              Es la persona de la empresa que va a administrar sus propios usuarios.
              Recibirá acceso como Administrador del tenant.
            </p>

            <label className="campo">
              <span>Nombre</span>
              <input
                value={admin.nombre}
                onChange={(e) => actualizarAdmin('nombre', e.target.value)}
              />
            </label>

            <label className="campo">
              <span>Apellido</span>
              <input
                value={admin.apellido}
                onChange={(e) => actualizarAdmin('apellido', e.target.value)}
              />
            </label>

            <label className="campo">
              <span>Email</span>
              <input
                type="email"
                value={admin.email}
                onChange={(e) => actualizarAdmin('email', e.target.value)}
                placeholder="admin@empresa.com"
              />
            </label>
          </fieldset>
        )}

        <div className="form__acciones">
          <button
            type="button"
            className="btn btn--texto"
            onClick={() => navigate('/tenants')}
          >
            Cancelar
          </button>
          <button type="submit" className="btn btn--primario" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </section>
  )
}
