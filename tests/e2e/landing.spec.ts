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

test('the override callout appears only on the overrides chapter + is editable', async ({
  page,
}) => {
  await page.goto('/learn');
  const callout = page.getByRole('complementary', { name: 'Active overrides' });

  // Hero chapter has no overrides — callout should be hidden.
  await expect(callout).toHaveCount(0);

  // Scroll to the overrides chapter — the callout appears with the class string.
  await page.locator('[data-chapter-id="overrides"]').evaluate((el) => {
    el.scrollIntoView({ block: 'center' });
  });
  await expect(callout).toBeVisible();
  await expect(callout).toContainText('button.size.sm');

  // Editing the textarea should mutate the store — the visitor drives the tool.
  const textarea = callout.getByLabel('button.size.sm class string');
  await textarea.fill('h-10 rounded-full px-6 text-base');
  await expect
    .poll(async () => {
      const doc = await getDocument(page);
      return doc?.overrides[0]?.variants?.size?.sm?.replaceWith;
    })
    .toBe('h-10 rounded-full px-6 text-base');

  // Scroll past to a chapter that isn't 'overrides' — the callout disappears
  // even though the override still exists in the doc.
  await page.locator('[data-chapter-id="motion-duration"]').evaluate((el) => {
    el.scrollIntoView({ block: 'center' });
  });
  await expect(callout).toHaveCount(0);
});

test('motion tokens retime real shadcn transitions (not just the demo strip)', async ({
  page,
}) => {
  await page.goto('/learn');
  const preview = page.locator('.mintcn-preview').first();
  await expect(preview).toBeVisible();

  // Scroll to the "timing tokens" chapter — it sets --duration-normal to 1400ms.
  // Then continue to the "diff" chapter (focus: 'all') so real shadcn buttons
  // render on the right and we can verify their computed transition-duration
  // reflects the still-active motion tokens.
  await page.locator('[data-chapter-id="motion-duration"]').evaluate((el) => {
    el.scrollIntoView({ block: 'center' });
  });
  await expect
    .poll(async () => {
      const doc = await getDocument(page);
      return doc?.tokens.animations?.durations.normal;
    })
    .toBe('1400ms');

  await page.locator('[data-chapter-id="diff"]').evaluate((el) => {
    el.scrollIntoView({ block: 'center' });
  });

  // Real shadcn Button — its Tailwind `transition-all` should now pick up
  // the token via the scoped `.mintcn-preview *` rule.
  await expect
    .poll(async () =>
      preview
        .locator('button', { hasText: 'Primary' })
        .first()
        .evaluate((el) => window.getComputedStyle(el).transitionDuration),
    )
    .toBe('1.4s');
});

test('the / route still boots the editor (no regression)', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Colors' })).toBeVisible();
});
