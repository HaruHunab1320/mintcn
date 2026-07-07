import { expect, test } from '@playwright/test';

test('picking a font from the sans picker writes a matching stack to --font-sans', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForSelector('.mintcn-preview');

  // Prevent actual network calls to Google Fonts CSS — this test only cares
  // about the in-app data flow, not the actual typography rendering.
  await page.route('https://fonts.googleapis.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '/* stubbed */' }),
  );

  // Open the sans picker via its "pick font" button.
  const typographySection = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Typography' }) });
  await typographySection.getByRole('button', { name: /Change --font-sans font/ }).click();

  const dialog = page.getByRole('dialog', { name: 'Font picker' });
  await expect(dialog).toBeVisible();

  // Type "Manrope" — that family is in the curated list.
  await dialog.getByRole('searchbox').fill('Manrope');
  await dialog.getByRole('button', { name: /Manrope/ }).click();

  await expect(dialog).toBeHidden();

  const stack = await page.evaluate(() => {
    const win = window as unknown as {
      __MINTCN_STORE__: { getState: () => { document: unknown } };
    };
    const doc = win.__MINTCN_STORE__.getState().document as {
      tokens: { typography: { fontFamily: { sans: string } } };
    };
    return doc.tokens.typography.fontFamily.sans;
  });
  expect(stack).toBe('Manrope, sans-serif');
});

test('picker category filter narrows the visible fonts', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.mintcn-preview');
  await page.route('https://fonts.googleapis.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' }),
  );

  await page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Typography' }) })
    .getByRole('button', { name: /Change --font-mono font/ })
    .click();

  const dialog = page.getByRole('dialog', { name: 'Font picker' });
  await expect(dialog).toBeVisible();

  // The mono picker opens with the Mono category preselected — verify by
  // checking Inter (sans-serif) is not visible in the list.
  await expect(dialog.getByRole('button', { name: /^Inter/ })).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: /^JetBrains Mono/ })).toBeVisible();
});

test('Escape closes the font picker', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.mintcn-preview');
  await page.route('https://fonts.googleapis.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' }),
  );

  await page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Typography' }) })
    .getByRole('button', { name: /Change --font-sans font/ })
    .click();

  const dialog = page.getByRole('dialog', { name: 'Font picker' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});
