import { expect, test } from '@playwright/test';
import { getDocument } from './helpers';

test('a color-editor swatch shows the OKLCH color wheel', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.mintcn-preview');

  const colorSection = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Colors' }) });
  await colorSection
    .getByRole('button')
    .filter({ hasText: /^primary$/ })
    .first()
    .click();

  const wheel = colorSection.locator('[data-mintcn-color-wheel]').first();
  await expect(wheel).toBeVisible();
  await expect(wheel).toHaveAttribute('width', '168');
});

test('clicking a point on the wheel updates --primary in the document', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.mintcn-preview');

  const colorSection = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Colors' }) });
  await colorSection
    .getByRole('button')
    .filter({ hasText: /^primary$/ })
    .first()
    .click();

  const doc = await getDocument(page);
  const before = (doc?.tokens.colors.light.primary as { value: string }).value;

  const wheel = colorSection.locator('[data-mintcn-color-wheel]').first();
  await wheel.scrollIntoViewIfNeeded();
  // Click at a definite off-center position (0.85, 0.15) → high chroma, hue ~ 45°.
  // Using Playwright's locator.click(position) so coords are relative to the
  // element's box regardless of scroll.
  const box = await wheel.boundingBox();
  if (!box) throw new Error('wheel has no bounding box');
  await wheel.click({ position: { x: box.width * 0.85, y: box.height * 0.15 } });

  await expect
    .poll(async () => {
      const next = await getDocument(page);
      return (next?.tokens.colors.light.primary as { value: string }).value;
    })
    .not.toBe(before);
});
