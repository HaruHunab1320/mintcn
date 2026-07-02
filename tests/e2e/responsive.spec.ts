import { expect, test } from '@playwright/test';

test('device preview toggle constrains the preview to the chosen width', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.tincture-preview');

  const viewport = page.locator('[data-device-preset]');
  await expect(viewport).toBeVisible();

  // Auto is the default. Verify the data-device-preset attr swings across the
  // toggle and the inline style requests the right width. We assert on the
  // style attribute rather than computed CSS so a narrower CI browser viewport
  // (which triggers the max-w-full clamp) doesn't fail the test.
  await expect(viewport).toHaveAttribute('data-device-preset', 'auto');

  await page.getByRole('button', { name: '375', exact: true }).click();
  await expect(viewport).toHaveAttribute('data-device-preset', 'mobile');
  await expect(viewport).toHaveAttribute('style', /width:\s*375px/);

  await page.getByRole('button', { name: '768', exact: true }).click();
  await expect(viewport).toHaveAttribute('data-device-preset', 'tablet');
  await expect(viewport).toHaveAttribute('style', /width:\s*768px/);

  await page.getByRole('button', { name: '1440', exact: true }).click();
  await expect(viewport).toHaveAttribute('data-device-preset', 'desktop');
  await expect(viewport).toHaveAttribute('style', /width:\s*1440px/);

  await page.getByRole('button', { name: 'Auto', exact: true }).click();
  await expect(viewport).toHaveAttribute('data-device-preset', 'auto');
  // Auto's inline style uses width:100% (not a pixel value).
  await expect(viewport).toHaveAttribute('style', /width:\s*100%/);
});

test('override panel: editing the md breakpoint tab writes a prefixed class into the delta', async ({
  page,
}) => {
  await page.goto('/');

  const overridesSection = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Overrides' }) });
  await overridesSection.locator('select').selectOption('button');

  // Base tab is the default → confirm it's active by writing baseline classes.
  const baseTextarea = page.getByLabel('button size sm base classes', { exact: true });
  await baseTextarea.fill('h-8 px-4');
  await baseTextarea.blur();

  // Switch to the md breakpoint tab within this specific option's editor.
  const sizeSmEditor = overridesSection
    .locator('div')
    .filter({ hasText: /^size · sm/ })
    .first();
  await sizeSmEditor.getByRole('button', { name: 'md', exact: true }).click();

  const mdTextarea = page.getByLabel('button size sm md classes', { exact: true });
  await mdTextarea.fill('h-10 px-6');
  await mdTextarea.blur();

  const override = await page.evaluate(() => {
    const win = window as unknown as {
      __TINCTURE_STORE__: { getState: () => { document: unknown } };
    };
    const doc = win.__TINCTURE_STORE__.getState().document as {
      overrides: {
        componentId: string;
        variants?: Record<string, Record<string, { replaceWith?: string }>>;
      }[];
    };
    return doc.overrides.find((o) => o.componentId === 'button');
  });
  // The join canonicalizes base classes first, then md-prefixed.
  expect(override?.variants?.size?.sm.replaceWith).toBe('h-8 px-4 md:h-10 md:px-6');
});
