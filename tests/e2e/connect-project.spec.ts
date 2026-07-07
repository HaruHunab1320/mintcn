import { expect, test } from '@playwright/test';
import { getDocument } from './helpers';

const MINIMAL_COMPONENTS_JSON = JSON.stringify(
  {
    $schema: 'https://ui.shadcn.com/schema.json',
    style: 'new-york',
    rsc: false,
    tsx: true,
    tailwind: {
      config: '',
      css: 'app/globals.css',
      baseColor: 'slate',
      cssVariables: true,
      prefix: '',
    },
    iconLibrary: 'lucide',
    aliases: {
      components: '@/components',
      utils: '@/lib/utils',
      ui: '@/components/ui',
      lib: '@/lib',
      hooks: '@/hooks',
    },
  },
  null,
  2,
);

const MINIMAL_GLOBALS_CSS = `@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --font-sans: ui-sans-serif;
  --font-serif: ui-serif;
  --font-mono: ui-monospace;
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

@layer base {
  :root {
    --radius: 0.75rem;
    --background: oklch(1 0 0);
    --foreground: oklch(0.1 0 0);
    --card: oklch(1 0 0);
    --card-foreground: oklch(0.1 0 0);
    --popover: oklch(1 0 0);
    --popover-foreground: oklch(0.1 0 0);
    --primary: oklch(0.5 0.2 200);
    --primary-foreground: oklch(1 0 0);
    --secondary: oklch(0.9 0 0);
    --secondary-foreground: oklch(0.1 0 0);
    --muted: oklch(0.95 0 0);
    --muted-foreground: oklch(0.4 0 0);
    --accent: oklch(0.9 0 0);
    --accent-foreground: oklch(0.1 0 0);
    --destructive: oklch(0.6 0.2 30);
    --destructive-foreground: oklch(1 0 0);
    --border: oklch(0.9 0 0);
    --input: oklch(0.9 0 0);
    --ring: oklch(0.7 0 0);
    --chart-1: oklch(0.6 0.2 30);
    --chart-2: oklch(0.6 0.2 90);
    --chart-3: oklch(0.6 0.2 150);
    --chart-4: oklch(0.6 0.2 210);
    --chart-5: oklch(0.6 0.2 270);
    --sidebar: oklch(1 0 0);
    --sidebar-foreground: oklch(0.1 0 0);
    --sidebar-primary: oklch(0.5 0.2 200);
    --sidebar-primary-foreground: oklch(1 0 0);
    --sidebar-accent: oklch(0.9 0 0);
    --sidebar-accent-foreground: oklch(0.1 0 0);
    --sidebar-border: oklch(0.9 0 0);
    --sidebar-ring: oklch(0.7 0 0);
  }

  .dark {
    --background: oklch(0.1 0 0);
    --foreground: oklch(1 0 0);
    --card: oklch(0.15 0 0);
    --card-foreground: oklch(1 0 0);
    --popover: oklch(0.15 0 0);
    --popover-foreground: oklch(1 0 0);
    --primary: oklch(0.7 0.2 200);
    --primary-foreground: oklch(0.1 0 0);
    --secondary: oklch(0.2 0 0);
    --secondary-foreground: oklch(1 0 0);
    --muted: oklch(0.2 0 0);
    --muted-foreground: oklch(0.6 0 0);
    --accent: oklch(0.2 0 0);
    --accent-foreground: oklch(1 0 0);
    --destructive: oklch(0.6 0.2 30);
    --destructive-foreground: oklch(1 0 0);
    --border: oklch(0.2 0 0);
    --input: oklch(0.2 0 0);
    --ring: oklch(0.4 0 0);
    --chart-1: oklch(0.6 0.2 30);
    --chart-2: oklch(0.6 0.2 90);
    --chart-3: oklch(0.6 0.2 150);
    --chart-4: oklch(0.6 0.2 210);
    --chart-5: oklch(0.6 0.2 270);
    --sidebar: oklch(0.15 0 0);
    --sidebar-foreground: oklch(1 0 0);
    --sidebar-primary: oklch(0.7 0.2 200);
    --sidebar-primary-foreground: oklch(0.1 0 0);
    --sidebar-accent: oklch(0.2 0 0);
    --sidebar-accent-foreground: oklch(1 0 0);
    --sidebar-border: oklch(0.2 0 0);
    --sidebar-ring: oklch(0.4 0 0);
  }
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}
`;

