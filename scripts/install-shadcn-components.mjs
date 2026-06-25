#!/usr/bin/env node
// Fetch every shadcn/ui v4 (new-york) component's registry JSON, write the
// source file(s) into the fixture, and print the union of required npm deps
// so the caller can `pnpm add` them.
//
// Why this instead of `npx shadcn add --all`:
//   - The shadcn CLI requires a package.json in cwd; our fixture doesn't have
//     one (and shouldn't — it's the round-trip test target, not a real app).
//   - The CLI resolves the `@` path alias via tsconfig walk-up, which would
//     write components into our app's src/ instead of the fixture.
//   - We want deterministic, idempotent file writes the test suite can pin.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_ROOT = path.resolve(__dirname, '../fixtures/shadcn-app');
const REGISTRY_BASE = 'https://ui.shadcn.com/r/styles/new-york-v4';

// Source of truth: https://github.com/shadcn-ui/ui/tree/main/apps/v4/registry/new-york-v4/ui
const COMPONENTS = [
  'accordion',
  'alert',
  'alert-dialog',
  'aspect-ratio',
  'avatar',
  'badge',
  'breadcrumb',
  'button',
  'calendar',
  'card',
  'carousel',
  'chart',
  'checkbox',
  'collapsible',
  'command',
  'context-menu',
  'dialog',
  'drawer',
  'dropdown-menu',
  'form',
  'hover-card',
  'input',
  'input-otp',
  'label',
  'menubar',
  'navigation-menu',
  'pagination',
  'popover',
  'progress',
  'radio-group',
  'resizable',
  'scroll-area',
  'select',
  'separator',
  'sheet',
  'sidebar',
  'skeleton',
  'slider',
  'sonner',
  'switch',
  'table',
  'tabs',
  'textarea',
  'toggle',
  'toggle-group',
  'tooltip',
];

async function fetchComponent(name) {
  const res = await fetch(`${REGISTRY_BASE}/${name}.json`);
  if (!res.ok) throw new Error(`fetch ${name}: ${res.status} ${res.statusText}`);
  return res.json();
}

/**
 * Map a registry file path to where it lands in the fixture.
 *   registry/new-york-v4/ui/accordion.tsx  -> components/ui/accordion.tsx
 *   registry/new-york-v4/lib/utils.ts      -> lib/utils.ts
 *   registry/new-york-v4/hooks/use-foo.ts  -> hooks/use-foo.ts
 */
function normalizeFilePath(p) {
  const stripped = p.replace(/^registry\/[^/]+\//, '');
  if (stripped.startsWith('ui/')) return `components/${stripped}`;
  return stripped;
}

/**
 * Registry source uses the shadcn repo's internal layout for cross-fixture
 * imports (e.g. `@/registry/new-york-v4/ui/button`). Rewrite those to relative
 * paths within the fixture so we don't need an extra path alias in the app —
 * `@/lib/utils` still resolves through our src/ shim as the consumer expects.
 */
function rewriteImports(content) {
  return content
    .replace(/@\/registry\/[^/]+\/ui\//g, './')
    .replace(/@\/registry\/[^/]+\/hooks\//g, '../../hooks/')
    .replace(/@\/registry\/[^/]+\/lib\//g, '../../lib/');
}

async function writeFile(rel, content) {
  const abs = path.join(FIXTURE_ROOT, rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, rewriteImports(content), 'utf8');
}

async function main() {
  const allDeps = new Set();
  const allRegistryDeps = new Set();
  const skipped = [];

  for (const name of COMPONENTS) {
    process.stdout.write(`  ${name.padEnd(20)} `);
    try {
      const item = await fetchComponent(name);
      for (const dep of item.dependencies ?? []) allDeps.add(dep);
      for (const dep of item.registryDependencies ?? []) allRegistryDeps.add(dep);
      for (const file of item.files ?? []) {
        const rel = normalizeFilePath(file.path);
        await writeFile(rel, file.content);
      }
      process.stdout.write(`✓ (${(item.files ?? []).length} file${item.files?.length === 1 ? '' : 's'})\n`);
    } catch (err) {
      skipped.push({ name, error: err.message });
      process.stdout.write(`× ${err.message}\n`);
    }
  }

  console.log('\nRuntime dependencies (pnpm add):');
  for (const d of [...allDeps].sort()) console.log(`  ${d}`);

  if (allRegistryDeps.size > 0) {
    console.log('\nRegistry dependencies (already-bundled shadcn pieces, ignore if present):');
    for (const d of [...allRegistryDeps].sort()) console.log(`  ${d}`);
  }

  if (skipped.length > 0) {
    console.log('\nSkipped:');
    for (const s of skipped) console.log(`  ${s.name}: ${s.error}`);
    process.exit(1);
  }
}

await main();
