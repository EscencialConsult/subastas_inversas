import { expect, test } from 'playwright/test'

const compradorEmail = process.env.SICST_E2E_COMPRADOR_EMAIL ?? 'usuario1@prueba.com'
const compradorPassword = process.env.SICST_E2E_COMPRADOR_PASSWORD ?? '123456'
const proveedorEmail = process.env.SICST_E2E_PROVEEDOR_EMAIL ?? 'ventas@kotler.com'
const proveedorPassword = process.env.SICST_E2E_PROVEEDOR_PASSWORD ?? '123456'
const auditorEmail = process.env.SICST_E2E_AUDITOR_EMAIL ?? 'usuario4@prueba.com'
const auditorPassword = process.env.SICST_E2E_AUDITOR_PASSWORD ?? '123456'

test.describe('SICST critical procurement flow', () => {
  test.skip(
    !process.env.SICST_E2E_BASE_URL,
    'Set SICST_E2E_BASE_URL and run backend/frontend with seeded demo users to execute E2E.',
  )

  test('login, create, publish, invite, bid, award and audit', async ({ page }) => {
    await login(page, compradorEmail, compradorPassword)

    await page.getByRole('link', { name: /compras|procesos/i }).first().click()
    await page.getByRole('link', { name: /nuevo|crear/i }).first().click()

    const title = `E2E proceso ${Date.now()}`
    await page.getByLabel(/titulo/i).fill(title)
    await page.getByLabel(/descripcion/i).fill('Proceso creado por la suite E2E crítica.')
    await page.getByRole('button', { name: /siguiente/i }).click()

    await page.getByLabel(/presupuesto/i).fill('100000')
    await page.getByRole('button', { name: /siguiente/i }).click()

    await page.getByRole('button', { name: /agregar/i }).click()
    await page.getByLabel(/descripcion/i).last().fill('Servicio E2E')
    await page.getByLabel(/cantidad/i).last().fill('1')
    await page.getByLabel(/unidad/i).last().fill('unidad')
    await page.getByRole('button', { name: /siguiente/i }).click()

    await continueUntil(page, /publicar proceso/i)
    await page.getByRole('button', { name: /publicar proceso/i }).click()
    await expect(page.getByText(title)).toBeVisible()

    await logout(page)
    await login(page, proveedorEmail, proveedorPassword)
    await page.getByRole('link', { name: /oportunidades|invitaciones|subastas/i }).first().click()
    await expect(page.getByText(title).or(page.getByText(/subasta|invitacion/i))).toBeVisible()

    await logout(page)
    await login(page, compradorEmail, compradorPassword)
    await page.getByRole('link', { name: /adjudic/i }).first().click()
    await expect(page.getByText(/adjudic|proceso/i)).toBeVisible()

    await logout(page)
    await login(page, auditorEmail, auditorPassword)
    await page.getByRole('link', { name: /auditor/i }).first().click()
    await expect(page.getByText(/auditor|evento|riesgo/i)).toBeVisible()
  })
})

async function login(page, email, password) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/contrasena/i).fill(password)
  await page.getByRole('button', { name: /ingresar/i }).click()
  await expect(page.getByRole('button', { name: /ingresar/i })).toBeHidden()
}

async function logout(page) {
  const logoutButton = page.getByRole('button', { name: /salir|cerrar sesion/i })
  if (await logoutButton.count()) {
    await logoutButton.first().click()
  } else {
    await page.goto('/login')
  }
}

async function continueUntil(page, buttonName) {
  for (let index = 0; index < 6; index += 1) {
    const target = page.getByRole('button', { name: buttonName })
    if (await target.count()) {
      return
    }

    const next = page.getByRole('button', { name: /siguiente/i })
    if (!(await next.count())) {
      return
    }

    await next.first().click()
  }
}
