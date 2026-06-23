import { Package, Users, Save, Send, Plus, X, ArrowLeft } from 'lucide-react'
import { etiquetaEstadoInvitacion, claseEstadoInvitacion } from '../../../domain/invitaciones.js'

export function ProcesoForm({
  datos,
  proceso,
  esNuevo,
  guardando,
  proveedores,
  proveedorInvitado,
  setProveedorInvitado,
  invitaciones,
  invitadosNuevos,
  agregarInvitadoNuevo,
  quitarInvitadoNuevo,
  invitar,
  actualizar,
  actualizarItem,
  agregarItem,
  quitarItem,
  manejarSubmit,
  enviar,
  onVolver,
}) {
  return (
    <form className="form" onSubmit={manejarSubmit}>
      {proceso && (
        <div className="perfil__solo-lectura">
          <span>Código: {proceso.codigo}</span>
          <span>Creado el: {proceso.creadoEn}</span>
        </div>
      )}

      <label className="campo">
        <span>Título</span>
        <input
          value={datos.titulo}
          onChange={(e) => actualizar('titulo', e.target.value)}
          placeholder="Compra de insumos de limpieza"
          required
        />
      </label>

      <label className="campo">
        <span>Descripción</span>
        <textarea
          rows={4}
          value={datos.descripcion}
          onChange={(e) => actualizar('descripcion', e.target.value)}
          placeholder="Detalle de lo que se necesita comprar…"
          required
        />
      </label>

      <label className="campo">
        <span>Presupuesto estimado (ARS)</span>
        <input
          type="number"
          min="0"
          value={datos.presupuestoEstimado}
          onChange={(e) => actualizar('presupuestoEstimado', e.target.value)}
          placeholder="500000"
          required
        />
      </label>

      <fieldset className="form__seccion">
        <legend>
          <div className="perfil__seccion-header" style={{ border: 'none', background: 'none', padding: 0 }}>
            <div className="perfil__seccion-icon">
              <Package size={16} />
            </div>
            <h3>Items del proceso</h3>
          </div>
        </legend>
        {datos.items.map((item, indice) => (
          <div className="item-linea" key={indice}>
            <span className="item-linea__numero">{indice + 1}</span>
            <input
              placeholder="Descripcion"
              value={item.description}
              onChange={(e) => actualizarItem(indice, 'description', e.target.value)}
              required
            />
            <input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Cantidad"
              value={item.quantity}
              onChange={(e) => actualizarItem(indice, 'quantity', e.target.value)}
              required
            />
            <input
              placeholder="Unidad"
              value={item.unit}
              onChange={(e) => actualizarItem(indice, 'unit', e.target.value)}
              required
            />
            <input
              type="number"
              min="0"
              placeholder="Precio unit."
              value={item.estimatedUnitPrice}
              onChange={(e) => actualizarItem(indice, 'estimatedUnitPrice', e.target.value)}
              required
            />
            <button type="button" className="btn btn--texto" onClick={() => quitarItem(indice)}>
              <X size={14} />
              Quitar
            </button>
          </div>
        ))}
        <button type="button" className="btn btn--texto" onClick={agregarItem}>
          <Plus size={14} />
          Agregar item
        </button>
      </fieldset>

      {proveedores.length > 0 && (
        <fieldset className="form__seccion" style={{ marginTop: 24 }}>
          <legend>
            <div className="perfil__seccion-header" style={{ border: 'none', background: 'none', padding: 0 }}>
              <div className="perfil__seccion-icon">
                <Users size={16} />
              </div>
              <h3>{esNuevo ? 'Seleccionar proveedores a invitar' : 'Invitación de proveedores'}</h3>
            </div>
          </legend>

          <div className="filtros">
            <select
              value={proveedorInvitado}
              onChange={(e) => setProveedorInvitado(e.target.value)}
            >
              <option value="">Seleccionar proveedor</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.razonSocial} - {p.cuit}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn--primario"
              onClick={esNuevo ? agregarInvitadoNuevo : invitar}
              disabled={!proveedorInvitado || guardando}
            >
              {esNuevo ? 'Agregar' : 'Invitar'}
            </button>
          </div>

          {esNuevo && invitadosNuevos.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {invitadosNuevos.map((provId) => {
                const prov = proveedores.find((p) => p.id === provId)
                return (
                  <span className="chip" key={provId}>
                    {prov?.razonSocial ?? provId}
                    <button
                      type="button"
                      className="chip__remover"
                      onClick={() => quitarInvitadoNuevo(provId)}
                      title="Quitar"
                    >
                      ×
                    </button>
                  </span>
                )
              })}
            </div>
          )}

          {invitaciones.length > 0 && (
            <>
              <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid var(--color-borde)' }} />
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Proveedor</th>
                    <th>CUIT</th>
                    <th>Invitado</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {invitaciones.map((inv) => (
                    <tr key={inv.id}>
                      <td>{inv.supplierBusinessName}</td>
                      <td>{inv.supplierCuit}</td>
                      <td>{inv.invitedAtUtc?.slice(0, 10)}</td>
                      <td>
                        <span className={`badge ${claseEstadoInvitacion(inv.status)}`}>
                          {etiquetaEstadoInvitacion(inv.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {!esNuevo && invitaciones.length === 0 && (
            <p className="form__seccion-ayuda" style={{ marginTop: 8 }}>
              Todavia no se invitaron proveedores a este proceso.
            </p>
          )}

          {esNuevo && invitadosNuevos.length === 0 && (
            <p className="form__seccion-ayuda" style={{ marginTop: 8 }}>
              Selecciona los proveedores que queres invitar. Se invitaran automaticamente al crear el proceso.
            </p>
          )}
        </fieldset>
      )}

      <div className="form__acciones">
        <button
          type="button"
          className="btn btn--texto"
          onClick={onVolver}
        >
          <ArrowLeft size={16} />
          Volver
        </button>
        <button type="submit" className="btn btn--primario" disabled={guardando}>
          <Save size={16} />
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
        {!esNuevo && (
          <button
            type="button"
            className="btn btn--primario"
            onClick={enviar}
            disabled={guardando}
          >
            <Send size={16} />
            Enviar a aprobación
          </button>
        )}
      </div>
    </form>
  )
}
