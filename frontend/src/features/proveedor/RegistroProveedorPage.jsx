import { useState } from 'react'
import { Link } from 'react-router-dom'
import { registrarProveedor } from '../../api/proveedoresApi.js'

const VACIO = {
  razonSocial: '',
  cuit: '',
  email: '',
  rubro: '',
  provincia: '',
  localidad: '',
}

export function RegistroProveedorPage() {
  const [datos, setDatos] = useState(VACIO)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [confirmacion, setConfirmacion] = useState('')

  function actualizar(campo, valor) {
    setDatos((prev) => ({ ...prev, [campo]: valor }))
  }

  async function manejarSubmit(e) {
    e.preventDefault()
    setError('')
    setConfirmacion('')
    setEnviando(true)
    try {
      const respuesta = await registrarProveedor({ datos })
      setConfirmacion(respuesta.message || 'Tus datos fueron enviados a verificación.')
      setDatos(VACIO)
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="public-page">
      <header className="page-header">
        <div className="contenedor page-header__inner">
          <Link to="/portal" className="page-header__brand">
            <span className="page-header__logo">SC</span>
            <span className="flex flex--col">
              <span className="page-header__title">SICST</span>
              <span className="page-header__subtitle">Registro proveedor</span>
            </span>
          </Link>
          <div className="page-header__nav">
            <Link to="/portal" className="btn btn--secundario">
              Portal publico
            </Link>
            <Link to="/login" className="btn btn--primario">
              Ingresar
            </Link>
          </div>
        </div>
      </header>

      <section className="public-form">
        <form className="public-form__card" onSubmit={manejarSubmit}>
          <div>
            <span className="public-form__tag">Crear cuenta</span>
            <h2 className="public-form__title">Registro de proveedor</h2>
            <p className="public-form__desc">
              Completa los datos principales de tu empresa para solicitar el alta.
            </p>
          </div>

          {error && (
            <div className="alerta alerta--error mt-16">{error}</div>
          )}
          {confirmacion && (
            <div className="alerta alerta--info mt-16">{confirmacion}</div>
          )}

          <div className="public-form__grid">
            <label className="campo">
              <span>Razon social</span>
              <input
                value={datos.razonSocial}
                onChange={(e) => actualizar('razonSocial', e.target.value)}
                placeholder="Insumos del Norte SRL"
              />
            </label>
            <label className="campo">
              <span>CUIT</span>
              <input
                value={datos.cuit}
                onChange={(e) => actualizar('cuit', e.target.value)}
                placeholder="30-12345678-1"
              />
            </label>
            <label className="campo">
              <span>Email</span>
              <input
                type="email"
                value={datos.email}
                onChange={(e) => actualizar('email', e.target.value)}
                placeholder="ventas@empresa.com"
                autoComplete="username"
              />
            </label>
            <label className="campo">
              <span>Rubro</span>
              <input
                value={datos.rubro}
                onChange={(e) => actualizar('rubro', e.target.value)}
                placeholder="Construccion, limpieza, tecnologia"
              />
            </label>

            <div className="grid-2" style={{ gridColumn: '1 / -1' }}>
              <label className="campo">
                <span>Provincia</span>
                <input
                  value={datos.provincia}
                  onChange={(e) => actualizar('provincia', e.target.value)}
                  placeholder="Tucuman"
                />
              </label>
              <label className="campo">
                <span>Localidad</span>
                <input
                  value={datos.localidad}
                  onChange={(e) => actualizar('localidad', e.target.value)}
                  placeholder="San Miguel"
                />
              </label>
            </div>
          </div>

          <button
            className="btn btn--primario btn--full mt-16"
            type="submit"
            disabled={enviando}
          >
            {enviando ? 'Enviando...' : 'Enviar a verificacion'}
          </button>

          <p className="text-center mt-16 text-sm text-suave">
            Ya tenes cuenta?{' '}
            <Link className="text-ok" style={{ fontWeight: 700, textDecoration: 'underline' }} to="/login">
              Ingresar
            </Link>
          </p>
        </form>
      </section>
    </div>
  )
}
