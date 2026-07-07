import { describe, expect, it } from 'vitest';
import type { ProjectDocument } from '@/schema';
import {
  applyShareableSlice,
  decodeShareLink,
  encodeShareLink,
  projectToShareableSlice,
} from './share-link';

/**
 * Hand-rolled minimal document. Cast at the end because ProjectDocument
 * includes fields we don't exercise here (themeImports, version, etc.);
 * the share-link code only reads meta.name/baseColor + tokens + overrides
 * + presets, so runtime behavior is what these tests validate.
 */
function baseDoc(): ProjectDocument {
  const doc = {
    version: 1 as const,
    meta: {
      name: 'demo',
      baseColor: 'zinc' as const,
      colorSpace: 'oklch' as const,
      themeImports: ['tailwindcss'],
      config: {
        style: 'new-york',
        tailwind: {
          css: 'app/globals.css',
          config: 'tailwind.config.ts',
          prefix: '',
          baseColor: 'zinc',
          cssVariables: true,
        },
        aliases: { components: '@/components', ui: '@/components/ui', utils: '@/lib/utils' },
      },
    },
    tokens: {
      colors: {
        light: {
          background: { kind: 'literal', space: 'oklch', value: 'oklch(1 0 0)' },
          foreground: { kind: 'literal', space: 'oklch', value: 'oklch(0.15 0 0)' },
          card: { kind: 'literal', space: 'oklch', value: 'oklch(1 0 0)' },
          'card-foreground': { kind: 'literal', space: 'oklch', value: 'oklch(0.15 0 0)' },
          popover: { kind: 'literal', space: 'oklch', value: 'oklch(1 0 0)' },
          'popover-foreground': { kind: 'literal', space: 'oklch', value: 'oklch(0.15 0 0)' },
          primary: { kind: 'literal', space: 'oklch', value: 'oklch(0.5 0.2 200)' },
          'primary-foreground': { kind: 'literal', space: 'oklch', value: 'oklch(1 0 0)' },
          secondary: { kind: 'literal', space: 'oklch', value: 'oklch(0.9 0 0)' },
          'secondary-foreground': { kind: 'literal', space: 'oklch', value: 'oklch(0.2 0 0)' },
          muted: { kind: 'literal', space: 'oklch', value: 'oklch(0.95 0 0)' },
          'muted-foreground': { kind: 'literal', space: 'oklch', value: 'oklch(0.5 0 0)' },
          accent: { kind: 'literal', space: 'oklch', value: 'oklch(0.95 0 0)' },
          'accent-foreground': { kind: 'literal', space: 'oklch', value: 'oklch(0.2 0 0)' },
          destructive: { kind: 'literal', space: 'oklch', value: 'oklch(0.55 0.25 25)' },
          'destructive-foreground': { kind: 'literal', space: 'oklch', value: 'oklch(1 0 0)' },
          border: { kind: 'literal', space: 'oklch', value: 'oklch(0.9 0 0)' },
          input: { kind: 'literal', space: 'oklch', value: 'oklch(0.9 0 0)' },
          ring: { kind: 'literal', space: 'oklch', value: 'oklch(0.7 0 0)' },
          'chart-1': { kind: 'literal', space: 'oklch', value: 'oklch(0.7 0.1 30)' },
          'chart-2': { kind: 'literal', space: 'oklch', value: 'oklch(0.7 0.1 60)' },
          'chart-3': { kind: 'literal', space: 'oklch', value: 'oklch(0.7 0.1 120)' },
          'chart-4': { kind: 'literal', space: 'oklch', value: 'oklch(0.7 0.1 240)' },
          'chart-5': { kind: 'literal', space: 'oklch', value: 'oklch(0.7 0.1 300)' },
          sidebar: { kind: 'literal', space: 'oklch', value: 'oklch(0.98 0 0)' },
          'sidebar-foreground': { kind: 'literal', space: 'oklch', value: 'oklch(0.15 0 0)' },
          'sidebar-primary': { kind: 'literal', space: 'oklch', value: 'oklch(0.5 0.2 200)' },
          'sidebar-primary-foreground': { kind: 'literal', space: 'oklch', value: 'oklch(1 0 0)' },
          'sidebar-accent': { kind: 'literal', space: 'oklch', value: 'oklch(0.95 0 0)' },
          'sidebar-accent-foreground': { kind: 'literal', space: 'oklch', value: 'oklch(0.2 0 0)' },
          'sidebar-border': { kind: 'literal', space: 'oklch', value: 'oklch(0.9 0 0)' },
          'sidebar-ring': { kind: 'literal', space: 'oklch', value: 'oklch(0.7 0 0)' },
        },
        dark: {} as never,
      } as never,
      radius: { base: '0.5rem' },
      typography: {
        fontFamily: { sans: 'Inter, sans-serif', serif: 'Georgia', mono: 'monospace' },
        scale: [],
      },
      spacing: [],
      shadows: {},
      borders: { width: {} },
    },
    components: [],
    overrides: [
      {
        componentId: 'button',
        variants: { size: { sm: { replaceWith: 'h-8 px-3' } } },
      },
    ],
    presets: [],
  };
  return doc as unknown as ProjectDocument;
}

describe('projectToShareableSlice', () => {
  it('captures tokens, overrides, presets, and identifying meta', () => {
    const slice = projectToShareableSlice(baseDoc());
    expect(slice.v).toBe(1);
    expect(slice.meta.name).toBe('demo');
    expect((slice.tokens.colors.light.primary as { value: string }).value).toBe(
      'oklch(0.5 0.2 200)',
    );
    expect(slice.overrides).toHaveLength(1);
  });
});

describe('encodeShareLink / decodeShareLink', () => {
  it('round-trips a slice through gzip + base64url without loss', async () => {
    const doc = baseDoc();
    const slice = projectToShareableSlice(doc);
    const encoded = await encodeShareLink(slice);
    expect(encoded).toMatch(/^1[gu]/);
    const decoded = await decodeShareLink(encoded);
    expect(decoded).toEqual(slice);
  });

  it('tolerates a leading # or "doc=" prefix', async () => {
    const slice = projectToShareableSlice(baseDoc());
    const encoded = await encodeShareLink(slice);
    const decoded = await decodeShareLink(`#doc=${encoded}`);
    expect(decoded).toEqual(slice);
  });

  it('rejects an unknown version', async () => {
    await expect(decodeShareLink('2gAAAA')).rejects.toThrow(/version/);
  });
});

describe('applyShareableSlice', () => {
  it('overlays tokens/overrides/presets on the base doc while keeping components', () => {
    const base = baseDoc();
    const slice = projectToShareableSlice(base);
    // Mutate the slice to prove it takes precedence.
    (slice.tokens.colors.light.primary as { value: string }).value = 'oklch(0.9 0.3 100)';
    slice.overrides = [];

    const applied = applyShareableSlice(base, slice);
    expect((applied.tokens.colors.light.primary as { value: string }).value).toBe(
      'oklch(0.9 0.3 100)',
    );
    expect(applied.overrides).toHaveLength(0);
    expect(applied.components).toBe(base.components);
    expect(applied.meta.config.style).toBe('new-york'); // preserved from base
  });
});
