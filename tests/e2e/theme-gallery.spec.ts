import { expect, test } from '@playwright/test';
import { getDocument } from './helpers';

test('opening the gallery and clicking Matrix Terminal applies its palette', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.mintcn-preview');
  await page.route('https://fonts.googleapis.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' }),
  );

  await page.getByRole('button', { name: /Themes/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Theme gallery' });
  await expect(dialog).toBeVisible();

  await dialog.locator('[data-theme-id="matrix-terminal"]').click();
  await expect(dialog).toHaveCount(0);

  // Matrix theme locks primary at ~145° hue. Read back --primary and verify.
  const doc = await getDocument(page);
  const primary = (doc?.tokens.colors.light.primary as { value: string }).value;
  expect(primary).toContain('oklch(');
  expect(primary).toMatch(/14[0-9]/); // hue near 145
});

test('category filter narrows the visible cards', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.mintcn-preview');
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

test('save current + reopen: new preset shows as a Mine card and applies on click', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForSelector('.mintcn-preview');
  await page.route('https://fonts.googleapis.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' }),
  );

  // Nudge --primary so this preset differs from any curated one.
  const colorSection = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Colors' }) });
  await colorSection
    .getByRole('button')
    .filter({ hasText: /^primary$/ })
    .first()
    .click();
  await colorSection.locator('input[type="text"]').first().fill('oklch(0.4 0.24 111)');
  await colorSection.locator('input[type="text"]').first().blur();

  await page.getByRole('button', { name: /Themes/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Theme gallery' });
  await expect(dialog).toBeVisible();

  await dialog.getByRole('button', { name: /Save current/ }).click();
  const nameInput = dialog.getByPlaceholder('theme name');
  await nameInput.fill('electric-lime');
  // Submit via Enter — the "save" button unmounts synchronously on click as
  // the input dismounts, which races Playwright's post-click stability check.
  await nameInput.press('Enter');

  // Filter auto-jumps to Mine; the new card is visible.
  const card = dialog.locator('[data-theme-id^="preset-"]', { hasText: 'electric-lime' }).first();
  await expect(card).toBeVisible();

  // Change --primary to something else so we can prove the load restores it.
  await dialog.getByRole('button', { name: 'Close' }).click();
  await colorSection.locator('input[type="text"]').first().fill('oklch(0.6 0.1 30)');
  await colorSection.locator('input[type="text"]').first().blur();

  await page.getByRole('button', { name: /Themes/ }).click();
  // Match the "Mine" filter chip (optionally followed by a count badge) — not the
  // "electric-lime Mine Inter" card whose accessible name starts with the theme name.
  await dialog.getByRole('button', { name: /^Mine( \d+)?$/ }).click();
  await dialog.locator('[data-theme-id^="preset-"]', { hasText: 'electric-lime' }).first().click();

  await expect
    .poll(async () => {
      const d = await getDocument(page);
      return (d?.tokens.colors.light.primary as { value: string }).value;
    })
    .toBe('oklch(0.4 0.24 111)');
});

test('Escape closes the gallery', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.mintcn-preview');
  await page.route('https://fonts.googleapis.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' }),
  );

  await page.getByRole('button', { name: /Themes/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Theme gallery' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});
