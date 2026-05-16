import { test, expect } from '@playwright/test';

test.describe('Landing page', () => {
  test('shows the hero headline and the Google sign-in CTA', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      /Vos voyages, planifiés à plusieurs/i,
    );
    await expect(page.getByRole('button', { name: /Se connecter avec Google/i }).first()).toBeVisible();
  });

  test('renders the features grid', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Tout ce que vous mettiez dans Excel/i })).toBeVisible();
  });

  test('has correct meta robots tags on private routes', async ({ request }) => {
    const r = await request.get('/dashboard', { maxRedirects: 0 }).catch(() => null);
    // Either we are redirected to "/" or we get a 200 but with X-Robots-Tag noindex.
    if (r) {
      const robots = r.headers()['x-robots-tag'];
      if (r.status() === 200) expect(robots ?? '').toMatch(/noindex/i);
    }
  });
});
