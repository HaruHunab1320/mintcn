import { describe, expect, it } from 'vitest';
import { pairedForeground } from './contrast';
import { clamp, darkenForDark, harmonize, type RandomSource, wrapHue } from './harmony';

/** Deterministic RNG so harmonize() can be asserted exactly. */
function seqRng(values: number[]): RandomSource {
  let i = 0;
  return { next: () => values[i++ % values.length] };
}

describe('clamp / wrapHue', () => {
  it('clamps to bounds', () => {
    expect(clamp(0.5, 0, 1)).toBe(0.5);
    expect(clamp(-1, 0, 1)).toBe(0);
    expect(clamp(2, 0, 1)).toBe(1);
  });

  it('wrapHue keeps values in [0, 360)', () => {
    expect(wrapHue(0)).toBe(0);
    expect(wrapHue(360)).toBe(0);
    expect(wrapHue(-30)).toBe(330);
    expect(wrapHue(720)).toBe(0);
    expect(wrapHue(450)).toBe(90);
  });
});

describe('harmonize', () => {
  const base = { l: 0.5, c: 0.15, h: 200 };
  const rng = seqRng([0.5, 0.5, 0.5, 0.5]); // jitters always neutral

  it('monochromatic preserves the hue', () => {
    const colors = harmonize(base, 'monochromatic', 3, seqRng([0.5, 0.5, 0.5, 0.5, 0.5, 0.5]));
    expect(colors.every((c) => c.h === base.h)).toBe(true);
  });

  it('analogous shifts hue by ±15° increments', () => {
    const colors = harmonize(base, 'analogous', 4, rng);
    // i=0: +15°, i=1: -15°, i=2: +30°, i=3: -30°
    expect(colors.map((c) => c.h)).toEqual([215, 185, 230, 170]);
  });

  it('complementary alternates 180°', () => {
    const colors = harmonize(base, 'complementary', 4, rng);
    expect(colors.map((c) => c.h)).toEqual([200, 20, 200, 20]);
  });

  it('triadic walks 120° increments', () => {
    const colors = harmonize(base, 'triadic', 3, rng);
    expect(colors.map((c) => c.h)).toEqual([200, 320, 80]);
  });

  it('clamps L and C to the safe gamut', () => {
    const extreme = { l: 0.95, c: 0.3, h: 200 };
    const colors = harmonize(extreme, 'monochromatic', 1, seqRng([1, 1])); // pushes upward
    expect(colors[0].l).toBeLessThanOrEqual(0.92);
    expect(colors[0].c).toBeLessThanOrEqual(0.28);
  });
});

describe('darkenForDark', () => {
  it('inverts lightness around 0.52', () => {
    const dark = darkenForDark({ l: 0.9, c: 0.1, h: 200 });
    expect(dark.l).toBeCloseTo(0.14, 1);
  });

  it('reduces chroma slightly', () => {
    const dark = darkenForDark({ l: 0.5, c: 0.2, h: 200 });
    expect(dark.c).toBeCloseTo(0.17, 1);
    expect(dark.c).toBeLessThan(0.2);
  });

  it('preserves hue', () => {
    expect(darkenForDark({ l: 0.5, c: 0.1, h: 137 }).h).toBe(137);
  });
});

describe('pairedForeground', () => {
  it('returns dark text for light backgrounds', () => {
    const fg = pairedForeground({ l: 0.95, c: 0.02, h: 200 });
    expect(fg.l).toBeLessThan(0.3);
  });

  it('returns light text for dark backgrounds', () => {
    const fg = pairedForeground({ l: 0.18, c: 0.04, h: 200 });
    expect(fg.l).toBeGreaterThan(0.9);
  });
});
