import { expect, test } from '@playwright/test';
import { getDocument } from './helpers';

async function primaryValue(page: import('@playwright/test').Page) {
  const doc = await getDocument(page);
  return (doc?.tokens.colors.light.primary as { value: string }).value;
}

test('undo button rolls back a token edit; redo replays it', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.mintcn-preview');
  const original = await primaryValue(page);

  // Mutate primary via the store so the history entry is recorded through
  // the temporal middleware (throttled at 250ms — wait past it).
  await page.evaluate(() => {
    const win = window as unknown as {
      __MINTCN_STORE__: {
        getState: () => {
          setTokenColor: (theme: string, token: string, value: unknown) => void;
        };
      };
    };
    win.__MINTCN_STORE__.getState().setTokenColor('light', 'primary', {
      kind: 'literal',
      space: 'oklch',
      value: 'oklch(0.7 0.2 30)',
    });
  });
  await page.waitForTimeout(350);
  expect(await primaryValue(page)).toBe('oklch(0.7 0.2 30)');

  // Header Undo button — disabled state auto-clears once the history entry lands.
  const undoButton = page.getByRole('button', { name: 'Undo' });
  await expect(undoButton).toBeEnabled();
  await undoButton.click();
  expect(await primaryValue(page)).toBe(original);

  const redoButton = page.getByRole('button', { name: 'Redo' });
  await expect(redoButton).toBeEnabled();
  await redoButton.click();
  expect(await primaryValue(page)).toBe('oklch(0.7 0.2 30)');
});

test('Ctrl+Z outside a text input triggers undo', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.mintcn-preview');
  const original = await primaryValue(page);

  await page.evaluate(() => {
    const win = window as unknown as {
      __MINTCN_STORE__: {
        getState: () => {
          setTokenColor: (theme: string, token: string, value: unknown) => void;
        };
      };
    };
    win.__MINTCN_STORE__.getState().setTokenColor('light', 'primary', {
      kind: 'literal',
      space: 'oklch',
      value: 'oklch(0.5 0.15 120)',
    });
  });
  await page.waitForTimeout(350);
  expect(await primaryValue(page)).toBe('oklch(0.5 0.15 120)');

  // Focus somewhere that isn't a form field.
  await page.getByRole('heading', { name: 'Mintcn' }).click();
  await page.keyboard.press('Control+z');
  expect(await primaryValue(page)).toBe(original);
});
