import { expect, test } from '@playwright/test';

test('editing button size.sm updates the preview button live, no export required', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForSelector('.tincture-preview');

  const smButton = page.locator('.tincture-preview button[data-size="sm"]').first();
  await expect(smButton).toBeVisible();
  const originalHeight = await smButton.evaluate((el) => window.getComputedStyle(el).height);

  // Switch the Overrides panel to button.
  const overridesSection = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Overrides' }) });
  await overridesSection.locator('select').selectOption('button');

  // Type a distinctive height (h-16 = 4rem = 64px). Tailwind v4 ships h-16 by
  // default so the utility is guaranteed to be in the compiled CSS.
  const smTextarea = page.getByLabel('button size sm base classes', { exact: true });
  await smTextarea.fill('h-16 rounded-md px-4 text-lg');
  await smTextarea.blur();

  // The Small button in the preview should now visibly reflect the override.
  await expect(smButton).not.toHaveCSS('height', originalHeight);
  await expect(smButton).toHaveCSS('height', '64px');
});

test('the app root wears the dot-grid chrome class; preview does not', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.tincture-preview');

  await expect(page.locator('.tincture-chrome')).toHaveCount(1);
  await expect(page.locator('.tincture-preview.tincture-chrome')).toHaveCount(0);

  // Chrome class actually installs the radial-gradient background image.
  const bgImage = await page
    .locator('.tincture-chrome')
    .first()
    .evaluate((el) => window.getComputedStyle(el).backgroundImage);
  expect(bgImage).toMatch(/radial-gradient/);
});
