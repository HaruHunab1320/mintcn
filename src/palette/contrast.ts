import type { OklchTriplet } from './harmony';

/**
 * Pick a readable foreground for a given background OKLCH color.
 *
 * Heuristic only — uses OKLCH lightness as a proxy for perceptual luminance.
 * Backgrounds at L >= 0.6 get a near-black foreground; below that, near-white.
 * For shadcn-style themes this matches what the canonical light/dark pairs do.
 */
export function pairedForeground(background: OklchTriplet): OklchTriplet {
  if (background.l >= 0.6) {
    // Light background — dark foreground, slightly tinted by the bg hue.
    return { l: 0.145, c: Math.min(background.c * 0.4, 0.04), h: background.h };
  }
  // Dark background — light foreground, again subtly hue-tinted.
  return { l: 0.985, c: Math.min(background.c * 0.2, 0.01), h: background.h };
}

/**
 * Mix `from` toward `toward` by `amount` (0..1) in OKLCH. Used to derive
 * `muted`, `border`, `input`, etc. from the base background/foreground pair.
 */
export function mixOklch(from: OklchTriplet, toward: OklchTriplet, amount: number): OklchTriplet {
  const a = Math.max(0, Math.min(1, amount));
  return {
    l: from.l + (toward.l - from.l) * a,
    c: from.c + (toward.c - from.c) * a,
    h: from.h + (toward.h - from.h) * a,
  };
}
