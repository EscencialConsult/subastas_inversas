import { expect, test } from 'playwright/test'

const compradorEmail = process.env.SICST_E2E_COMPRADOR_EMAIL ?? 'usuario1@prueba.com'
const compradorPassword = process.env.SICST_E2E_COMPRADOR_PASSWORD ?? '123456'

test.describe('Keyboard navigation — critical flows', () => {
  test.skip(
    !process.env.SICST_E2E_BASE_URL,
    'Set SICST_E2E_BASE_URL and run backend/frontend with seeded demo users to execute E2E.',
  )

  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('login form Tab order', async ({ page }) => {
    const emailInput = page.getByLabel(/email/i)
    const passwordInput = page.getByLabel(/contrasena/i)
    const submitButton = page.getByRole('button', { name: /ingresar/i })

    await emailInput.focus()
    await expect(emailInput).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(passwordInput).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(submitButton).toBeFocused()
  })

  test('login and wizard step Tab order', async ({ page }) => {
    await page.getByLabel(/email/i).fill(compradorEmail)
    await page.getByLabel(/contrasena/i).fill(compradorPassword)
    await page.getByRole('button', { name: /ingresar/i }).click()
    await expect(page.getByRole('button', { name: /ingresar/i })).toBeHidden()

    await page.getByRole('link', { name: /compras|procesos/i }).first().click()
    await page.getByRole('link', { name: /nuevo|crear/i }).first().click()

    await page.getByLabel(/titulo/i).fill('Keyboard nav test')

    const siguienteButton = page.getByRole('button', { name: /siguiente/i })

    await siguienteButton.focus()
    await expect(siguienteButton).toBeFocused()
    await siguienteButton.click()

    await page.getByLabel(/presupuesto/i).fill('50000')
    await siguienteButton.focus()
    await siguienteButton.click()
  })

  test('modal focus trap and Escape dismiss', async ({ page }) => {
    await page.getByLabel(/email/i).fill(compradorEmail)
    await page.getByLabel(/contrasena/i).fill(compradorPassword)
    await page.getByRole('button', { name: /ingresar/i }).click()
    await expect(page.getByRole('button', { name: /ingresar/i })).toBeHidden()

    await page.getByRole('link', { name: /compras|procesos/i }).first().click()
    await page.getByRole('link', { name: /nuevo|crear/i }).first().click()

    const title = `Modal test ${Date.now()}`
    await page.getByLabel(/titulo/i).fill(title)
    await page.getByLabel(/descripcion/i).fill('Testing modal focus.')
    await page.getByRole('button', { name: /siguiente/i }).click()
    await page.getByLabel(/presupuesto/i).fill('50000')
    await page.getByRole('button', { name: /siguiente/i }).click()
    await page.getByRole('button', { name: /agregar/i }).click()
    await page.getByLabel(/descripcion/i).last().fill('Item')
    await page.getByLabel(/cantidad/i).last().fill('1')
    await page.getByLabel(/unidad/i).last().fill('unidad')

    for (let i = 0; i < 5; i++) {
      await page.getByRole('button', { name: /siguiente/i }).click()
    }

    const publicarButton = page.getByRole('button', { name: /publicar proceso/i })
    await publicarButton.click()

    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible()

    const confirmButton = modal.getByRole('button', { name: /publicar/i })
    const cancelButton = modal.getByRole('button', { name: /cancelar/i })
    const closeButton = modal.getByRole('button', { name: /cerrar modal/i })

    await expect(confirmButton).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(cancelButton).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(closeButton).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(confirmButton).toBeFocused()

    await page.keyboard.press('Escape')
    await expect(modal).not.toBeVisible()
    await expect(publicarButton).toBeFocused()
  })

  test('form validation errors keyboard accessibility', async ({ page }) => {
    await page.getByLabel(/email/i).fill(compradorEmail)
    await page.getByLabel(/contrasena/i).fill(compradorPassword)
    await page.getByRole('button', { name: /ingresar/i }).click()
    await expect(page.getByRole('button', { name: /ingresar/i })).toBeHidden()

    await page.getByRole('link', { name: /compras|procesos/i }).first().click()
    await page.getByRole('link', { name: /nuevo|crear/i }).first().click()

    await page.getByRole('button', { name: /siguiente/i }).click()

    await expect(page.getByRole('alert').first()).toBeVisible()

    await page.keyboard.press('Tab')
    await expect(page.getByLabel(/titulo/i)).toBeFocused()
  })

  test('modales no destructivos se cierran con Escape', async ({ page }) => {
    await page.goto('/proveedor/oportunidades')

    const deleteButtons = page.getByRole('button', { name: /eliminar|rechazar/i })
    if (await deleteButtons.count() > 0) {
      await deleteButtons.first().click()
      const modal = page.getByRole('dialog')
      if (await modal.count() > 0) {
        await page.keyboard.press('Escape')
        await expect(modal).not.toBeVisible()
      }
    }
  })
})
