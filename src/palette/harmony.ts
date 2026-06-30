/**
 * OKLCH harmony helpers — pure functions for palette generation.
 *
 * Every operation works in OKLCH so the perceptual coherence properties hold
 * (equal L jumps look equally bright, equal C jumps equally saturated). All
 * functions are deterministic when given an explicit RNG, so palette tests
 * can be reproduced.
 */

export interface OklchTriplet {
  l: number;
  c: number;
  h: number;
}

export type PaletteStrategy =
  | 'random'
  | 'monochromatic'
  | 'analogous'
  | 'complementary'
  | 'triadic';

export interface RandomSource {
  /** Uniform [0, 1). Pass Math.random by default. */
  next(): number;
}

export const DEFAULT_RNG: RandomSource = { next: () => Math.random() };

/** Constrain to the perceptually-sensible OKLCH gamut shadcn uses. */
const L_MIN = 0.12;
const L_MAX = 0.92;
const C_MIN = 0;
const C_MAX = 0.28;

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
}

export function wrapHue(h: number): number {
  return ((h % 360) + 360) % 360;
}

function randomBetween(rng: RandomSource, min: number, max: number): number {
  return min + rng.next() * (max - min);
}

/** A random OKLCH color anywhere in the safe gamut. */
export function randomColor(rng: RandomSource = DEFAULT_RNG): OklchTriplet {
  return {
    l: randomBetween(rng, 0.45, 0.75),
    c: randomBetween(rng, 0.08, C_MAX),
    h: randomBetween(rng, 0, 360),
  };
}

/**
 * Generate `count` colors related to `base` via the given strategy. Hue
 * relationships are deterministic; lightness/chroma jitter is RNG-driven so
 * consecutive generations from the same base feel varied.
 */
export function harmonize(
  base: OklchTriplet,
  strategy: PaletteStrategy,
  count: number,
  rng: RandomSource = DEFAULT_RNG,
): OklchTriplet[] {
  const baseHue = wrapHue(base.h);
  const out: OklchTriplet[] = [];

  for (let i = 0; i < count; i++) {
    let hue: number;
    let lightnessJitter: number;
    let chromaJitter: number;

    switch (strategy) {
      case 'random':
        out.push(randomColor(rng));
        continue;

      case 'monochromatic':
        hue = baseHue;
        lightnessJitter = randomBetween(rng, -0.15, 0.15);
        chromaJitter = randomBetween(rng, -0.04, 0.04);
        break;

      case 'analogous': {
        const sign = i % 2 === 0 ? 1 : -1;
        const distance = 15 + ((i / 2) | 0) * 15; // 15°, 30°, 45° on each side
        hue = wrapHue(baseHue + sign * distance);
        lightnessJitter = randomBetween(rng, -0.08, 0.08);
        chromaJitter = randomBetween(rng, -0.02, 0.02);
        break;
      }

      case 'complementary':
        hue = wrapHue(baseHue + (i % 2 === 0 ? 0 : 180));
        lightnessJitter = randomBetween(rng, -0.1, 0.1);
        chromaJitter = randomBetween(rng, -0.03, 0.03);
        break;

      case 'triadic':
        hue = wrapHue(baseHue + (i % 3) * 120);
        lightnessJitter = randomBetween(rng, -0.08, 0.08);
        chromaJitter = randomBetween(rng, -0.03, 0.03);
        break;
    }

    out.push({
      l: clamp(base.l + lightnessJitter, L_MIN, L_MAX),
      c: clamp(base.c + chromaJitter, C_MIN, C_MAX),
      h: hue,
    });
  }

  return out;
}

/**
 * Invert a light-theme color for its dark-theme counterpart while preserving
 * hue. Reduces chroma slightly because saturated dark colors look harsher than
 * their light equivalents — the same heuristic the shadcn default themes use.
 */
export function darkenForDark(color: OklchTriplet): OklchTriplet {
  return {
    l: clamp(1.04 - color.l, L_MIN, L_MAX),
    c: clamp(color.c * 0.85, C_MIN, C_MAX),
    h: color.h,
  };
}
