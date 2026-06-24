import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  emitComponentSource,
  emitComponentsJson,
  emitDiff,
  emitRegistryItem,
  emitThemeCss,
} from '@/codegen';
import { loadProject } from '@/ingest';

const FIXTURE_ROOT = path.resolve(__dirname, '../../fixtures/shadcn-app');

function readFixture(rel: string): string {
  return fs.readFileSync(path.join(FIXTURE_ROOT, rel), 'utf8');
}

describe('Milestone 3 round-trip gate', () => {
  it('emitThemeCss reproduces the fixture globals.css byte-for-byte', () => {
    const doc = loadProject({ rootDir: FIXTURE_ROOT });
    const emitted = emitThemeCss(doc);
    const original = readFixture('app/globals.css');
    expect(emitted).toBe(original);
  });

  it('emitComponentsJson reproduces the fixture components.json byte-for-byte', () => {
    const doc = loadProject({ rootDir: FIXTURE_ROOT });
    const emitted = emitComponentsJson(doc);
    const original = readFixture('components.json');
    expect(emitted).toBe(original);
  });

  it('emitComponentSource is byte-identical to input when no override applies', () => {
    const doc = loadProject({ rootDir: FIXTURE_ROOT });
    for (const component of doc.components) {
      const original = readFixture(component.source.path);
      const emitted = emitComponentSource({ source: original });
      expect(emitted, `round-trip ${component.id}`).toBe(original);
    }
  });

  it('emitDiff returns empty string for a zero-change emit', () => {
    const doc = loadProject({ rootDir: FIXTURE_ROOT });
    const original = readFixture('app/globals.css');
    const emitted = emitThemeCss(doc);
    expect(emitDiff({ filename: 'app/globals.css', original, emitted })).toBe('');
  });
});

describe('determinism', () => {
  it('emitThemeCss is byte-identical across two runs', () => {
    const doc = loadProject({ rootDir: FIXTURE_ROOT });
    expect(emitThemeCss(doc)).toBe(emitThemeCss(doc));
  });

  it('emitComponentsJson is byte-identical across two runs', () => {
    const doc = loadProject({ rootDir: FIXTURE_ROOT });
    expect(emitComponentsJson(doc)).toBe(emitComponentsJson(doc));
  });

  it('emitRegistryItem is byte-identical across two runs', () => {
    const doc = loadProject({ rootDir: FIXTURE_ROOT });
    expect(emitRegistryItem(doc)).toBe(emitRegistryItem(doc));
  });
});

describe('token edit isolation', () => {
  it('changing one --primary value only changes lines for --primary', () => {
    const doc = loadProject({ rootDir: FIXTURE_ROOT });
    const before = emitThemeCss(doc);

    const mutated = {
      ...doc,
      tokens: {
        ...doc.tokens,
        colors: {
          ...doc.tokens.colors,
          light: {
            ...doc.tokens.colors.light,
            primary: {
              kind: 'literal' as const,
              space: 'oklch' as const,
              value: 'oklch(0.21 0.04 264)',
            },
          },
        },
      },
    };
    const after = emitThemeCss(mutated);

    expect(after).not.toBe(before);
    const diff = emitDiff({ filename: 'app/globals.css', original: before, emitted: after });
    const changedLines = diff
      .split('\n')
      .filter(
        (l) =>
          (l.startsWith('+') || l.startsWith('-')) && !l.startsWith('+++') && !l.startsWith('---'),
      );
    // Exactly one removal + one addition, both targeting --primary in :root.
    expect(changedLines).toHaveLength(2);
    expect(changedLines.every((l) => l.includes('--primary:'))).toBe(true);
  });

  it('emitting a derived color produces a color-mix() expression', () => {
    const doc = loadProject({ rootDir: FIXTURE_ROOT });
    const mutated = {
      ...doc,
      tokens: {
        ...doc.tokens,
        colors: {
          ...doc.tokens.colors,
          light: {
            ...doc.tokens.colors.light,
            primary: {
              kind: 'derived' as const,
              from: 'background' as const,
              mix: { space: 'oklch' as const, toward: 'var(--foreground)', amount: 0.08 },
            },
          },
        },
      },
    };
    const emitted = emitThemeCss(mutated);
    expect(emitted).toContain(
      '--primary: color-mix(in oklch, var(--background) 92%, var(--foreground));',
    );
  });
});

describe('typography + shadows', () => {
  it('changing --font-sans only changes that line', () => {
    const doc = loadProject({ rootDir: FIXTURE_ROOT });
    const before = emitThemeCss(doc);
    const mutated = {
      ...doc,
      tokens: {
        ...doc.tokens,
        typography: {
          ...doc.tokens.typography,
          fontFamily: { ...doc.tokens.typography.fontFamily, sans: '"Geist", sans-serif' },
        },
      },
    };
    const after = emitThemeCss(mutated);
    const diff = emitDiff({ filename: 'app/globals.css', original: before, emitted: after });
    const changedLines = diff
      .split('\n')
      .filter(
        (l) =>
          (l.startsWith('+') || l.startsWith('-')) && !l.startsWith('+++') && !l.startsWith('---'),
      );
    expect(changedLines).toHaveLength(2);
    expect(changedLines.every((l) => l.includes('--font-sans:'))).toBe(true);
  });

  it('adding a new shadow appends a line in @theme inline without disturbing others', () => {
    const doc = loadProject({ rootDir: FIXTURE_ROOT });
    const before = emitThemeCss(doc);
    const mutated = {
      ...doc,
      tokens: {
        ...doc.tokens,
        shadows: { ...doc.tokens.shadows, xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)' },
      },
    };
    const after = emitThemeCss(mutated);
    const diff = emitDiff({ filename: 'app/globals.css', original: before, emitted: after });
    const added = diff.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++'));
    expect(added).toHaveLength(1);
    expect(added[0]).toContain('--shadow-xl:');
  });
});

describe('cva rewrite', () => {
  it('a class delta on button size.sm changes only that variant option', () => {
    const buttonPath = path.join(FIXTURE_ROOT, 'components/ui/button.tsx');
    const original = fs.readFileSync(buttonPath, 'utf8');

    const emitted = emitComponentSource({
      source: original,
      override: {
        componentId: 'button',
        variants: {
          size: {
            sm: { set: { 'padding-inline': '1rem' }, removeUtilities: ['px-3'] },
          },
        },
      },
    });

    expect(emitted).not.toBe(original);
    // Only the sm option's class string should differ; px-3 → px-4.
    expect(emitted.includes('h-8 rounded-md px-4 has-[>svg]:px-2.5')).toBe(true);
    // Default size is untouched
    expect(emitted.includes('h-9 px-4 py-2 has-[>svg]:px-3')).toBe(true);
    // lg size is untouched
    expect(emitted.includes('h-10 rounded-md px-6 has-[>svg]:px-4')).toBe(true);
  });
});

describe('emitRegistryItem shape', () => {
  it('produces cssVars.{theme,light,dark} with every semantic token', () => {
    const doc = loadProject({ rootDir: FIXTURE_ROOT });
    const json = JSON.parse(emitRegistryItem(doc, { name: 'shadcn-app-theme' }));
    expect(json.type).toBe('registry:theme');
    expect(json.name).toBe('shadcn-app-theme');
    expect(json.cssVars.theme.radius).toBe('0.625rem');
    expect(json.cssVars.light.primary).toBe('oklch(0.208 0.042 265.755)');
    expect(json.cssVars.dark.primary).toBe('oklch(0.929 0.013 255.508)');
  });
});
