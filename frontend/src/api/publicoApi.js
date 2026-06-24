// API simulada del PORTAL CIUDADANO (público, sin login).
//
// Transparencia: el ciudadano ve los procesos y la subasta en vivo, pero de
// forma ANÓNIMA (sin identidades de proveedores). Solo datos públicos.

import { simularRed, ApiError } from './client.js'
import { tenants, procesosCompra, subastas } from './mockDb.js'
import { mejorOferta } from './subastasApi.js'
import { ESTADO_PROCESO } from '../domain/compras.js'

// Estados visibles al público: todo menos el borrador (que es interno).
const PUBLICOS = [
  ESTADO_PROCESO.PUBLICADO,
  ESTADO_PROCESO.EN_SUBASTA,
  ESTADO_PROCESO.CERRADA,
  ESTADO_PROCESO.ADJUDICADA,
  ESTADO_PROCESO.APROBADA,
]

export function listarProcesosPublicos({ busqueda = '', estado = '' } = {}) {
  return simularRed(() => {
    let filas = procesosCompra
      .filter((p) => PUBLICOS.includes(p.estado))
      .map((p) => {
        const empresa = tenants.find((t) => t.id === p.tenantId)
        return {
          id: p.id,
          codigo: p.codigo,
          titulo: p.titulo,
          estado: p.estado,
          empresa: empresa?.nombre ?? '—',
          tieneSubasta: subastas.some((s) => s.procesoId === p.id),
        }
      })

    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase()
      filas = filas.filter((f) =>
        `${f.codigo} ${f.titulo} ${f.empresa}`.toLowerCase().includes(q),
      )
    }
    if (estado) filas = filas.filter((f) => f.estado === estado)
    return filas
  })
}

// Snapshot ANÓNIMO de una subasta: precio actual, base, cantidad de lances y los
// montos (sin proveedor). Las identidades no se muestran en el portal público.
export function obtenerSubastaPublica({ procesoId }) {
  return simularRed(() => {
    const proceso = procesosCompra.find((p) => p.id === procesoId)
    if (!proceso) throw new ApiError('Proceso no encontrado.', 404)
    const subasta = subastas.find((s) => s.procesoId === procesoId)
    if (!subasta) throw new ApiError('Esta subasta no está disponible.', 404)

    const empresa = tenants.find((t) => t.id === proceso.tenantId)
    return {
      codigo: proceso.codigo,
      titulo: proceso.titulo,
      empresa: empresa?.nombre ?? '—',
      estadoProceso: proceso.estado,
      precioBase: subasta.precioBase,
      precioActual: mejorOferta(subasta),
      cantidadLances: subasta.lances.length,
      inicioISO: subasta.inicioISO,
      duracionMin: subasta.duracionMin,
      // Solo montos, ordenados del más bajo al más alto. Sin identidades.
      montos: subasta.lances.map((l) => l.monto).sort((a, b) => a - b),
    }
  })
}
