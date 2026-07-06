import { generatePalette, type OklchTriplet } from '@/palette';
import type { TokenState } from '@/schema';

export type ThemeCategory = 'sci-fi' | 'hacker' | 'retro' | 'classic';

export interface CuratedTheme {
  id: string;
  name: string;
  tagline: string;
  category: ThemeCategory;
  /** Key OKLCH colors in light-mode reference. cascadeDark auto-inverts them. */
  keyColors: {
    primary: OklchTriplet;
    secondary: OklchTriplet;
    accent: OklchTriplet;
    destructive: OklchTriplet;
    background: OklchTriplet;
  };
  radius: string;
  fontFamily: {
    sans: string;
    serif: string;
    mono: string;
  };
}

/**
 * Curated theme spec → concrete tokens spec. Uses the same generator the
 * palette bar's "Generate" button uses, but locks every key token so the
 * result is deterministic. Callers get back the exact shape the store's
 * `applyTheme` action expects.
 */
export function themeToSpec(theme: CuratedTheme): {
  colors: TokenState['colors'];
  radius: string;
  fontFamily: TokenState['typography']['fontFamily'];
} {
  const { light, dark } = generatePalette({
    strategy: 'monochromatic',
    locks: theme.keyColors,
  });
  return {
    colors: { light, dark },
    radius: theme.radius,
    fontFamily: theme.fontFamily,
  };
}

const MONO_STACK = '"JetBrains Mono", "Fira Code", ui-monospace, monospace';
const SERIF_STACK = '"Instrument Serif", Georgia, serif';
const SANS_INTER = '"Inter", ui-sans-serif, system-ui, sans-serif';
const SANS_GEIST = '"Geist", ui-sans-serif, system-ui, sans-serif';
const SANS_MANROPE = '"Manrope", ui-sans-serif, system-ui, sans-serif';
const SANS_SPACE = '"Space Grotesk", ui-sans-serif, system-ui, sans-serif';

/**
 * The starter theme gallery. Each entry is intentionally opinionated — a full
 * palette + font stack the user can apply as one action. Hues follow real
 * pop-culture references so they read as "the theme," not "a color scheme."
 *
 * Adding a theme: pick five key OKLCH colors that make sense in LIGHT mode
 * (background near-white with the vibe's tint; primary/accent at their
 * intended saturation). The generator's dark cascade inverts them for the
 * dark preview automatically.
 */
