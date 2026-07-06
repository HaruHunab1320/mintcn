import { expect, test } from '@playwright/test';

test('opening the gallery and clicking Matrix Terminal applies its palette', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.tincture-preview');
  await page.route('https://fonts.googleapis.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' }),
  );

  await page.getByRole('button', { name: /Themes/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Theme gallery' });
  await expect(dialog).toBeVisible();

  await dialog.locator('[data-theme-id="matrix-terminal"]').click();
  await expect(dialog).toHaveCount(0);

  // Matrix theme locks primary at ~145° hue. Read back --primary and verify.
  const primary = await page.evaluate(() => {
    const win = window as unknown as {
      __TINCTURE_STORE__: { getState: () => { document: unknown } };
    };
    const doc = win.__TINCTURE_STORE__.getState().document as {
      tokens: { colors: { light: { primary: { value: string } } } };
    };
    return doc.tokens.colors.light.primary.value;
  });
  expect(primary).toContain('oklch(');
  expect(primary).toMatch(/14[0-9]/); // hue near 145
});

test('category filter narrows the visible cards', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.tincture-preview');
  await page.route('https://fonts.googleapis.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' }),
  );

  await page.getByRole('button', { name: /Themes/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Theme gallery' });

  await dialog.getByRole('button', { name: 'Hacker', exact: true }).click();

  // Matrix Terminal is category=hacker → visible.
  await expect(dialog.locator('[data-theme-id="matrix-terminal"]')).toBeVisible();
  // Cyberpunk 2077 is category=sci-fi → hidden.
  await expect(dialog.locator('[data-theme-id="cyberpunk-2077"]')).toHaveCount(0);
});

test('Escape closes the gallery', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.tincture-preview');
  await page.route('https://fonts.googleapis.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' }),
  );

  await page.getByRole('button', { name: /Themes/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Theme gallery' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});