const MINIMAL_BUTTON_TSX = `import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva("inline-flex", {
  variants: {
    variant: { default: "bg-primary" },
  },
});

export function Button({ className }: { className?: string }) {
  return <button data-slot="button" className={cn(buttonVariants({}), className)} />;
}
`;

test('Connect modal: successful fetch swaps in the document from the mocked repo', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForSelector('.mintcn-preview');

  // Mock the GitHub contents API + raw file endpoints for the fake repo.
  await page.route('https://raw.githubusercontent.com/mock/repo/main/components.json', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: MINIMAL_COMPONENTS_JSON,
    }),
  );
  await page.route('https://raw.githubusercontent.com/mock/repo/main/app/globals.css', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/css',
      body: MINIMAL_GLOBALS_CSS,
    }),
  );
  await page.route(
    'https://api.github.com/repos/mock/repo/contents/components/ui?ref=main',
    (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            name: 'button.tsx',
            path: 'components/ui/button.tsx',
            type: 'file',
            download_url:
              'https://raw.githubusercontent.com/mock/repo/main/components/ui/button.tsx',
          },
        ]),
      }),
  );
  await page.route(
    'https://raw.githubusercontent.com/mock/repo/main/components/ui/button.tsx',
    (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/tsx',
        body: MINIMAL_BUTTON_TSX,
      }),
  );

  // Open the Connect modal via the header button.
  await page.getByRole('button', { name: '⇱ Connect' }).click();
  await expect(page.getByRole('dialog', { name: 'Connect project' })).toBeVisible();

  // Paste the URL + hit Connect.
  await page
    .getByPlaceholder('https://github.com/', { exact: false })
    .fill('https://github.com/mock/repo');
  await page.getByRole('button', { name: 'Connect', exact: true }).click();

  // Modal closes on success; the header sub-title updates to the new project name.
  await expect(page.getByRole('dialog', { name: 'Connect project' })).toHaveCount(0);
  await expect(page.getByText(/repo · slate · 1 component/)).toBeVisible();

  // The store's document is the newly-loaded one.
  const doc = await getDocument(page);
  const componentIds = doc?.components.map((c) => c.id) ?? [];
  expect(componentIds).toEqual(['button']);
});

test('Connect modal: invalid URL surfaces an inline error', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '⇱ Connect' }).click();
  await page.getByPlaceholder('https://github.com/', { exact: false }).fill('not a url');
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
  await expect(page.getByText('Could not parse that URL', { exact: false })).toBeVisible();
});

test('Connect modal: repo without components.json surfaces the "not a shadcn project" hint', async ({
  page,
}) => {
  await page.goto('/');

  // 404 on root components.json → fetcher falls back to git/trees discovery.
  await page.route(
    'https://raw.githubusercontent.com/example/no-shadcn/main/components.json',
    (route) => route.fulfill({ status: 404, body: 'not found' }),
  );
  await page.route(
    'https://api.github.com/repos/example/no-shadcn/git/trees/main?recursive=1',
    (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tree: [
            { path: 'README.md', type: 'blob' },
            { path: 'src/index.ts', type: 'blob' },
          ],
          truncated: false,
        }),
      }),
  );

  await page.getByRole('button', { name: '⇱ Connect' }).click();
  await page
    .getByPlaceholder('https://github.com/', { exact: false })
    .fill('https://github.com/example/no-shadcn');
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
  await expect(page.getByText('No components.json anywhere', { exact: false })).toBeVisible();
});

test('Connect modal: monorepo with multiple components.json files lists candidates', async ({
  page,
}) => {
  await page.goto('/');

  await page.route('https://raw.githubusercontent.com/example/mono/main/components.json', (route) =>
    route.fulfill({ status: 404, body: 'not found' }),
  );
  await page.route(
    'https://api.github.com/repos/example/mono/git/trees/main?recursive=1',
    (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tree: [
            { path: 'apps/web/components.json', type: 'blob' },
            { path: 'apps/docs/components.json', type: 'blob' },
            { path: 'packages/ui/README.md', type: 'blob' },
          ],
          truncated: false,
        }),
      }),
  );

  await page.getByRole('button', { name: '⇱ Connect' }).click();
  await page
    .getByPlaceholder('https://github.com/', { exact: false })
    .fill('https://github.com/example/mono');
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
  await expect(page.getByText('Found multiple components.json', { exact: false })).toBeVisible();
  await expect(page.getByText('apps/web', { exact: false })).toBeVisible();
});
