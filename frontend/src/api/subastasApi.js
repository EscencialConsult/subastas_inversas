// API simulada de subastas (MAQUETA).
//
// La subasta inversa REAL (lances en vivo, reloj autoritativo del servidor,
// control de concurrencia, registro inviolable) se implementa con el backend.
// Acá solo simulamos los datos para poder maquetar y mostrar la pantalla.

import { simularRed, ApiError } from './client.js'
import { subastas, procesosCompra, nextId } from './mockDb.js'
import { ESTADO_PROCESO } from '../domain/compras.js'

const DURACION_MIN = 10 // duración de la subasta, en minutos (maqueta)

// Inicia la subasta de un proceso APROBADO: lo pasa a "En subasta" y crea la
// subasta con unos lances de ejemplo (como si ya hubieran ofertado proveedores).
export function iniciarSubasta({ tenantId, procesoId }) {
  return simularRed(() => {
    const proceso = procesosCompra.find(
      (p) => p.id === procesoId && p.tenantId === tenantId,
    )
    if (!proceso) throw new ApiError('Proceso de compra no encontrado.', 404)
    if (proceso.estado !== ESTADO_PROCESO.APROBADO) {
      throw new ApiError('Solo se puede iniciar la subasta de un proceso aprobado.', 409)
    }
    if (subastas.some((s) => s.procesoId === procesoId)) {
      throw new ApiError('Este proceso ya tiene una subasta.', 409)
    }

    proceso.estado = ESTADO_PROCESO.EN_SUBASTA

    const precioBase = proceso.presupuestoEstimado || 1000000
    // Lances de ejemplo, descendentes (es subasta inversa).
    const lances = [
      { id: nextId('l'), proveedor: 'Insumos del Norte SRL', monto: Math.round(precioBase * 0.95), hace: '4 min' },
      { id: nextId('l'), proveedor: 'Distribuidora Sur', monto: Math.round(precioBase * 0.91), hace: '2 min' },
      { id: nextId('l'), proveedor: 'Comercial Andina', monto: Math.round(precioBase * 0.88), hace: '1 min' },
    ]

    const subasta = {
      id: nextId('s'),
      procesoId,
      tenantId,
      precioBase,
      inicioISO: new Date().toISOString(),
      duracionMin: DURACION_MIN,
      lances,
    }
    subastas.push(subasta)
    return clonar(subasta)
  })
}

// Cierra la subasta: el proceso pasa a evaluación.
// (En el sistema real, el CIERRE lo decide el reloj autoritativo del servidor;
// acá lo dispara el comprador desde el monitor.)
export function cerrarSubasta({ tenantId, procesoId }) {
  return simularRed(() => {
    const proceso = procesosCompra.find(
      (p) => p.id === procesoId && p.tenantId === tenantId,
    )
    if (!proceso) throw new ApiError('Proceso de compra no encontrado.', 404)
    if (proceso.estado !== ESTADO_PROCESO.EN_SUBASTA) {
      throw new ApiError('La subasta no está abierta.', 409)
    }
    proceso.estado = ESTADO_PROCESO.EVALUACION
    return { ...proceso }
  })
}

export function obtenerSubastaDeProceso({ tenantId, procesoId }) {
  return simularRed(() => {
    const subasta = subastas.find(
      (s) => s.procesoId === procesoId && s.tenantId === tenantId,
    )
    if (!subasta) throw new ApiError('Esta subasta no existe.', 404)
    return clonar(subasta)
  })
}

// Simula que un proveedor mete un lance mejor (más bajo). Solo para la maqueta:
// genera un monto un poco menor al mejor actual.
export function simularLance({ tenantId, procesoId }) {
  return simularRed(() => {
    const subasta = subastas.find(
      (s) => s.procesoId === procesoId && s.tenantId === tenantId,
    )
    if (!subasta) throw new ApiError('Esta subasta no existe.', 404)

    const mejor = mejorOferta(subasta)
    const nuevoMonto = Math.round(mejor * 0.98) // 2% por debajo del mejor
    const proveedores = ['Insumos del Norte SRL', 'Distribuidora Sur', 'Comercial Andina']
    const proveedor = proveedores[subasta.lances.length % proveedores.length]

    subasta.lances.push({
      id: nextId('l'),
      proveedor,
      monto: nuevoMonto,
      hace: 'recién',
    })
    return clonar(subasta)
  })
}

// La mejor oferta de una subasta inversa es el MENOR monto ofertado.
export function mejorOferta(subasta) {
  if (!subasta.lances.length) return subasta.precioBase
  return Math.min(...subasta.lances.map((l) => l.monto))
}

function clonar(subasta) {
  return { ...subasta, lances: subasta.lances.map((l) => ({ ...l })) }
}
