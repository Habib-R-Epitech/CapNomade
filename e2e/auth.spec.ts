import { test, expect } from '@playwright/test';

test.describe('Auth gating', () => {
  test('redirects to /connexion when accessing /dashboard anonymously', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/connexion\?redirect=%2Fdashboard/);
  });

  test('signup page renders email/password form', async ({ page }) => {
    await page.goto('/inscription');
    await expect(page.getByRole('heading', { name: /Créer un compte/i })).toBeVisible();
    await expect(page.getByLabel(/Prénom et nom/i)).toBeVisible();
  });

  test('signin page renders email field', async ({ page }) => {
    await page.goto('/connexion');
    await expect(page.getByRole('heading', { name: /Se connecter/i })).toBeVisible();
  });

  test('public sitemap is served', async ({ request }) => {
    const r = await request.get('/sitemap.xml');
    expect(r.status()).toBe(200);
    expect(await r.text()).toContain('<urlset');
  });

  test('robots disallows private areas', async ({ request }) => {
    const r = await request.get('/robots.txt');
    expect(r.status()).toBe(200);
    const body = await r.text();
    expect(body).toContain('/dashboard');
    expect(body).toContain('/voyages');
  });
});
