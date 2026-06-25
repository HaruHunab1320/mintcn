import { expect, test } from '@playwright/test';

test('force-state toggle sets data-force-state on PreviewRoot', async ({ page }) => {
  await page.goto('/');
  const preview = page.locator('.tincture-preview');
  await expect(preview).toBeVisible();
  await expect(preview).not.toHaveAttribute('data-force-state');

  await page.getByRole('button', { name: 'hover', exact: true }).click();
  await expect(preview).toHaveAttribute('data-force-state', 'hover');

  await page.getByRole('button', { name: 'disabled', exact: true }).click();
  await expect(preview).toHaveAttribute('data-force-state', 'disabled');

  await page.getByRole('button', { name: 'off', exact: true }).click();
  await expect(preview).not.toHaveAttribute('data-force-state');
});

test('force-disabled visibly fades a primary button via --disabled-opacity', async ({ page }) => {
  await page.goto('/');
  const primaryButton = page
    .locator('.tincture-preview [data-slot="button"][data-variant="default"]')
    .first();
  await expect(primaryButton).toBeVisible();
  const opacityBefore = await primaryButton.evaluate((el) => getComputedStyle(el).opacity);
  expect(opacityBefore).toBe('1');

  await page.getByRole('button', { name: 'disabled', exact: true }).click();
  await expect(primaryButton).toHaveCSS('opacity', '0.5');
});

test('force-active visibly scales a primary button via --active-scale', async ({ page }) => {
  await page.goto('/');
  const primaryButton = page
    .locator('.tincture-preview [data-slot="button"][data-variant="default"]')
    .first();
  await page.getByRole('button', { name: 'active', exact: true }).click();
  // transform reads as a matrix; we just assert it's no longer 'none' and is
  // visibly scaled down (Tailwind transitions are ~150ms so we wait for it).
  await expect(primaryButton).not.toHaveCSS('transform', 'none');
  await expect
    .poll(async () => primaryButton.evaluate((el) => getComputedStyle(el).transform), {
      timeout: 1500,
    })
    .toMatch(/matrix\(0\.97/);
});
