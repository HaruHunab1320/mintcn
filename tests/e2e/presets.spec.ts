import { expect, test } from '@playwright/test';
import { getDocument } from './helpers';

test('save preset → mutate tokens → load preset restores them', async ({ page }) => {
  await page.goto('/');

  // Save current state as a preset named "baseline".
  const presetSection = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Presets' }) });
  await presetSection.getByPlaceholder('preset name').fill('baseline');
  await presetSection.getByRole('button', { name: 'save' }).click();
  await expect(presetSection.getByText('baseline', { exact: true })).toBeVisible();

  // Mutate tokens via the store so the test stays focused on the preset path.
  await page.evaluate(() => {
    const win = window as unknown as {
      __MINTCN_STORE__: {
        getState: () => {
          setRadius: (value: string) => void;
          setTokenColor: (theme: string, token: string, value: unknown) => void;
        };
      };
    };
    const s = win.__MINTCN_STORE__.getState();
    s.setRadius('1.25rem');
    s.setTokenColor('light', 'primary', {
      kind: 'literal',
      space: 'oklch',
      value: 'oklch(0.7 0.2 30)',
    });
  });

  // Load the preset and assert everything snapped back.
  await presetSection.getByRole('button', { name: 'load' }).click();

  const doc = await getDocument(page);
  const snapshot = {
    radius: doc?.tokens.radius.base,
    primary: (doc?.tokens.colors.light.primary as { value: string }).value,
  };
  expect(snapshot.radius).toBe('0.625rem');
  expect(snapshot.primary).toBe('oklch(0.208 0.042 265.755)');
});

test('remove preset drops it from the list', async ({ page }) => {
  await page.goto('/');
  const presetSection = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Presets' }) });
  await presetSection.getByPlaceholder('preset name').fill('ephemeral');
  await presetSection.getByRole('button', { name: 'save' }).click();
  await expect(presetSection.getByText('ephemeral', { exact: true })).toBeVisible();
  await presetSection.getByRole('button', { name: 'remove' }).click();
  await expect(presetSection.getByText('ephemeral', { exact: true })).toHaveCount(0);
});
