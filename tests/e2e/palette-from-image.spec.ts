import { expect, test } from '@playwright/test';
import { getDocument } from './helpers';

/**
 * Programmatically feed a solid-color PNG through the palette bar's file
 * input, then assert the store's primary token shifted toward that color's
 * hue. Playwright's `setInputFiles` needs a real path on disk, so we build
 * the blob inline via canvas + DataTransfer instead.
 */
test('image sampling assigns a primary color derived from the image', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.mintcn-preview');

  const originalDoc = await getDocument(page);
  const originalPrimary = (originalDoc?.tokens.colors.light.primary as { value: string }).value;

  // Inject a 40x40 vivid-blue PNG via the file input.
  await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 40;
    canvas.height = 40;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no ctx');
    ctx.fillStyle = 'rgb(20, 30, 220)';
    ctx.fillRect(0, 0, 40, 40);
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b as Blob), 'image/png');
    });
    const file = new File([blob], 'test.png', { type: 'image/png' });
    const input = document.querySelector(
      'input[aria-label="Sample palette from image"]',
    ) as HTMLInputElement;
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });

  await page.waitForTimeout(500); // sampling is fast but async

  const newDoc = await getDocument(page);
  const newPrimary = (newDoc?.tokens.colors.light.primary as { value: string }).value;

  // The primary should have moved (not still the fixture default) and the
  // hue should have swung into the blue neighborhood (~260-270°).
  expect(newPrimary).not.toBe(originalPrimary);
  const hueMatch = newPrimary.match(/oklch\([\d.]+ [\d.]+ ([\d.]+)/);
  expect(hueMatch).not.toBeNull();
  if (hueMatch) {
    const hue = Number.parseFloat(hueMatch[1]);
    expect(hue).toBeGreaterThan(250);
    expect(hue).toBeLessThan(280);
  }
});
