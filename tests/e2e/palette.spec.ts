import { expect, test } from '@playwright/test';

test('palette generate rewrites the unlocked key tokens and respects locks', async ({ page }) => {
  await page.goto('/');

  // Read the initial primary value out of the store.
  const initial = await page.evaluate(() => {
    const win = window as unknown as {
      __TINCTURE_STORE__: { getState: () => { document: unknown } };
    };
    const doc = win.__TINCTURE_STORE__.getState().document as {
      tokens: {
        colors: {
          light: { primary: { value: string }; background: { value: string } };
        };
      };
    };
    return {
      primary: doc.tokens.colors.light.primary.value,
      background: doc.tokens.colors.light.background.value,
    };
  });

  // Lock primary so it survives the regenerate.
  await page.getByRole('button', { name: /primary swatch/ }).click();
  await expect(page.getByRole('button', { name: /primary swatch locked/ })).toBeVisible();

  // Generate. Strategy defaults to monochromatic.
  await page.getByRole('button', { name: '↻ Generate' }).click();

  const after = await page.evaluate(() => {
    const win = window as unknown as {
      __TINCTURE_STORE__: { getState: () => { document: unknown } };
    };
    const doc = win.__TINCTURE_STORE__.getState().document as {
      tokens: {
        colors: {
          light: { primary: { value: string }; background: { value: string } };
        };
      };
    };
    return {
      primary: doc.tokens.colors.light.primary.value,
      background: doc.tokens.colors.light.background.value,
    };
  });

  // Locked primary preserved
  expect(after.primary).toBe(initial.primary);
  // Background regenerated — different from the fixture default
  expect(after.background).not.toBe(initial.background);
});

test('spacebar regenerates the palette when focus is outside an input', async ({ page }) => {
  await page.goto('/');

  const initialBackground = await page.evaluate(() => {
    const win = window as unknown as {
      __TINCTURE_STORE__: { getState: () => { document: unknown } };
    };
    const doc = win.__TINCTURE_STORE__.getState().document as {
      tokens: { colors: { light: { background: { value: string } } } };
    };
    return doc.tokens.colors.light.background.value;
  });

  // Focus the body (clicking the canvas heading) then press space.
  await page.getByRole('heading', { name: 'Preview' }).click();
  await page.keyboard.press('Space');

  const after = await page.evaluate(() => {
    const win = window as unknown as {
      __TINCTURE_STORE__: { getState: () => { document: unknown } };
    };
    const doc = win.__TINCTURE_STORE__.getState().document as {
      tokens: { colors: { light: { background: { value: string } } } };
    };
    return doc.tokens.colors.light.background.value;
  });

  expect(after).not.toBe(initialBackground);
});
