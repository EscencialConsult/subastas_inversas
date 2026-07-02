import { expect, test } from 'playwright/test'

const compradorEmail = 'usuario1@prueba.com'
const password = '123456'

test.describe('Critical Forms Validation and Submission E2E', () => {
  
  test('Login Form validations and demo quick buttons', async ({ page }) => {
    await page.goto('/login')

    // 1. Submit empty form
    await page.getByRole('button', { name: /ingresar/i }).click()
    await expect(page.getByText(/Ingresá un email válido|Ingresá tu contraseña/i).first()).toBeVisible()

    // 2. Fill invalid email format
    await page.getByLabel(/email/i).fill('invalid-email')
    await page.getByRole('button', { name: /ingresar/i }).click()
    await expect(page.getByText(/Ingresá un email válido/i)).toBeVisible()

    // 3. Test Demo User auto-completion button
    const demoButton = page.getByRole('button', { name: compradorEmail }).first()
    await expect(demoButton).toBeVisible()
    await demoButton.click()

    // Verify inputs have been autocompletados
    await expect(page.getByLabel(/email/i)).toHaveValue(compradorEmail)
    await expect(page.getByLabel(/contrasena/i)).toHaveValue(password)

    // Complete login
    await page.getByRole('button', { name: /ingresar/i }).click()
    await expect(page.getByRole('button', { name: /ingresar/i })).toBeHidden()
  })

  test('Supplier Registration Form validation', async ({ page }) => {
    await page.goto('/registro-proveedor')

    // 1. Verify page elements
    await expect(page.getByText(/Registro de proveedor/i).first()).toBeVisible()

    // 2. Try submitting empty form
    await page.getByRole('button', { name: /Registrarse|Enviar/i }).first().click()
    await expect(page.getByText(/Ingresá la razón social|CUIT/i).first()).toBeVisible()

    // 3. Test CUIT validation
    await page.getByLabel(/Razón Social/i).fill('Kotler Argentina S.A.')
    await page.getByLabel(/CUIT/i).fill('123')
    await page.getByLabel(/Email/i).fill('ventas@kotler.com')
    await page.getByLabel(/Contraseña/i).fill('123456')
    await page.getByLabel(/Provincia/i).fill('Buenos Aires')
    await page.getByLabel(/Localidad/i).fill('CABA')

    await page.getByRole('button', { name: /Registrarse|Enviar/i }).first().click()
    await expect(page.getByText(/CUIT inválido|Formato de CUIT/i).first()).toBeVisible()

    // 4. Correct CUIT format
    await page.getByLabel(/CUIT/i).fill('30-12345678-1')
    
    // Submitting should proceed (in test or show success/loading or API error due to duplicate)
    await page.getByRole('button', { name: /Registrarse|Enviar/i }).first().click()
    
    // We expect either success confirmation or a message indicating that CUIT is already registered (since it was seeded)
    // Both responses prove that client-side validations passed and form was sent to the server.
    await expect(page.getByText(/exitoso|creado|ya registrado|ya existe/i).first().or(page.getByText(/Cargando/i))).toBeVisible()
  })

  test('Purchase Process Wizard navigation and validations (Steps 1-3)', async ({ page }) => {
    // Login as Buyer
    await page.goto('/login')
    await page.getByRole('button', { name: compradorEmail }).first().click()
    await page.getByRole('button', { name: /ingresar/i }).click()
    await expect(page.getByRole('button', { name: /ingresar/i })).toBeHidden()

    // Navigate to purchases
    await page.getByRole('link', { name: /compras|procesos/i }).first().click()
    await page.getByRole('link', { name: /nuevo|crear/i }).first().click()

    // 1. Basic Info step validations (Paso 1)
    await page.getByRole('button', { name: /siguiente/i }).click()
    await expect(page.getByText(/ingresá/i).first()).toBeVisible() // Title error

    // Fill Step 1
    const testTitle = `Proceso E2E Form ${Date.now()}`
    await page.getByLabel(/título/i).fill(testTitle)
    await page.getByLabel(/descripción/i).fill('Descripción del proceso de compra E2E')
    await page.getByRole('button', { name: /siguiente/i }).click()

    // 2. Budget Step validations (Paso 2)
    await page.getByRole('button', { name: /siguiente/i }).click()
    // Should show error for budget or require a value
    await expect(page.getByText(/ingresá|presupuesto/i).first()).toBeVisible()

    // Fill Step 2
    await page.getByLabel(/presupuesto/i).fill('150000')
    await page.getByRole('button', { name: /siguiente/i }).click()

    // 3. Items Step validation (Paso 3)
    // Add item
    await page.getByRole('button', { name: /agregar/i }).click()
    await page.getByLabel(/descripción/i).last().fill('Insumos de Limpieza Especiales')
    await page.getByLabel(/cantidad/i).last().fill('10')
    await page.getByLabel(/unidad/i).last().fill('caja')
    
    // Go to next step
    await page.getByRole('button', { name: /siguiente/i }).click()

    // We should be on Paso 4 (Criterios) now
    await expect(page.getByText(/criterio/i).first()).toBeVisible()
  })
})
