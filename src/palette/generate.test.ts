import { describe, expect, it } from 'vitest';
import { SEMANTIC_COLOR_TOKENS } from '@/schema';
import { generatePalette } from './generate';
import type { RandomSource } from './harmony';

function seqRng(values: number[]): RandomSource {
  let i = 0;
  return { next: () => values[i++ % values.length] };
}

describe('generatePalette', () => {
  it('produces a full color map for both themes', () => {
    const palette = generatePalette({
      strategy: 'monochromatic',
      rng: seqRng([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]),
    });
    for (const token of SEMANTIC_COLOR_TOKENS) {
      expect(palette.light[token], `light/${token}`).toBeDefined();
      expect(palette.dark[token], `dark/${token}`).toBeDefined();
    }
  });

  it('respects a locked primary — generated map keeps the same value', () => {
    const primary = { l: 0.55, c: 0.18, h: 264 };
    const palette = generatePalette({
      strategy: 'analogous',
      locks: { primary },
      rng: seqRng([0.5, 0.5, 0.5, 0.5]),
    });
    expect(palette.light.primary).toEqual({
      kind: 'literal',
      space: 'oklch',
      value: 'oklch(0.55 0.18 264)',
    });
  });

  it('dark theme inverts background lightness vs. light theme', () => {
    const palette = generatePalette({
      strategy: 'monochromatic',
      rng: seqRng([0.5, 0.5, 0.5, 0.5, 0.5, 0.5]),
    });
    const light = parseOklchL(palette.light.background);
    const dark = parseOklchL(palette.dark.background);
    expect(light).toBeGreaterThan(dark);
  });

  it('foregrounds are contrast-paired with their backgrounds', () => {
    const palette = generatePalette({
      strategy: 'monochromatic',
      rng: seqRng([0.5, 0.5, 0.5, 0.5]),
    });
    const lightBgL = parseOklchL(palette.light.background);
    const lightFgL = parseOklchL(palette.light.foreground);
    expect(Math.abs(lightBgL - lightFgL)).toBeGreaterThan(0.5);

    const darkBgL = parseOklchL(palette.dark.background);
    const darkFgL = parseOklchL(palette.dark.foreground);
    expect(Math.abs(darkBgL - darkFgL)).toBeGreaterThan(0.5);
  });
});

function parseOklchL(value: { kind: 'literal'; value: string } | { kind: 'derived' }): number {
  if (value.kind === 'derived') throw new Error('expected literal in generated palette');
  const m = value.value.match(/oklch\(([\d.]+)/);
  return m ? Number.parseFloat(m[1]) : Number.NaN;
}
