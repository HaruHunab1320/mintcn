import { expect, test } from '@playwright/test';

test('reset button discards a token edit and restores the baseline', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.mintcn-preview');

  // Baseline: read the fixture's default --primary from the app root style.
  const baseline = await page.evaluate(() => {
    const win = window as unknown as {
      __MINTCN_STORE__: { getState: () => { document: { tokens: unknown } } };
    };
    const doc = win.__MINTCN_STORE__.getState().document as {
      tokens: { colors: { light: { primary: { value: string } } } };
    };
    return doc.tokens.colors.light.primary.value;
  });
  expect(baseline).toBeTruthy();

  // Mutate --primary via the Colors panel text field.
  const colorSection = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Colors' }) });
  await colorSection
    .getByRole('button')
    .filter({ hasText: /^primary$/ })
    .first()
    .click();
  const primaryText = colorSection.locator('input[type="text"]').first();
  await primaryText.fill('oklch(0.55 0.22 30)');
  await primaryText.blur();

  const afterEdit = await page.evaluate(() => {
    const win = window as unknown as {
      __MINTCN_STORE__: { getState: () => { document: unknown } };
    };
    const doc = win.__MINTCN_STORE__.getState().document as {
      tokens: { colors: { light: { primary: { value: string } } } };
    };
    return doc.tokens.colors.light.primary.value;
  });
  expect(afterEdit).toBe('oklch(0.55 0.22 30)');

  // Reset — accept the confirm dialog automatically.
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: /Reset/, exact: false }).click();

  await expect
    .poll(async () =>
      page.evaluate(() => {
        const win = window as unknown as {
          __MINTCN_STORE__: { getState: () => { document: unknown } };
        };
        const doc = win.__MINTCN_STORE__.getState().document as {
          tokens: { colors: { light: { primary: { value: string } } } };
        };
        return doc.tokens.colors.light.primary.value;
      }),
    )
    .toBe(baseline);
});

test('reset does nothing when the user cancels the confirm dialog', async ({ page }) => {
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
  await colorSection.locator('input[type="text"]').first().fill('oklch(0.4 0.15 200)');
  await colorSection.locator('input[type="text"]').first().blur();

  page.once('dialog', (d) => d.dismiss());
  await page.getByRole('button', { name: /Reset/, exact: false }).click();

  const stillEdited = await page.evaluate(() => {
    const win = window as unknown as {
      __MINTCN_STORE__: { getState: () => { document: unknown } };
    };
    const doc = win.__MINTCN_STORE__.getState().document as {
      tokens: { colors: { light: { primary: { value: string } } } };
    };
    return doc.tokens.colors.light.primary.value;
  });
  expect(stillEdited).toBe('oklch(0.4 0.15 200)');
});

test('header wears a solid bg-card so the dot grid does not show through it', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.mintcn-preview');

  const header = page.locator('header').first();
  const bgColor = await header.evaluate((el) => window.getComputedStyle(el).backgroundColor);
  const bgImage = await header.evaluate((el) => window.getComputedStyle(el).backgroundImage);

  // Solid background color (non-transparent) and no dot-pattern image of its own.
  expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
  expect(bgColor).not.toBe('transparent');
  expect(bgImage).toBe('none');
});
