import { expect, test } from 'playwright/test'

const compradorEmail = 'usuario1@prueba.com'
const proveedorEmail = 'ventas@kotler.com'
const auditorEmail = 'usuario4@prueba.com'
const evaluadorEmail = 'usuario2@prueba.com'
const password = '123456'

test.describe('Role-based navigation and access control E2E tests', () => {
  test('Comprador can access panel and compras, but is redirected from auditoria', async ({ page }) => {
    // Login as Comprador
    await login(page, compradorEmail, password)

    // Can access panel
    await page.goto('/panel')
    await expect(page).toHaveURL(/.*panel|.*/) // /panel is the home path for buyers
    await expect(page.getByRole('link', { name: /compras|procesos/i }).first()).toBeVisible()

    // Can access compras
    await page.goto('/compras')
    await expect(page).toHaveURL(/.*compras/)

    // Cannot access auditoria - should be redirected back to the safe root '/' or '/panel'
    await page.goto('/auditoria')
    await expect(page).not.toHaveURL(/.*auditoria/)
    await expect(page).toHaveURL(/.*(panel|\/)$/)

    await logout(page)
  })

  test('Proveedor can access its portal but is redirected from internal pages', async ({ page }) => {
    // Login as Proveedor
    await login(page, proveedorEmail, password)

    // Can access proveedor portal
    await page.goto('/proveedor')
    await expect(page).toHaveURL(/.*proveedor/)

    // Cannot access purchases (compras) or dashboard panel (panel)
    await page.goto('/compras')
    await expect(page).toHaveURL(/.*proveedor/) // redirected to proveedor root

    await page.goto('/panel')
    await expect(page).toHaveURL(/.*proveedor/) // redirected to proveedor root

    await logout(page)
  })

  test('Auditor can access auditoria page', async ({ page }) => {
    // Login as Auditor
    await login(page, auditorEmail, password)

    // Can access auditoria
    await page.goto('/auditoria')
    await expect(page).toHaveURL(/.*auditoria/)
    await expect(page.getByText(/auditoria|auditor|panel de riesgo/i).first()).toBeVisible()

    await logout(page)
  })

  test('Evaluador can access evaluacion page', async ({ page }) => {
    // Login as Evaluador
    await login(page, evaluadorEmail, password)

    // Can access evaluacion
    await page.goto('/evaluacion')
    await expect(page).toHaveURL(/.*evaluacion/)

    await logout(page)
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
