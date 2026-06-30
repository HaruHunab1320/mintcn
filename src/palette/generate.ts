import type { ColorMap, ColorValue, SemanticColorToken } from '@/schema';
import { mixOklch, pairedForeground } from './contrast';
import {
  clamp,
  DEFAULT_RNG,
  darkenForDark,
  harmonize,
  type OklchTriplet,
  type PaletteStrategy,
  type RandomSource,
  randomColor,
} from './harmony';

/**
 * Five "key" tokens the palette bar exposes for direct user control. Every
 * other semantic color is derived from these via the cascade below.
 */
export const KEY_PALETTE_TOKENS = [
  'primary',
  'secondary',
  'accent',
  'destructive',
  'background',
] as const satisfies readonly SemanticColorToken[];

export type KeyPaletteToken = (typeof KEY_PALETTE_TOKENS)[number];

export type PaletteLocks = Partial<Record<KeyPaletteToken, boolean>>;

interface BuildInput {
  /** Locked color values to keep verbatim during generation. */
  locked: Partial<Record<KeyPaletteToken, OklchTriplet>>;
  strategy: PaletteStrategy;
  rng: RandomSource;
}

/**
 * Pick the seed: the locked primary if any, otherwise a fresh random color.
 * The seed drives the harmonize() call for the other unlocked accents.
 */
function chooseSeed(input: BuildInput): OklchTriplet {
  if (input.locked.primary) return input.locked.primary;
  if (input.locked.accent) return input.locked.accent;
  if (input.locked.secondary) return input.locked.secondary;
  return randomColor(input.rng);
}

function chooseBackground(input: BuildInput): OklchTriplet {
  if (input.locked.background) return input.locked.background;
  // Backgrounds are near-white with a hint of the seed hue.
  const seed = chooseSeed(input);
  return { l: 1, c: 0, h: seed.h };
}

interface KeyColors {
  primary: OklchTriplet;
  secondary: OklchTriplet;
  accent: OklchTriplet;
  destructive: OklchTriplet;
  background: OklchTriplet;
}

function buildKeyColors(input: BuildInput): KeyColors {
  const seed = chooseSeed(input);
  // Generate three harmonized accents off the seed; assign in a stable order.
  const harmonized = harmonize(seed, input.strategy, 4, input.rng);
  const [a, b, c, d] = harmonized;

  return {
    primary: input.locked.primary ?? seed,
    secondary: input.locked.secondary ?? { l: 0.97, c: clamp(b.c * 0.25, 0, 0.04), h: b.h },
    accent: input.locked.accent ?? { l: 0.96, c: clamp(c.c * 0.25, 0, 0.04), h: c.h },
    // Keep destructive in the red family — that's its semantic meaning.
    destructive: input.locked.destructive ?? {
      l: 0.58,
      c: 0.22,
      h: 25 + (a.h % 15),
    },
    background: chooseBackground(input),
    // Unused d slot: harmonize returns N colors for downstream extensions.
    ..._consume(d),
  };
}

// Lint placeholder so the TS compiler doesn't drop the unused destructure.
function _consume(_: OklchTriplet): Record<string, never> {
  return {};
}

function oklchString(t: OklchTriplet): string {
  // 3-decimal precision matches the fixture's stored form (`0.208 0.042 265.755`)
  // so locked tokens round-trip byte-identical through generate -> oklchString.
  const round = (n: number) => Number.parseFloat(n.toFixed(3)).toString();
  return `oklch(${round(t.l)} ${round(t.c)} ${round(t.h)})`;
}

function literal(t: OklchTriplet): ColorValue {
  return { kind: 'literal', space: 'oklch', value: oklchString(t) };
}

/**
 * Cascade the five key colors out to the full semantic token set. The math
 * mirrors the shadcn convention: foregrounds contrast-paired, muted/border
 * derived by mixing background toward foreground, sidebar tokens mirror the
 * main set, ring tracks primary.
 */
function cascadeLight(key: KeyColors): Record<SemanticColorToken, ColorValue> {
  const fg = pairedForeground(key.background);
  const muted = mixOklch(key.background, fg, 0.08);
  const border = mixOklch(key.background, fg, 0.12);
  const mutedFg = mixOklch(fg, key.background, 0.4);

  return {
    background: literal(key.background),
    foreground: literal(fg),
    card: literal(key.background),
    'card-foreground': literal(fg),
    popover: literal(key.background),
    'popover-foreground': literal(fg),
    primary: literal(key.primary),
    'primary-foreground': literal(pairedForeground(key.primary)),
    secondary: literal(key.secondary),
    'secondary-foreground': literal(pairedForeground(key.secondary)),
    muted: literal(muted),
    'muted-foreground': literal(mutedFg),
    accent: literal(key.accent),
    'accent-foreground': literal(pairedForeground(key.accent)),
    destructive: literal(key.destructive),
    'destructive-foreground': literal(pairedForeground(key.destructive)),
    border: literal(border),
    input: literal(border),
    ring: literal({ ...key.primary, l: clamp(key.primary.l + 0.1, 0, 1) }),
    'chart-1': literal({ ...key.primary, h: (key.primary.h + 0) % 360 }),
    'chart-2': literal({ ...key.primary, h: (key.primary.h + 60) % 360 }),
    'chart-3': literal({ ...key.primary, h: (key.primary.h + 120) % 360 }),
    'chart-4': literal({ ...key.primary, h: (key.primary.h + 180) % 360 }),
    'chart-5': literal({ ...key.primary, h: (key.primary.h + 240) % 360 }),
    sidebar: literal(key.background),
    'sidebar-foreground': literal(fg),
    'sidebar-primary': literal(key.primary),
    'sidebar-primary-foreground': literal(pairedForeground(key.primary)),
    'sidebar-accent': literal(key.accent),
    'sidebar-accent-foreground': literal(pairedForeground(key.accent)),
    'sidebar-border': literal(border),
    'sidebar-ring': literal({ ...key.primary, l: clamp(key.primary.l + 0.1, 0, 1) }),
  } as ColorMap;
}

/** Build the dark-theme map by inverting the light one — preserves hue + relationships. */
function cascadeDark(key: KeyColors): Record<SemanticColorToken, ColorValue> {
  const darkKey: KeyColors = {
    primary: darkenForDark(key.primary),
    secondary: darkenForDark(key.secondary),
    accent: darkenForDark(key.accent),
    destructive: darkenForDark(key.destructive),
    background: darkenForDark(key.background),
  };
  return cascadeLight(darkKey);
}

export interface GeneratePaletteInput {
  strategy: PaletteStrategy;
  locks?: Partial<Record<KeyPaletteToken, OklchTriplet>>;
  rng?: RandomSource;
}

export interface GeneratedPalette {
  light: ColorMap;
  dark: ColorMap;
}

/**
 * Build a complete light + dark color map. Locked key tokens are preserved
 * verbatim; everything else is harmonized off the seed and cascaded out via
 * contrast/mix rules.
 */
export function generatePalette(input: GeneratePaletteInput): GeneratedPalette {
  const key = buildKeyColors({
    locked: input.locks ?? {},
    strategy: input.strategy,
    rng: input.rng ?? DEFAULT_RNG,
  });
  return {
    light: cascadeLight(key) as ColorMap,
    dark: cascadeDark(key) as ColorMap,
  };
}
