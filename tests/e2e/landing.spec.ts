import { expect, test } from '@playwright/test';
import { getDocument } from './helpers';

test('/learn renders the split-screen landing with a live preview', async ({ page }) => {
  await page.goto('/learn');
  await expect(page.getByRole('link', { name: /Open editor/ }).first()).toBeVisible();
  // The right-hand PreviewShell renders the same PaletteBar the editor uses.
  await expect(page.getByRole('region', { name: 'Live preview' })).toBeVisible();
  // Colors panel from the editor is NOT rendered here — the shell is deliberately compact.
  await expect(page.getByRole('heading', { name: 'Colors' })).toHaveCount(0);
});

test('scrolling through chapters swaps the theme in the live preview', async ({ page }) => {
  await page.goto('/learn');
  await expect(page.locator('[data-chapter-id="hero"]')).toBeVisible();

  const initialPrimary = await getDocument(page).then(
    (d) => (d?.tokens.colors.light.primary as { value: string }).value,
  );

  // Scroll to the "whole-app" chapter — its onEnter applies Cyberpunk.
  await page.locator('[data-chapter-id="whole-app"]').scrollIntoViewIfNeeded();

  await expect
    .poll(async () => {
      const doc = await getDocument(page);
      return (doc?.tokens.colors.light.primary as { value: string }).value;
    })
    .not.toBe(initialPrimary);
});

test('scrolling back up reverses the theme (reversibility)', async ({ page }) => {
  await page.goto('/learn');
  await expect(page.locator('[data-chapter-id="hero"]')).toBeVisible();

  const hero = page.locator('[data-chapter-id="hero"]');
  const themesChapter = page.locator('[data-chapter-id="themes"]');

  // Snapshot the baseline (hero applies fixture reset).
  await hero.scrollIntoViewIfNeeded();
  await expect
    .poll(async () => (await getDocument(page))?.tokens.colors.light.primary)
    .toBeTruthy();
  const baseline = await getDocument(page).then(
    (d) => (d?.tokens.colors.light.primary as { value: string }).value,
  );

  // Scroll forward to a theme chapter — primary should change.
  await themesChapter.scrollIntoViewIfNeeded();
  await expect
    .poll(async () => {
      const d = await getDocument(page);
      return (d?.tokens.colors.light.primary as { value: string }).value;
    })
    .not.toBe(baseline);

  // Scroll BACK to hero — primary should revert to the baseline. This is the
  // reversibility guarantee: onEnter fires again on re-entry.
  await hero.scrollIntoViewIfNeeded();
  await expect
    .poll(async () => {
      const d = await getDocument(page);
      return (d?.tokens.colors.light.primary as { value: string }).value;
    })
    .toBe(baseline);
});

test('applying a curated theme with shadows also swaps --shadow-* on the preview', async ({
  page,
}) => {
  await page.goto('/learn');
  const preview = page.locator('.mintcn-preview').first();
  await expect(preview).toBeVisible();

  // Cyberpunk chapter — magenta neon shadows should appear on the root.
  await page.locator('[data-chapter-id="whole-app"]').scrollIntoViewIfNeeded();
  await expect(preview).toHaveAttribute('style', /--shadow-md:.*oklch/);
});

test('the / route still boots the editor (no regression)', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Colors' })).toBeVisible();
});
