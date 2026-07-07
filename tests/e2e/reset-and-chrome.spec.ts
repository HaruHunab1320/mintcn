import { expect, test } from '@playwright/test';
import { getDocument } from './helpers';

test('reset button discards a token edit and restores the baseline', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.mintcn-preview');

  // Baseline: read the fixture's default --primary from the app root style.
  const baselineDoc = await getDocument(page);
  const baseline = (baselineDoc?.tokens.colors.light.primary as { value: string }).value;
  expect(baseline).toBeTruthy();

  // Mutate --primary via the Colors panel text field.
  const colorSection = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Colors' }) });
  await colorSection
    .getByRole('button')
    .filter({ hasText: /^primary$/ })
    .first()
    .click();
  const primaryText = colorSection.locator('input[type="text"]').first();
  await primaryText.fill('oklch(0.55 0.22 30)');
  await primaryText.blur();

  const afterEditDoc = await getDocument(page);
  const afterEdit = (afterEditDoc?.tokens.colors.light.primary as { value: string }).value;
  expect(afterEdit).toBe('oklch(0.55 0.22 30)');

  // Reset — accept the confirm dialog automatically.
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: /Reset/, exact: false }).click();

  await expect
    .poll(async () => {
      const d = await getDocument(page);
      return (d?.tokens.colors.light.primary as { value: string }).value;
    })
    .toBe(baseline);
});

test('reset does nothing when the user cancels the confirm dialog', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.mintcn-preview');

  const colorSection = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Colors' }) });
  await colorSection
    .getByRole('button')
    .filter({ hasText: /^primary$/ })
    .first()
    .click();
  await colorSection.locator('input[type="text"]').first().fill('oklch(0.4 0.15 200)');
  await colorSection.locator('input[type="text"]').first().blur();

  page.once('dialog', (d) => d.dismiss());
  await page.getByRole('button', { name: /Reset/, exact: false }).click();

  const stillEditedDoc = await getDocument(page);
  const stillEdited = (stillEditedDoc?.tokens.colors.light.primary as { value: string }).value;
  expect(stillEdited).toBe('oklch(0.4 0.15 200)');
});

test('header wears a solid bg-card so the dot grid does not show through it', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.mintcn-preview');

  const header = page.locator('header').first();
  const bgColor = await header.evaluate((el) => window.getComputedStyle(el).backgroundColor);
  const bgImage = await header.evaluate((el) => window.getComputedStyle(el).backgroundImage);

  // Solid background color (non-transparent) and no dot-pattern image of its own.
  expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
  expect(bgColor).not.toBe('transparent');
  expect(bgImage).toBe('none');
});
