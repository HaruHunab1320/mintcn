/**
 * sRGB (0-255) → OKLCH conversions, following the CSS Color Module Level 4
 * spec (and Björn Ottosson's original OKLab paper).
 *
 * Kept as a small self-contained module so the palette-from-image pipeline
 * doesn't need a full color library. Every function is pure and tested.
 */

import type { OklchTriplet } from './harmony';

/** Convert an sRGB channel (0..1) to its linear-light counterpart. */
function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Convert linear-light sRGB to OKLab. Matrix from CSS Color 4. */
function linearRgbToOklab(r: number, g: number, b: number): [number, number, number] {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);
  return [
    0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  ];
}

/** OKLab → OKLCH (rectangular → polar). */
function oklabToOklch(L: number, a: number, b: number): OklchTriplet {
  const c = Math.hypot(a, b);
  // Guard against numerical noise: a fully desaturated color has undefined hue,
  // so we return 0 to keep the OKLCH triple well-formed.
  const h = c < 1e-6 ? 0 : ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
  return { l: L, c, h };
}

/**
 * Convert an sRGB byte triplet (0..255 per channel) to an OKLCH triplet.
 * Alpha and gamut mapping are out of scope — callers should hand clean sRGB.
 */
export function rgbToOklch(r: number, g: number, b: number): OklchTriplet {
  const [L, a, bl] = linearRgbToOklab(
    srgbToLinear(r / 255),
    srgbToLinear(g / 255),
    srgbToLinear(b / 255),
  );
  return oklabToOklch(L, a, bl);
}

/** Linear-light sRGB → 8-bit sRGB via the gamma correction curve. */
function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
}

/** OKLab → linear-light sRGB. Inverse of `linearRgbToOklab`. */
function oklabToLinearRgb(L: number, a: number, b: number): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

export interface OklchToRgbResult {
  r: number;
  g: number;
  b: number;
  /** True when the ideal RGB fell outside [0, 255] — caller may want to hatch. */
  outOfGamut: boolean;
}

/**
 * Convert OKLCH → sRGB (0..255) with a clamp fallback for out-of-gamut colors.
 * Reports gamut status so wheel-style pickers can visually mark unreachable
 * chroma / hue combinations rather than lying about the color.
 */
export function oklchToRgb(l: number, c: number, h: number): OklchToRgbResult {
  const rad = (h * Math.PI) / 180;
  const a = c * Math.cos(rad);
  const b = c * Math.sin(rad);
  const [lr, lg, lb] = oklabToLinearRgb(l, a, b);
  const raw = [linearToSrgb(lr), linearToSrgb(lg), linearToSrgb(lb)];
  const outOfGamut = raw.some((v) => v < 0 || v > 1);
  return {
    r: Math.round(Math.min(1, Math.max(0, raw[0])) * 255),
    g: Math.round(Math.min(1, Math.max(0, raw[1])) * 255),
    b: Math.round(Math.min(1, Math.max(0, raw[2])) * 255),
    outOfGamut,
  };
}

/**
 * Distance between two OKLCH colors. Converts back to OKLab space
 * (Euclidean there is perceptually meaningful) so the k-means clusterer
 * doesn't have to worry about hue wrapping.
 */
export function oklchDistance(a: OklchTriplet, b: OklchTriplet): number {
  const ax = a.c * Math.cos((a.h * Math.PI) / 180);
  const ay = a.c * Math.sin((a.h * Math.PI) / 180);
  const bx = b.c * Math.cos((b.h * Math.PI) / 180);
  const by = b.c * Math.sin((b.h * Math.PI) / 180);
  return Math.hypot(a.l - b.l, ax - bx, ay - by);
}
