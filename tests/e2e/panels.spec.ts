import { expect, test } from '@playwright/test';

test('property panel renders all sections', async ({ page }) => {
  await page.goto('/');
  for (const heading of [
    'Presets',
    'Colors',
    'Radius',
    'Typography',
    'Shadows',
    'States',
    'Durations',
    'Easings',
    'Keyframes',
    'Overrides',
    'Component',
  ]) {
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  }
});

test('keyframe panel: editing a stop declaration flows into the document', async ({ page }) => {
  await page.goto('/');
  // The fixture ships `tincture-pulse` (3 stops). Expand it.
  await page.getByRole('button', { name: /@keyframes tincture-pulse/ }).click();

  // Stop 1 (the 50% stop) has opacity: 0.5. Change it to 0.3.
  const opacityInput = page.getByLabel('stop 1 opacity', { exact: true });
  await opacityInput.fill('0.3');
  await opacityInput.blur();

  const value = await page.evaluate(() => {
    const win = window as unknown as {
      __TINCTURE_STORE__: { getState: () => { document: unknown } };
    };
    const doc = win.__TINCTURE_STORE__.getState().document as {
      tokens: {
        animations?: {
          keyframes?: Record<string, { stops: { declarations: Record<string, string> }[] }>;
        };
      };
    };
    return doc.tokens.animations?.keyframes?.['tincture-pulse']?.stops[1]?.declarations.opacity;
  });
  expect(value).toBe('0.3');
});

test('state panel: editing disabled-opacity changes force-disabled rendering', async ({ page }) => {
  await page.goto('/');
  const primary = page
    .locator('.tincture-preview [data-slot="button"][data-variant="default"]')
    .first();

  const disabledInput = page.getByLabel('disabled-opacity', { exact: true });
  await disabledInput.fill('0.2');
  await disabledInput.blur();

  await page.getByRole('button', { name: 'disabled', exact: true }).click();
  await expect(primary).toHaveCSS('opacity', '0.2');
});

test('animation panel: setDuration adds a new --duration-* entry to the document', async ({
  page,
}) => {
  await page.goto('/');
  const newDurationInput = page.getByPlaceholder('new duration (e.g. fast)');
  await newDurationInput.fill('xfast');

  // The "add" button next to this row is the next sibling button — scope by parent.
  const addButton = newDurationInput.locator(
    'xpath=following-sibling::button[normalize-space()="add"]',
  );
  await addButton.click();

  const value = await page.evaluate(() => {
    const win = window as unknown as {
      __TINCTURE_STORE__: { getState: () => { document: unknown } };
    };
    const doc = win.__TINCTURE_STORE__.getState().document as {
      tokens: { animations?: { durations: Record<string, string> } };
    };
    return doc.tokens.animations?.durations.xfast;
  });
  expect(value).toBe('150ms');
});

test('color panel: editing primary updates the preview', async ({ page }) => {
  await page.goto('/');
  const preview = page.locator('.tincture-preview');
  await expect(preview).toBeVisible();

  const colorSection = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Colors' }) });
  await colorSection
    .getByRole('button')
    .filter({ hasText: /^primary$/ })
    .first()
    .click();
  const colorInput = colorSection.locator('input[type="text"]').first();
  await colorInput.fill('oklch(0.7 0.2 30)');
  await colorInput.blur();

  await expect(preview).toHaveAttribute('style', /--primary:\s*oklch\(0\.7 0\.2 30\)/);
});

test('radius panel: editing --radius updates the preview', async ({ page }) => {
  await page.goto('/');
  const preview = page.locator('.tincture-preview');
  const radiusSection = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Radius' }) });
  const radiusText = radiusSection.locator('input[type="text"]');
  await radiusText.fill('1rem');
  await radiusText.blur();
  await expect(preview).toHaveAttribute('style', /--radius:\s*1rem/);
});

test('typography panel: editing --font-sans flows into the document', async ({ page }) => {
  await page.goto('/');
  // The new typography panel uses a chip-based row: pick button + raw text
  // fallthrough. Both target the same store field. Use the raw text input
  // (aria-labeled "--font-sans") to bypass the picker for this smoke test.
  const sansInput = page.getByLabel('--font-sans', { exact: true });
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

test('override panel: editing button size.sm flows into the document as a replaceWith delta', async ({
  page,
}) => {
  await page.goto('/');

  // The override panel's component select defaults to the first cva component
  // (alphabetically: accordion has no variants → first match is `badge`).
  // Switch to button so we can edit size.sm.
  const overrideSelect = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Overrides' }) })
    .locator('select');
  await overrideSelect.selectOption('button');

  const smTextarea = page.getByLabel('button size sm base classes', { exact: true });
  await smTextarea.fill('h-8 rounded-md px-5 text-lg');
  await smTextarea.blur();

  const override = await page.evaluate(() => {
    const win = window as unknown as {
      __TINCTURE_STORE__: { getState: () => { document: unknown } };
    };
    const doc = win.__TINCTURE_STORE__.getState().document as {
      overrides: {
        componentId: string;
        variants?: Record<string, Record<string, { replaceWith?: string }>>;
      }[];
    };
    return doc.overrides.find((o) => o.componentId === 'button');
  });
  expect(override?.variants?.size?.sm.replaceWith).toBe('h-8 rounded-md px-5 text-lg');
});

test('component panel: switching components updates the inspector', async ({ page }) => {
  await page.goto('/');
  // Scope to the ComponentPanel — the OverridePanel also has a <select>.
  const componentPanel = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Component' }) });
  const select = componentPanel.locator('select');
  // The component inspector lists every component in alphabetical order;
  // first is `accordion`.
  await expect(select).toHaveValue('accordion');

  await select.selectOption('button');
  await expect(page.getByText('components/ui/button.tsx', { exact: false })).toBeVisible();
  // The button has two cva variant axes — scope to the component panel since
  // the override panel also renders axis headings.
  await expect(componentPanel.locator('p').filter({ hasText: /^variant$/ })).toBeVisible();
  await expect(componentPanel.locator('p').filter({ hasText: /^size$/ })).toBeVisible();
});
