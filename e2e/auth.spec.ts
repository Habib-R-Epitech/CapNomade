import { test, expect } from '@playwright/test';

test.describe('Auth gating', () => {
  test('redirects to landing with signin flag when accessing /dashboard anonymously', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/\?signin=1&redirect=%2Fdashboard/);
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
