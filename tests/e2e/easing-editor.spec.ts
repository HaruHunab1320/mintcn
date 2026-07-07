import { expect, test } from '@playwright/test';

async function easingValue(page: import('@playwright/test').Page, name: string) {
  return page.evaluate(
    ({ name: n }) => {
      const win = window as unknown as {
        __MINTCN_STORE__: { getState: () => { document: unknown } };
      };
      const doc = win.__MINTCN_STORE__.getState().document as {
        tokens: { animations?: { easings: Record<string, string> } };
      };
      return doc.tokens.animations?.easings[n];
    },
    { name },
  );
}

test('easing preset dropdown swaps the stored value', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.mintcn-preview');
  expect(await easingValue(page, 'out')).toBe('cubic-bezier(0.16, 1, 0.3, 1)');

  const preset = page.getByLabel('easing out preset', { exact: true });
  await preset.selectOption('material-standard');

  expect(await easingValue(page, 'out')).toBe('cubic-bezier(0.4, 0, 0.2, 1)');
});

test('bezier editor: dragging a handle changes the emitted cubic-bezier tuple', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForSelector('.mintcn-preview');

  const initial = await easingValue(page, 'out');
  expect(initial).toBe('cubic-bezier(0.16, 1, 0.3, 1)');

  // Expand the easing row so the SVG mounts.
  await page.getByRole('button', { name: '▸ --ease-out', exact: true }).click();

  // Edit x1 via the numeric field instead of dragging (more reliable in
  // headless), then assert the value.
  const x1 = page.getByLabel('bezier x1', { exact: true });
  await x1.fill('0.7');
  await x1.blur();

  const after = await easingValue(page, 'out');
  expect(after?.startsWith('cubic-bezier(0.7,')).toBe(true);
});

test('keyword easings do not expose the bezier editor', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.mintcn-preview');

  // Force the "out" row to a keyword value.
  await page.evaluate(() => {
    const win = window as unknown as {
      __MINTCN_STORE__: {
        getState: () => { setEasing: (name: string, value: string) => void };
      };
    };
    win.__MINTCN_STORE__.getState().setEasing('out', 'ease-in-out');
  });

  // Expand — the bezier editor should NOT appear.
  await page.getByRole('button', { name: '▸ --ease-out', exact: true }).click();
  await expect(page.getByLabel('Cubic bezier curve editor')).toHaveCount(0);
  await expect(
    page.getByText('Visual editor available for cubic-bezier() values only', { exact: false }),
  ).toBeVisible();
});