export const CURATED_THEMES: CuratedTheme[] = [
  {
    id: 'cyberpunk-2077',
    name: 'Cyberpunk 2077',
    tagline: 'Neon pink signage on wet obsidian streets.',
    category: 'sci-fi',
    keyColors: {
      primary: { l: 0.68, c: 0.24, h: 330 },
      secondary: { l: 0.72, c: 0.2, h: 190 },
      accent: { l: 0.85, c: 0.2, h: 90 },
      destructive: { l: 0.62, c: 0.24, h: 25 },
      background: { l: 0.98, c: 0.02, h: 330 },
    },
    radius: '0.125rem',
    fontFamily: {
      sans: SANS_SPACE,
      serif: SERIF_STACK,
      mono: MONO_STACK,
    },
  },
  {
    id: 'matrix-terminal',
    name: 'Matrix Terminal',
    tagline: 'Phosphor green rain on a black CRT.',
    category: 'hacker',
    keyColors: {
      primary: { l: 0.72, c: 0.22, h: 145 },
      secondary: { l: 0.6, c: 0.14, h: 140 },
      accent: { l: 0.82, c: 0.18, h: 135 },
      destructive: { l: 0.62, c: 0.22, h: 25 },
      background: { l: 0.98, c: 0.02, h: 135 },
    },
    radius: '0rem',
    fontFamily: {
      sans: MONO_STACK,
      serif: MONO_STACK,
      mono: MONO_STACK,
    },
  },
  {
    id: 'amber-crt',
    name: 'Amber CRT',
    tagline: 'Warm amber glow, VT220-era workstation.',
    category: 'retro',
    keyColors: {
      primary: { l: 0.75, c: 0.19, h: 70 },
      secondary: { l: 0.68, c: 0.14, h: 55 },
      accent: { l: 0.85, c: 0.16, h: 80 },
      destructive: { l: 0.62, c: 0.22, h: 25 },
      background: { l: 0.98, c: 0.03, h: 70 },
    },
    radius: '0.125rem',
    fontFamily: {
      sans: MONO_STACK,
      serif: SERIF_STACK,
      mono: MONO_STACK,
    },
  },
  {
    id: 'synthwave-sunset',
    name: 'Synthwave Sunset',
    tagline: 'Magenta grid, cyan horizon, endless coast highway.',
    category: 'retro',
    keyColors: {
      primary: { l: 0.7, c: 0.24, h: 320 },
      secondary: { l: 0.75, c: 0.2, h: 260 },
      accent: { l: 0.8, c: 0.22, h: 195 },
      destructive: { l: 0.62, c: 0.24, h: 25 },
      background: { l: 0.97, c: 0.03, h: 300 },
    },
    radius: '0.5rem',
    fontFamily: {
      sans: SANS_SPACE,
      serif: SERIF_STACK,
      mono: MONO_STACK,
    },
  },
  {
    id: 'blade-runner-2049',
    name: 'Blade Runner 2049',
    tagline: 'Radioactive amber against toxic teal shadow.',
    category: 'sci-fi',
    keyColors: {
      primary: { l: 0.78, c: 0.16, h: 65 },
      secondary: { l: 0.68, c: 0.12, h: 200 },
      accent: { l: 0.82, c: 0.14, h: 55 },
      destructive: { l: 0.62, c: 0.22, h: 25 },
      background: { l: 0.97, c: 0.02, h: 60 },
    },
    radius: '0.25rem',
    fontFamily: {
      sans: SANS_MANROPE,
      serif: SERIF_STACK,
      mono: MONO_STACK,
    },
  },
  {
    id: 'tron-grid',
    name: 'Tron Grid',
    tagline: 'Electric cyan lines on a midnight lightcycle deck.',
    category: 'sci-fi',
    keyColors: {
      primary: { l: 0.75, c: 0.2, h: 210 },
      secondary: { l: 0.72, c: 0.16, h: 240 },
      accent: { l: 0.82, c: 0.2, h: 195 },
      destructive: { l: 0.62, c: 0.24, h: 25 },
      background: { l: 0.98, c: 0.02, h: 220 },
    },
    radius: '0rem',
    fontFamily: {
      sans: SANS_GEIST,
      serif: SERIF_STACK,
      mono: MONO_STACK,
    },
  },
  {
    id: 'ghost-in-the-shell',
    name: 'Ghost in the Shell',
    tagline: 'Deep magenta net-dive under fluorescent city rain.',
    category: 'sci-fi',
    keyColors: {
      primary: { l: 0.7, c: 0.24, h: 350 },
      secondary: { l: 0.75, c: 0.16, h: 280 },
      accent: { l: 0.72, c: 0.18, h: 190 },
      destructive: { l: 0.62, c: 0.24, h: 25 },
      background: { l: 0.97, c: 0.02, h: 320 },
    },
    radius: '0.375rem',
    fontFamily: {
      sans: SANS_INTER,
      serif: SERIF_STACK,
      mono: MONO_STACK,
    },
  },
  {
    id: 'solarized-dark',
    name: 'Solarized Dark',
    tagline: 'The dev classic — muted olive on desaturated slate.',
    category: 'classic',
    keyColors: {
      primary: { l: 0.7, c: 0.13, h: 210 },
      secondary: { l: 0.72, c: 0.1, h: 60 },
      accent: { l: 0.7, c: 0.14, h: 30 },
      destructive: { l: 0.6, c: 0.19, h: 25 },
      background: { l: 0.96, c: 0.02, h: 90 },
    },
    radius: '0.25rem',
    fontFamily: {
      sans: SANS_INTER,
      serif: SERIF_STACK,
      mono: MONO_STACK,
    },
  },
];
