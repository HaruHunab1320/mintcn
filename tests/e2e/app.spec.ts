import { expect, test } from '@playwright/test';

test('preview renders fixture components in light theme', async ({ page }) => {
  await page.goto('/');

  // Header shows the project metadata pulled from ingest.
  await expect(page.getByRole('heading', { name: 'Mintcn' })).toBeVisible();
  await expect(page.getByText(/shadcn-app · slate · 46 components/)).toBeVisible();

  const preview = page.locator('.mintcn-preview');

  // The canvas showroom sections are all visible in the preview.
  // Scoped because Canvas now also renders a chip filter whose labels
  // overlap with the section titles (e.g. "Buttons").
  for (const heading of ['Buttons', 'Badges', 'Form controls', 'Cards & data display']) {
    await expect(preview.getByText(heading, { exact: true })).toBeVisible();
  }

  // A representative component from each section, scoped to the preview.
  await expect(preview.getByRole('button', { name: 'Primary' })).toBeVisible();
  await expect(preview.getByRole('button', { name: 'Destructive' })).toBeVisible();
  await expect(page.getByPlaceholder('you@example.com')).toBeVisible();
  // Settings appears in breadcrumb, tab trigger, AND card title — scope to the card.
  await expect(page.locator('[data-slot="card-title"]', { hasText: 'Settings' })).toBeVisible();
});

test('preview-root receives token CSS variables and respects light/dark', async ({ page }) => {
  await page.goto('/');

  const preview = page.locator('.mintcn-preview');
  await expect(preview).toBeVisible();

  // The fixture's --primary in light theme is oklch(0.208 0.042 265.755).
  // PreviewRoot copies it through verbatim onto its inline style.
  await expect(preview).toHaveAttribute('style', /--primary:\s*oklch\(0\.208 0\.042 265\.755\)/);
  await expect(preview).toHaveAttribute('data-theme', 'light');

  // Switching themes flips data-theme and the dark class. Use the canvas
  // theme toggle (the panel's ColorPanel has its own light/dark tab).
  await page.getByRole('main').getByRole('button', { name: 'dark' }).click();
  await expect(preview).toHaveAttribute('data-theme', 'dark');
  await expect(preview).toHaveClass(/(^|\s)dark(\s|$)/);
  // Dark --primary is oklch(0.929 0.013 255.508).
  await expect(preview).toHaveAttribute('style', /--primary:\s*oklch\(0\.929 0\.013 255\.508\)/);
});

test('a programmatic token mutation visibly restyles the preview', async ({ page }) => {
  await page.goto('/');
  const preview = page.locator('.mintcn-preview');
  await expect(preview).toBeVisible();

  // Mutate the store directly to prove the fast-path subscription works.
  await page.evaluate(() => {
    const win = window as unknown as {
      __MINTCN_STORE__?: {
        getState: () => {
          setTokenColor: (theme: string, token: string, value: unknown) => void;
        };
      };
    };
    if (!win.__MINTCN_STORE__) throw new Error('store not exposed on window');
    win.__MINTCN_STORE__.getState().setTokenColor('light', 'primary', {
      kind: 'literal',
      space: 'oklch',
      value: 'oklch(0.7 0.2 30)',
    });
  });

  await expect(preview).toHaveAttribute('style', /--primary:\s*oklch\(0\.7 0\.2 30\)/);
});
