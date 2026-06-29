import { expect, test } from '@playwright/test';

test('clean fixture opens the diff view in an empty state', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Diff' }).click();
  await expect(page.getByRole('dialog', { name: 'Diff view' })).toBeVisible();
  // The fixture has no edits so the only file in `changed` is the new
  // registry-item.json. The Diff button badge should be present and small.
  await expect(page.getByText(/No edits|file/)).toBeVisible();
});

test('editing a token surfaces a globals.css diff', async ({ page }) => {
  await page.goto('/');

  // Mutate --primary via the store so the test stays focused on the diff path.
  await page.evaluate(() => {
    const win = window as unknown as {
      __TINCTURE_STORE__: {
        getState: () => {
          setTokenColor: (theme: string, token: string, value: unknown) => void;
        };
      };
    };
    win.__TINCTURE_STORE__.getState().setTokenColor('light', 'primary', {
      kind: 'literal',
      space: 'oklch',
      value: 'oklch(0.7 0.2 30)',
    });
  });

  await page.getByRole('button', { name: 'Diff' }).click();
  const dialog = page.getByRole('dialog', { name: 'Diff view' });
  await expect(dialog).toBeVisible();
  // globals.css now appears as a changed file card in the dialog (the toggle
  // button shows the path; the unified-diff lines also include it but we
  // match the card header specifically).
  await expect(dialog.getByRole('button', { name: /app\/globals\.css/ })).toBeVisible();
  // The injected primary value shows up in both globals.css and the new
  // registry-item.json — assert the globals.css line specifically.
  await expect(
    dialog.getByText('+    --primary: oklch(0.7 0.2 30);', { exact: false }),
  ).toBeVisible();
});

test('escape closes the diff view', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Diff' }).click();
  await expect(page.getByRole('dialog', { name: 'Diff view' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Diff view' })).toHaveCount(0);
});
