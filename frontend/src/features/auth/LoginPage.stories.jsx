import { MemoryRouter } from 'react-router-dom'
import { expect, userEvent, within } from 'storybook/test'
import { AuthProvider } from '../../auth/AuthContext'
import { LoginPage } from './LoginPage.jsx'

export default {
  title: 'Auth/LoginPage',
  component: LoginPage,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <Story />
        </AuthProvider>
      </MemoryRouter>
    ),
  ],
}

export const DemoAutofill = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: /usuario1@prueba.com/i }))

    await expect(canvas.getByLabelText(/Email/i)).toHaveValue('usuario1@prueba.com')
    await expect(canvas.getByLabelText(/Contrasena/i)).toHaveValue('123456')
  },
}

export const MfaFlow = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const calls = []
    const originalFetch = globalThis.fetch

    globalThis.fetch = async (input, init) => {
      calls.push({ input: String(input), init })
      const url = String(input)
      const body = JSON.parse(init?.body ?? '{}')

      if (url.endsWith('/api/auth/login')) {
        return jsonResponse({
          userId: '11111111-1111-1111-1111-111111111111',
          email: body.email,
          firstName: 'Usuario',
          lastName: 'MFA',
          role: 'Comprador',
          companyId: '22222222-2222-2222-2222-222222222222',
          requiresMfa: true,
          mfaEnabled: true,
          mfaToken: 'mfa-token-test',
        })
      }

      return jsonResponse({
        token: 'access-token-test',
        userId: '11111111-1111-1111-1111-111111111111',
        email: 'mfa@tests.local',
        firstName: 'Usuario',
        lastName: 'MFA',
        role: 'Comprador',
        companyId: '22222222-2222-2222-2222-222222222222',
        companyName: 'Tenant Test',
        mfaEnabled: true,
      })
    }

    try {
      await userEvent.type(canvas.getByLabelText(/Email/i), 'mfa@tests.local')
      await userEvent.type(canvas.getByLabelText(/Contrasena/i), 'Test123!')
      await userEvent.click(canvas.getByRole('button', { name: /Ingresar/i }))

      await expect(await canvas.findByLabelText(/Codigo MFA/i)).toBeInTheDocument()
      await userEvent.type(canvas.getByLabelText(/Codigo MFA/i), '123456')
      await userEvent.click(canvas.getByRole('button', { name: /Verificar codigo/i }))

      await expect(calls).toHaveLength(2)
      await expect(calls[0].input).toContain('/api/auth/login')
      await expect(calls[1].input).toContain('/api/auth/mfa/verify')
    } finally {
      globalThis.fetch = originalFetch
    }
  },
}

function jsonResponse(body) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}
