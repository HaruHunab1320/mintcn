import { expect, test } from '@playwright/test';
import { getDocument } from './helpers';

test('Cmd+K opens the command palette', async ({ page }) => {
  await page.goto('/');
  // Wait for the app to be interactive — the palette listener mounts after
  // App's first effect runs. Without this the keyboard event can race past.
  await page.waitForSelector('.mintcn-preview');
  // Click the header so keyboard focus is somewhere in the document, then
  // dispatch Control+K — the App listens for both metaKey and ctrlKey.
  await page.getByRole('heading', { name: 'Mintcn' }).click();
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Search commands' })).toBeFocused();
});

test('typing filters commands and Enter invokes Jump to Keyframes', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Search/ }).click();

  const input = page.getByRole('textbox', { name: 'Search commands' });
  await input.fill('keyfra');

  // The Jump to Keyframes entry surfaces; Enter invokes it.
  await expect(page.getByRole('button', { name: 'Jump to Keyframes' })).toBeVisible();
  await page.keyboard.press('Enter');

  // The palette closes and the keyframes panel scrolls into view.
  await expect(page.getByRole('dialog', { name: 'Command palette' })).toHaveCount(0);
  const panel = page.locator('[data-panel-id="keyframes"]');
  await expect(panel).toBeInViewport();
});

test('Generate palette command rolls the unlocked tokens', async ({ page }) => {
  await page.goto('/');

  const docBefore = await getDocument(page);
  const before = (docBefore?.tokens.colors.light.background as { value: string }).value;

  await page.getByRole('button', { name: /Search/ }).click();
  await page.getByRole('textbox', { name: 'Search commands' }).fill('generate');
  await page.keyboard.press('Enter');

  const docAfter = await getDocument(page);
  const after = (docAfter?.tokens.colors.light.background as { value: string }).value;

  expect(after).not.toBe(before);
});

test('Escape closes the palette', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Search/ }).click();
  await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Command palette' })).toHaveCount(0);
});
