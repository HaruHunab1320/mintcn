import { expect, test } from '@playwright/test';
import { getDocument } from './helpers';

test('palette generate rewrites the unlocked key tokens and respects locks', async ({ page }) => {
  await page.goto('/');

  // Read the initial primary value out of the store.
  const initialDoc = await getDocument(page);
  const initial = {
    primary: (initialDoc?.tokens.colors.light.primary as { value: string }).value,
    background: (initialDoc?.tokens.colors.light.background as { value: string }).value,
  };

  // Lock primary so it survives the regenerate.
  await page.getByRole('button', { name: /primary swatch/ }).click();
  await expect(page.getByRole('button', { name: /primary swatch locked/ })).toBeVisible();

  // Generate. Strategy defaults to monochromatic.
  await page.getByRole('button', { name: '↻ Generate' }).click();

  const afterDoc = await getDocument(page);
  const after = {
    primary: (afterDoc?.tokens.colors.light.primary as { value: string }).value,
    background: (afterDoc?.tokens.colors.light.background as { value: string }).value,
  };

  // Locked primary preserved
  expect(after.primary).toBe(initial.primary);
  // Background regenerated — different from the fixture default
  expect(after.background).not.toBe(initial.background);
});

test('spacebar regenerates the palette when focus is outside an input', async ({ page }) => {
  await page.goto('/');

  const initialDoc = await getDocument(page);
  const initialBackground = (initialDoc?.tokens.colors.light.background as { value: string }).value;

  // Focus the body (clicking the canvas heading) then press space.
  await page.getByRole('heading', { name: 'Preview' }).click();
  await page.keyboard.press('Space');

  const afterDoc = await getDocument(page);
  const after = (afterDoc?.tokens.colors.light.background as { value: string }).value;

  expect(after).not.toBe(initialBackground);
});
