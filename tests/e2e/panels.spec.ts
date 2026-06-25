import { expect, test } from '@playwright/test';

test('property panel renders all sections', async ({ page }) => {
  await page.goto('/');
  for (const heading of ['Colors', 'Radius', 'Typography', 'Shadows', 'Component']) {
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  }
});

test('color panel: editing primary updates the preview', async ({ page }) => {
  await page.goto('/');
  const preview = page.locator('.tincture-preview');
  await expect(preview).toBeVisible();

  await page
    .getByRole('button')
    .filter({ hasText: /^primary$/ })
    .first()
    .click();
  const colorInput = page.locator('input[type="text"]').first();
  await colorInput.fill('oklch(0.7 0.2 30)');
  await colorInput.blur();

  await expect(preview).toHaveAttribute('style', /--primary:\s*oklch\(0\.7 0\.2 30\)/);
});

test('radius panel: editing --radius updates the preview', async ({ page }) => {
  await page.goto('/');
  const preview = page.locator('.tincture-preview');
  const radiusText = page.locator('input[type="text"]').filter({ hasText: '' }).nth(1);
  await radiusText.fill('1rem');
  await radiusText.blur();
  await expect(preview).toHaveAttribute('style', /--radius:\s*1rem/);
});

test('typography panel: editing --font-sans flows into the document', async ({ page }) => {
  await page.goto('/');
  const sansInput = page.locator('label:has-text("--font-sans") input');
  await sansInput.fill('"Geist", sans-serif');
  await sansInput.blur();

  const fontFamily = await page.evaluate(() => {
    const win = window as unknown as {
      __TINCTURE_STORE__: { getState: () => { document: unknown } };
    };
    const doc = win.__TINCTURE_STORE__.getState().document as {
      tokens: { typography: { fontFamily: { sans: string } } };
    };
    return doc.tokens.typography.fontFamily.sans;
  });
  expect(fontFamily).toBe('"Geist", sans-serif');
});

test('component panel: switching components updates the inspector', async ({ page }) => {
  await page.goto('/');
  const select = page.locator('select');
  // The component selector defaults to the first option in alphabetical order;
  // with the full v4 fixture that's `accordion`.
  await expect(select).toHaveValue('accordion');

  await select.selectOption('button');
  await expect(page.getByText('components/ui/button.tsx', { exact: false })).toBeVisible();
  // The button has two cva variant axes
  await expect(page.locator('p').filter({ hasText: /^variant$/ })).toBeVisible();
  await expect(page.locator('p').filter({ hasText: /^size$/ })).toBeVisible();
});
