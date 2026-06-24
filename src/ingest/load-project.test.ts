import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadProject } from '@/ingest';
import { SEMANTIC_COLOR_TOKENS } from '@/schema';

const FIXTURE_ROOT = path.resolve(__dirname, '../../fixtures/shadcn-app');

describe('loadProject (end-to-end against fixtures/shadcn-app)', () => {
  it('produces a validated ProjectDocument', () => {
    const doc = loadProject({ rootDir: FIXTURE_ROOT, name: 'shadcn-app' });
    expect(doc.version).toBe(1);
    expect(doc.meta.name).toBe('shadcn-app');
    expect(doc.meta.baseColor).toBe('slate');
    expect(doc.meta.config.tailwind.cssVariables).toBe(true);
  });

  it('reads every semantic color token in both themes', () => {
    const doc = loadProject({ rootDir: FIXTURE_ROOT });
    for (const token of SEMANTIC_COLOR_TOKENS) {
      expect(doc.tokens.colors.light[token], `light/${token}`).toBeDefined();
      expect(doc.tokens.colors.dark[token], `dark/${token}`).toBeDefined();
    }
  });

  it('preserves color values verbatim and tags them with oklch', () => {
    const doc = loadProject({ rootDir: FIXTURE_ROOT });
    const primary = doc.tokens.colors.light.primary;
    expect(primary.kind).toBe('literal');
    if (primary.kind === 'literal') {
      expect(primary.space).toBe('oklch');
      expect(primary.value).toBe('oklch(0.208 0.042 265.755)');
    }
  });

  it('reads the radius from :root', () => {
    const doc = loadProject({ rootDir: FIXTURE_ROOT });
    expect(doc.tokens.radius.base).toBe('0.625rem');
  });

  it('discovers all four fixture components', () => {
    const doc = loadProject({ rootDir: FIXTURE_ROOT });
    const ids = doc.components.map((c) => c.id).sort();
    expect(ids).toEqual(['badge', 'button', 'card', 'input']);
  });

  it('extracts button cva variants with correct defaults', () => {
    const doc = loadProject({ rootDir: FIXTURE_ROOT });
    const button = doc.components.find((c) => c.id === 'button');
    expect(button).toBeDefined();
    const variantAxis = button?.variants.find((v) => v.name === 'variant');
    expect(variantAxis?.options).toEqual([
      'default',
      'destructive',
      'outline',
      'secondary',
      'ghost',
      'link',
    ]);
    expect(variantAxis?.default).toBe('default');
    const sizeAxis = button?.variants.find((v) => v.name === 'size');
    expect(sizeAxis?.options).toEqual(['default', 'sm', 'lg', 'icon']);
    expect(sizeAxis?.default).toBe('default');
  });

  it('extracts data-slot attributes for the card sub-components', () => {
    const doc = loadProject({ rootDir: FIXTURE_ROOT });
    const card = doc.components.find((c) => c.id === 'card');
    const slotNames = card?.slots.map((s) => s.name).sort();
    expect(slotNames).toEqual([
      'card',
      'card-action',
      'card-content',
      'card-description',
      'card-footer',
      'card-header',
      'card-title',
    ]);
  });

  it('detects consumed semantic color css vars on button', () => {
    const doc = loadProject({ rootDir: FIXTURE_ROOT });
    const button = doc.components.find((c) => c.id === 'button');
    expect(button?.consumes.cssVars).toEqual(
      expect.arrayContaining([
        '--primary',
        '--primary-foreground',
        '--secondary',
        '--secondary-foreground',
        '--destructive',
        '--accent',
        '--accent-foreground',
        '--background',
        '--ring',
      ]),
    );
  });

  it('detects interactive states from class strings', () => {
    const doc = loadProject({ rootDir: FIXTURE_ROOT });
    const input = doc.components.find((c) => c.id === 'input');
    expect(input?.states).toEqual(expect.arrayContaining(['focus-visible', 'disabled']));
    const button = doc.components.find((c) => c.id === 'button');
    expect(button?.states).toEqual(expect.arrayContaining(['hover', 'focus-visible', 'disabled']));
  });

  it('components without cva (card, input) produce an empty variants array', () => {
    const doc = loadProject({ rootDir: FIXTURE_ROOT });
    const card = doc.components.find((c) => c.id === 'card');
    const input = doc.components.find((c) => c.id === 'input');
    expect(card?.variants).toEqual([]);
    expect(input?.variants).toEqual([]);
  });
});
