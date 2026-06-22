// Base de datos simulada en memoria.
//
// Mientras el backend no existe, todo el frontend trabaja contra estos datos.
// Cada registro lleva su `tenantId` para que se note desde el día uno que el
// aislamiento por tenant es parte del diseño, no un agregado posterior.

import { ROLES } from '../domain/roles.js'
import { ESTADO_PROCESO } from '../domain/compras.js'

// Tenants = empresas/municipios cliente. Los administra el Super Administrador.
export const tenants = [
  {
    id: 't-municipio-tucuman',
    nombre: 'Municipio de San Miguel de Tucumán',
    subdominio: 'tucuman',
    activo: true,
  },
  {
    id: 't-escencial',
    nombre: 'Escencial Consultora',
    subdominio: 'escencial',
    activo: true,
  },
]

// Usuarios. OJO: cada uno pertenece a un tenant (salvo el super-admin de plataforma).
export const usuarios = [
  {
    id: 'u-1',
    tenantId: null, // plataforma: vive fuera de la pared del tenant
    nombre: 'Admin',
    apellido: 'Plataforma',
    email: 'admin@sicstmax.com',
    rol: ROLES.SUPER_ADMIN,
    activo: true,
  },
  {
    id: 'u-2',
    tenantId: 't-municipio-tucuman',
    nombre: 'Laura',
    apellido: 'Gómez',
    email: 'laura.gomez@tucuman.gob.ar',
    rol: ROLES.ADMIN_TENANT,
    activo: true,
  },
  {
    id: 'u-3',
    tenantId: 't-municipio-tucuman',
    nombre: 'Diego',
    apellido: 'Ruiz',
    email: 'diego.ruiz@tucuman.gob.ar',
    rol: ROLES.COMPRADOR,
    activo: true,
  },
  {
    id: 'u-4',
    tenantId: 't-municipio-tucuman',
    nombre: 'Marcela',
    apellido: 'Sosa',
    email: 'marcela.sosa@tucuman.gob.ar',
    rol: ROLES.EVALUADOR,
    activo: false,
  },
  {
    id: 'u-5',
    tenantId: 't-escencial',
    nombre: 'Pablo',
    apellido: 'Herrera',
    email: 'pablo.herrera@escencial.com',
    rol: ROLES.ADMIN_TENANT,
    activo: true,
  },
  {
    // Proveedor: usuario EXTERNO. No pertenece a ningún tenant comprador
    // (tenantId null), porque puede ofertar en subastas de distintos municipios.
    id: 'u-6',
    tenantId: null,
    nombre: 'Insumos del Norte',
    apellido: 'SRL',
    email: 'ventas@insumosnorte.com',
    rol: ROLES.PROVEEDOR,
    activo: true,
  },
  {
    id: 'u-7',
    tenantId: 't-municipio-tucuman',
    nombre: 'Roberto',
    apellido: 'Díaz',
    email: 'roberto.diaz@tucuman.gob.ar',
    rol: ROLES.APROBADOR,
    activo: true,
  },
  {
    id: 'u-8',
    tenantId: 't-municipio-tucuman',
    nombre: 'Carla',
    apellido: 'Núñez',
    email: 'carla.nunez@tucuman.gob.ar',
    rol: ROLES.EVALUADOR,
    activo: true,
  },
  {
    id: 'u-9',
    tenantId: 't-municipio-tucuman',
    nombre: 'Hugo',
    apellido: 'Ramírez',
    email: 'hugo.ramirez@tucuman.gob.ar',
    rol: ROLES.AUDITOR,
    activo: true,
  },
]

// Proveedores: el perfil de empresa de cada usuario con rol PROVEEDOR.
// Se vincula al usuario por `usuarioId`. El `estado` arranca en 'pendiente'
// hasta que se verifique (más adelante, vía ARCA).
export const proveedores = [
  {
    id: 'p-1',
    usuarioId: 'u-6',
    razonSocial: 'Insumos del Norte SRL',
    cuit: '30-12345678-9',
    estado: 'verificado',
  },
]

// Procesos de compra. Pertenecen a un tenant (aislamiento) y los crea un comprador.
export const procesosCompra = [
  {
    id: 'pc-1',
    tenantId: 't-municipio-tucuman',
    codigo: 'PC-0001',
    titulo: 'Compra de insumos de limpieza',
    descripcion: 'Provisión de insumos de limpieza para edificios municipales.',
    presupuestoEstimado: 500000,
    estado: ESTADO_PROCESO.BORRADOR,
    compradorId: 'u-3',
    creadoEn: '2026-06-10',
  },
  {
    id: 'pc-2',
    tenantId: 't-municipio-tucuman',
    codigo: 'PC-0002',
    titulo: 'Adquisición de equipos informáticos',
    descripcion: 'Compra de 30 computadoras para oficinas administrativas.',
    presupuestoEstimado: 9000000,
    estado: ESTADO_PROCESO.PENDIENTE_APROBACION,
    compradorId: 'u-3',
    creadoEn: '2026-06-15',
  },
]

// Subastas. Una por proceso de compra que llegó a la etapa de subasta.
// Es una subasta INVERSA: gana el menor precio, así que la "mejor oferta"
// es el lance más bajo. Arranca vacía: se crea al iniciar la subasta.
export const subastas = []

// Contador simple para generar ids nuevos en el mock.
let seq = usuarios.length + proveedores.length + procesosCompra.length
export function nextId(prefijo = 'u') {
  seq += 1
  return `${prefijo}-${seq}`
}
