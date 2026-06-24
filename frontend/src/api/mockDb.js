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
    rol: ROLES.ADMINISTRADOR,
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
    rol: ROLES.ADMINISTRADOR,
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
    rol: ROLES.AUTORIDAD,
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
    provincia: 'Tucumán',
    rubro: 'Insumos de limpieza',
  },
  {
    id: 'p-2',
    usuarioId: null,
    razonSocial: 'Distribuidora Sur',
    cuit: '30-87654321-2',
    estado: 'verificado',
    provincia: 'Tucumán',
    rubro: 'Equipamiento informático',
  },
  {
    id: 'p-3',
    usuarioId: null,
    razonSocial: 'Comercial Andina',
    cuit: '30-55667788-3',
    estado: 'verificado',
    provincia: 'Salta',
    rubro: 'Servicios de mantenimiento',
  },
  {
    id: 'p-4',
    usuarioId: null,
    razonSocial: 'Materiales del Centro',
    cuit: '27-11223344-5',
    estado: 'pendiente',
    provincia: 'Córdoba',
    rubro: 'Materiales de construcción',
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
    estado: ESTADO_PROCESO.PUBLICADO,
    compradorId: 'u-3',
    creadoEn: '2026-06-15',
  },
  {
    // Proceso YA cerrado (subasta hecha, adjudicada y aprobada): sirve de ejemplo
    // para ver la supervisión con datos reales.
    id: 'pc-3',
    tenantId: 't-municipio-tucuman',
    codigo: 'PC-0003',
    titulo: 'Servicio de mantenimiento de vehículos',
    descripcion: 'Mantenimiento preventivo de la flota municipal por 6 meses.',
    presupuestoEstimado: 3000000,
    estado: ESTADO_PROCESO.APROBADA,
    compradorId: 'u-3',
    creadoEn: '2026-06-05',
    adjudicacion: {
      compradorId: 'u-3',
      proveedor: 'Comercial Andina',
      monto: 2520000,
      fecha: '2026-06-18',
    },
    aprobacion: { autoridadId: 'u-7', fecha: '2026-06-19', estado: 'aprobada' },
  },
]

// Subastas. Una por proceso de compra que llegó a la etapa de subasta.
// Es una subasta INVERSA: gana el menor precio, así que la "mejor oferta"
// es el lance más bajo. Trae una de ejemplo (la del proceso pc-3, ya cerrado).
export const subastas = [
  {
    id: 's-1',
    procesoId: 'pc-3',
    tenantId: 't-municipio-tucuman',
    precioBase: 3000000,
    inicioISO: '2026-06-18T10:00:00.000Z',
    duracionMin: 10,
    lances: [
      { id: 'l-1', proveedor: 'Insumos del Norte SRL', monto: 2850000, hace: 'cerrada' },
      { id: 'l-2', proveedor: 'Distribuidora Sur', monto: 2650000, hace: 'cerrada' },
      { id: 'l-3', proveedor: 'Comercial Andina', monto: 2520000, hace: 'cerrada' },
    ],
  },
]

// Contador simple para generar ids nuevos en el mock.
let seq = usuarios.length + proveedores.length + procesosCompra.length
export function nextId(prefijo = 'u') {
  seq += 1
  return `${prefijo}-${seq}`
}
