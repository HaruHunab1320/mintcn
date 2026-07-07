import { expect, test } from '@playwright/test';
import { getDocument } from './helpers';

test('share button encodes the current doc into the URL hash', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await page.waitForSelector('.mintcn-preview');

  // Edit --primary so the shared doc differs from the fixture.
  const colorSection = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Colors' }) });
  await colorSection
    .getByRole('button')
    .filter({ hasText: /^primary$/ })
    .first()
    .click();
  await colorSection.locator('input[type="text"]').first().fill('oklch(0.62 0.24 340)');
  await colorSection.locator('input[type="text"]').first().blur();

  await page.getByRole('button', { name: 'Share this theme' }).click();

  // Header should flip to the "Copied" affordance.
  await expect(page.getByRole('button', { name: 'Share this theme' })).toContainText('Copied');

  // URL hash carries the payload.
  const hash = await page.evaluate(() => window.location.hash);
  expect(hash).toMatch(/^#doc=1[gu]/);

  // Clipboard has the full URL.
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  expect(clip).toContain('#doc=');
});

test('visiting a doc URL rehydrates the theme without editing anything', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
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
  await colorSection.locator('input[type="text"]').first().fill('oklch(0.62 0.24 340)');
  await colorSection.locator('input[type="text"]').first().blur();

  await page.getByRole('button', { name: 'Share this theme' }).click();
  await expect(page.getByRole('button', { name: 'Share this theme' })).toContainText('Copied');
  const url = await page.evaluate(() => window.location.href);
  expect(url).toContain('#doc=');

  // Open the shared URL in a fresh page — should hydrate the same --primary.
  const fresh = await context.newPage();
  await fresh.goto(url);
  await fresh.waitForSelector('.mintcn-preview');

  const freshDoc = await getDocument(fresh);
  const hydrated = (freshDoc?.tokens.colors.light.primary as { value: string }).value;
  expect(hydrated).toBe('oklch(0.62 0.24 340)');
});

test('a malformed doc hash logs a warning but still boots on the fixture', async ({ page }) => {
  const warnings: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'warning') warnings.push(msg.text());
  });
  await page.goto('/#doc=1gTHIS_IS_NOT_VALID_BASE64_GZIP');
  await page.waitForSelector('.mintcn-preview');

  // App still boots — Colors panel visible.
  await expect(page.getByRole('heading', { name: 'Colors' })).toBeVisible();
  expect(warnings.some((w) => w.includes('could not hydrate URL doc'))).toBe(true);
});
