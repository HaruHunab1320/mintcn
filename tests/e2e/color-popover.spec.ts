import { expect, test } from '@playwright/test';

test('double-clicking a swatch opens a color picker popover anchored next to it', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForSelector('.tincture-preview');

  // The `primary` swatch in the Colors panel — scoped via the section.
  const colorsPanel = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Colors' }) });
  const primarySwatch = colorsPanel
    .getByRole('button')
    .filter({ hasText: /^primary$/ })
    .first();
  await primarySwatch.dblclick();

  const popover = page.getByRole('dialog', { name: 'Edit primary color' });
  await expect(popover).toBeVisible();
  await expect(popover.getByRole('button', { name: 'close' })).toBeVisible();
});

test('the popover editor writes to the document via its OKLCH text input', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.tincture-preview');

  const colorsPanel = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Colors' }) });
  await colorsPanel
    .getByRole('button')
    .filter({ hasText: /^primary$/ })
    .first()
    .dblclick();

  const popover = page.getByRole('dialog', { name: 'Edit primary color' });
  // The popover shows the ColorEditor, which exposes an aria-label 'primary value'.
  const valueInput = popover.getByLabel('primary value', { exact: true });
  await valueInput.fill('oklch(0.55 0.22 30)');
  await valueInput.blur();

  const value = await page.evaluate(() => {
    const win = window as unknown as {
      __TINCTURE_STORE__: { getState: () => { document: unknown } };
    };
    const doc = win.__TINCTURE_STORE__.getState().document as {
      tokens: { colors: { light: { primary: { value: string } } } };
    };
    return doc.tokens.colors.light.primary.value;
  });
  expect(value).toBe('oklch(0.55 0.22 30)');
});

test('Escape closes the color popover', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.tincture-preview');

  const colorsPanel = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Colors' }) });
  await colorsPanel
    .getByRole('button')
    .filter({ hasText: /^primary$/ })
    .first()
    .dblclick();
  await expect(page.getByRole('dialog', { name: 'Edit primary color' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Edit primary color' })).toHaveCount(0);
});
