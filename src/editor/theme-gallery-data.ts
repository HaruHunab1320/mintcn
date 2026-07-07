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
  /**
   * Optional shadow scale that overrides `--shadow-{sm,md,lg,xl,2xl}` on
   * apply. Themes lean on this heavily to feel distinct — sharp
   * one-pixel dev shadows vs soft dreamy glows vs razor neon.
   */
  shadows?: TokenState['shadows'];
}

// Neon glow shadow scale parameterized by hue. Higher chroma at l≈0.6 stays
// vivid across both light and dark presentations.
function neonAt(hue: number, chroma = 0.24): TokenState['shadows'] {
  return {
    sm: `0 0 0 1px oklch(0.6 ${chroma} ${hue} / 0.4), 0 0 12px oklch(0.6 ${chroma} ${hue} / 0.3)`,
    md: `0 0 0 1px oklch(0.6 ${chroma} ${hue} / 0.5), 0 0 24px oklch(0.6 ${chroma} ${hue} / 0.4)`,
    lg: `0 0 0 1px oklch(0.6 ${chroma} ${hue} / 0.6), 0 0 40px oklch(0.6 ${chroma} ${hue} / 0.5)`,
    xl: `0 0 0 1px oklch(0.6 ${chroma} ${hue} / 0.7), 0 0 56px oklch(0.6 ${chroma} ${hue} / 0.6)`,
    '2xl': `0 0 0 1px oklch(0.6 ${chroma} ${hue} / 0.8), 0 0 80px oklch(0.6 ${chroma} ${hue} / 0.7)`,
  };
}

// Preset shadow scales expressed as a `--shadow-{name}` map that
// tokensToCssVars will materialize. Each preset is designed to feel
// dramatically different from the shadcn defaults.
const SHADOW_PRESETS = {
  // Blade-runner soft glow: big low-opacity haze under every surface.
  soft: {
    sm: '0 2px 8px 0 rgb(0 0 0 / 0.06)',
    md: '0 8px 24px -4px rgb(0 0 0 / 0.10), 0 4px 8px -2px rgb(0 0 0 / 0.08)',
    lg: '0 24px 48px -12px rgb(0 0 0 / 0.16)',
    xl: '0 32px 64px -16px rgb(0 0 0 / 0.24)',
    '2xl': '0 48px 96px -24px rgb(0 0 0 / 0.32)',
  },
  // Terminal / CRT vibe: flat, no elevation, one crisp inset border.
  none: {
    sm: '0 0 0 1px rgb(255 255 255 / 0.06)',
    md: '0 0 0 1px rgb(255 255 255 / 0.08)',
    lg: '0 0 0 1px rgb(255 255 255 / 0.10)',
    xl: '0 0 0 1px rgb(255 255 255 / 0.12)',
    '2xl': '0 0 0 1px rgb(255 255 255 / 0.14)',
  },
  // Cyberpunk / synthwave: colored neon glow around cards.
  neonMagenta: neonAt(330),
  neonCyan: neonAt(200),
  neonGreen: neonAt(145),
  neonAmber: neonAt(70),
  // Brutalist: hard offset shadows, no blur, feels like poster print.
  brutal: {
    sm: '2px 2px 0 0 rgb(0 0 0 / 1)',
    md: '4px 4px 0 0 rgb(0 0 0 / 1)',
    lg: '6px 6px 0 0 rgb(0 0 0 / 1)',
    xl: '8px 8px 0 0 rgb(0 0 0 / 1)',
    '2xl': '12px 12px 0 0 rgb(0 0 0 / 1)',
  },
  // Sharp dev tools: thin crisp shadow, like a modern code editor.
  crisp: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 2px 4px -1px rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
    lg: '0 6px 10px -2px rgb(0 0 0 / 0.08), 0 2px 4px -1px rgb(0 0 0 / 0.04)',
    xl: '0 12px 18px -4px rgb(0 0 0 / 0.10), 0 4px 6px -2px rgb(0 0 0 / 0.05)',
    '2xl': '0 20px 32px -8px rgb(0 0 0 / 0.12)',
  },
} satisfies Record<string, TokenState['shadows']>;

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
  shadows?: TokenState['shadows'];
} {
  const { light, dark } = generatePalette({
    strategy: 'monochromatic',
    locks: theme.keyColors,
  });
  return {
    colors: { light, dark },
    radius: theme.radius,
    fontFamily: theme.fontFamily,
    shadows: theme.shadows,
  };
}

