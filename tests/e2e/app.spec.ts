import { expect, test } from '@playwright/test';

test('app boots and renders the header', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Tincture' })).toBeVisible();
});
