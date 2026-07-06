import { describe, expect, it } from 'vitest';
import { oklchDistance, oklchToRgb, rgbToOklch } from './color-space';

describe('rgbToOklch', () => {
  it('maps pure white to (1, 0, *)', () => {
    const { l, c } = rgbToOklch(255, 255, 255);
    expect(l).toBeCloseTo(1, 3);
    expect(c).toBeLessThan(0.001);
  });

  it('maps pure black to (0, 0, *)', () => {
    const { l, c } = rgbToOklch(0, 0, 0);
    expect(l).toBeCloseTo(0, 3);
    expect(c).toBeLessThan(0.001);
  });

  it('maps sRGB red to a hue near 29°', () => {
    // Reference: rgbToOklch(255, 0, 0) → oklch(0.628 0.258 29.23)
    const { l, c, h } = rgbToOklch(255, 0, 0);
    expect(l).toBeCloseTo(0.628, 2);
    expect(c).toBeCloseTo(0.258, 2);
    expect(h).toBeCloseTo(29.23, 0);
  });

  it('maps sRGB blue to a hue near 264°', () => {
    const { h } = rgbToOklch(0, 0, 255);
    expect(h).toBeCloseTo(264.05, 0);
  });
});

describe('oklchToRgb', () => {
  it('round-trips pure sRGB primaries within one 8-bit step', () => {
    for (const [r, g, b] of [
      [255, 0, 0],
      [0, 255, 0],
      [0, 0, 255],
      [255, 255, 255],
      [0, 0, 0],
    ]) {
      const oklch = rgbToOklch(r, g, b);
      const back = oklchToRgb(oklch.l, oklch.c, oklch.h);
      expect(Math.abs(back.r - r)).toBeLessThanOrEqual(1);
      expect(Math.abs(back.g - g)).toBeLessThanOrEqual(1);
      expect(Math.abs(back.b - b)).toBeLessThanOrEqual(1);
    }
  });

  it('flags out-of-gamut when chroma exceeds sRGB at a given lightness', () => {
    // Very high chroma at mid-lightness is not reachable in sRGB.
    const { outOfGamut } = oklchToRgb(0.5, 0.4, 0);
    expect(outOfGamut).toBe(true);
  });

  it('reports in-gamut for a safe color', () => {
    // Neutral gray — zero chroma is always in sRGB.
    const { outOfGamut } = oklchToRgb(0.5, 0.0, 0);
    expect(outOfGamut).toBe(false);
  });
});

describe('oklchDistance', () => {
  it('is 0 for identical colors', () => {
    const c = { l: 0.5, c: 0.2, h: 200 };
    expect(oklchDistance(c, c)).toBe(0);
  });

  it('handles hue wraparound (350° vs 10° is short)', () => {
    const a = { l: 0.5, c: 0.2, h: 350 };
    const b = { l: 0.5, c: 0.2, h: 10 };
    // Converting to Lab makes the wraparound go away.
    expect(oklchDistance(a, b)).toBeLessThan(0.15);
  });

  it('separates unrelated colors', () => {
    const a = { l: 0.2, c: 0.1, h: 0 };
    const b = { l: 0.8, c: 0.1, h: 180 };
    expect(oklchDistance(a, b)).toBeGreaterThan(0.5);
  });
});
