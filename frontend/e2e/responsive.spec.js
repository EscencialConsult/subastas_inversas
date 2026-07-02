import { expect, test } from 'playwright/test'

const compradorEmail = 'usuario1@prueba.com'
const password = '123456'

test.use({ viewport: { width: 375, height: 667 } }) // Mobile viewport size

test.describe('Responsive and Mobile Layout E2E Tests', () => {

  test('Mobile sidebar hamburger menu open/close interaction', async ({ page }) => {
    // 1. Visit Login on Mobile and login
    await page.goto('/login')
    await page.getByRole('button', { name: compradorEmail }).first().click()
    await page.getByRole('button', { name: /ingresar/i }).click()
    await expect(page.getByRole('button', { name: /ingresar/i })).toBeHidden()

    // 2. We should be on the dashboard. Let's check viewport adaptability.
    // The desktop sidebar (nav containing links) should be hidden
    // Let's locate the desktop nav (which has className starting with 'hidden lg:flex')
    // In Tailwind, "hidden lg:flex" translates to display: none on screens smaller than 1024px.
    const desktopNav = page.locator('nav.hidden.lg\\:flex')
    await expect(desktopNav).toBeHidden()

    // 3. Hamburger button should be visible on mobile
    const hamburgerBtn = page.getByRole('button', { name: /abrir menú de navegación/i })
    await expect(hamburgerBtn).toBeVisible()

    // 4. Mobile sidebar should be hidden initially
    const mobileSidebar = page.getByRole('navigation', { name: /menú de navegación móvil/i })
    await expect(mobileSidebar).toBeHidden()

    // 5. Open mobile sidebar by clicking hamburger
    await hamburgerBtn.click()
    await expect(mobileSidebar).toBeVisible()

    // Verify navigation links are visible inside the mobile menu
    const comprasLink = mobileSidebar.getByRole('link', { name: /compras/i })
    await expect(comprasLink).toBeVisible()

    // 6. Close mobile sidebar by clicking the close button
    const closeBtn = page.getByRole('button', { name: /cerrar menú de navegación/i })
    await expect(closeBtn).toBeVisible()
    await closeBtn.click()

    // Mobile sidebar should be hidden again
    await expect(mobileSidebar).toBeHidden()
  })
})
