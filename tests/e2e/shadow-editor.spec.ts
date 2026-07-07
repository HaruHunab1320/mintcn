import { expect, test } from '@playwright/test';
import { getDocument } from './helpers';

test('shadow editor: changing the blur field updates the document shadow string', async ({
  page,
}) => {
  await page.goto('/');

  // Edit the --shadow-sm blur input (layer 0).
  const blurInput = page.getByLabel('sm layer 0 blur', { exact: true });
  await blurInput.fill('8');
  await blurInput.blur();

  const doc = await getDocument(page);
  const value = doc?.tokens.shadows.sm;
  // The blur field commits as `8px`; X/Y/spread + color stay intact.
  expect(value).toBe('0 1px 8px 0 rgb(0 0 0 / 0.05)');
});

test('shadow editor: adding a layer appends it to the serialized value', async ({ page }) => {
  await page.goto('/');

  const smCard = page.getByRole('group', { name: 'shadow sm' });
  await smCard.getByRole('button', { name: '+ add layer' }).click();

  const doc = await getDocument(page);
  const value = doc?.tokens.shadows.sm ?? '';
  // Two comma-separated layers now.
  expect(value.split(',').length).toBe(2);
});

test('shadow editor: inset toggle flips the inset keyword on serialization', async ({ page }) => {
  await page.goto('/');

  const layerCard = page.getByRole('group', { name: 'shadow sm layer 1' });
  await layerCard.getByLabel('inset').check();

  const doc = await getDocument(page);
  const value = doc?.tokens.shadows.sm ?? '';
  expect(value.startsWith('inset ')).toBe(true);
});