const MONO_STACK = '"JetBrains Mono", "Fira Code", ui-monospace, monospace';
const SERIF_STACK = '"Instrument Serif", Georgia, serif';
const SANS_INTER = '"Inter", ui-sans-serif, system-ui, sans-serif';
const SANS_GEIST = '"Geist", ui-sans-serif, system-ui, sans-serif';
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
    // Razor-thin corners + magenta neon glow around every card.
    radius: '0.125rem',
    fontFamily: {
      sans: SANS_SPACE,
      serif: SERIF_STACK,
      mono: MONO_STACK,
    },
    shadows: SHADOW_PRESETS.neonMagenta,
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
    // Zero-radius, all mono, flat shadows: full CRT authenticity.
    radius: '0rem',
    fontFamily: {
      sans: MONO_STACK,
      serif: MONO_STACK,
      mono: MONO_STACK,
    },
    shadows: SHADOW_PRESETS.none,
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
    // Rectangles + mono, but the shadow is an amber halo — the phosphor.
    radius: '0rem',
    fontFamily: {
      sans: MONO_STACK,
      serif: MONO_STACK,
      mono: MONO_STACK,
    },
    shadows: SHADOW_PRESETS.neonAmber,
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
    // Pillowy: fat radius + soft dreamy haze under every surface.
    radius: '1.25rem',
    fontFamily: {
      sans: SANS_SPACE,
      serif: SERIF_STACK,
      mono: MONO_STACK,
    },
    shadows: SHADOW_PRESETS.soft,
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
    // Filmic serif everywhere + big soft glows: sit-still-and-look-at-it feel.
    radius: '0.5rem',
    fontFamily: {
      sans: SERIF_STACK,
      serif: SERIF_STACK,
      mono: MONO_STACK,
    },
    shadows: SHADOW_PRESETS.soft,
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
    // Zero radius, geometric Geist, cyan neon everywhere.
    radius: '0rem',
    fontFamily: {
      sans: SANS_GEIST,
      serif: SERIF_STACK,
      mono: MONO_STACK,
    },
    shadows: SHADOW_PRESETS.neonCyan,
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
    // Balanced round + crisp shadows: cyberpunk-adjacent but grown-up.
    radius: '0.75rem',
    fontFamily: {
      sans: SANS_INTER,
      serif: SERIF_STACK,
      mono: MONO_STACK,
    },
    shadows: SHADOW_PRESETS.crisp,
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
    // Modest, code-editor-tight: crisp elevation + moderate radius + Inter.
    radius: '0.25rem',
    fontFamily: {
      sans: SANS_INTER,
      serif: SERIF_STACK,
      mono: MONO_STACK,
    },
    shadows: SHADOW_PRESETS.crisp,
  },
  {
    id: 'brutal-editorial',
    name: 'Brutal Editorial',
    tagline: 'Poster-print edges, zero apologies, hard offset shadows.',
    category: 'classic',
    keyColors: {
      primary: { l: 0.15, c: 0.02, h: 60 },
      secondary: { l: 0.85, c: 0.15, h: 60 },
      accent: { l: 0.7, c: 0.22, h: 25 },
      destructive: { l: 0.55, c: 0.24, h: 25 },
      background: { l: 0.98, c: 0.01, h: 60 },
    },
    // Hard corners, big serif display font, offset shadows like risograph print.
    radius: '0rem',
    fontFamily: {
      sans: SERIF_STACK,
      serif: SERIF_STACK,
      mono: MONO_STACK,
    },
    shadows: SHADOW_PRESETS.brutal,
  },
];
