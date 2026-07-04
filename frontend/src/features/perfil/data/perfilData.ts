import { activarMfa, desactivarMfa, prepararMfa } from '../../../shared/api/authApi'
import { actualizarPerfil, cambiarContrasena } from '../../../shared/api/usersApi'
import type { CambioContrasenaInput, PerfilInput } from '../../../domain/entities'

export const perfilKeys = {
  all: ['perfil'] as const,
  mfaSetup: () => [...perfilKeys.all, 'mfa-setup'] as const,
}

export function actualizarPerfilMutation(params: { id: string; datos: PerfilInput }) {
  return actualizarPerfil(params)
}

export function cambiarContrasenaMutation(params: { id: string } & CambioContrasenaInput) {
  return cambiarContrasena(params)
}

export function prepararMfaMutation() {
  return prepararMfa()
}

export function activarMfaMutation(params: { code: string }) {
  return activarMfa(params)
}

export function desactivarMfaMutation(params: { code: string }) {
  return desactivarMfa(params)
}
