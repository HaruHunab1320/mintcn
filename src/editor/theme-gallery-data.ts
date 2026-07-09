import { generatePalette, type OklchTriplet } from '@/palette';
import type { ClassDelta, ComponentOverride, StateTokens, TokenState } from '@/schema';

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
  /**
   * "Maximalist" themes push past clean shadcn — circular/oversized buttons,
   * gradients, offset/neon shadows, float animation — via real cva-variant
   * overrides. Flagged so /learn can surface just this subset, while they
   * still slot into their category in the editor gallery.
   */
  maximal?: boolean;
  /** Preferred preview canvas mode — neon looks read best on a dark canvas. */
  preview?: 'light' | 'dark';
  /** Interaction-state token tweaks applied alongside the palette. */
  states?: Partial<StateTokens>;
  /**
   * cva-variant overrides installed on apply (via applyTheme). These only bite
   * component instances rendered with an explicit variant/size prop, and the
   * class strings live in this file so Tailwind generates the arbitrary utils.
   */
  overrides?: ComponentOverride[];
}

/** Components curated themes manage — cleared before a theme installs its own. */
export const MANAGED_OVERRIDE_IDS = ['button', 'badge', 'alert'] as const;

const addUtil = (...utilities: string[]): ClassDelta => ({ addUtilities: utilities });

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
  states?: Partial<StateTokens>;
  overrides?: ComponentOverride[];
  clearOverrideIds: string[];
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
    states: theme.states,
    // Every curated theme clears the managed override set, then installs its
    // own (empty for the clean themes) — so switching themes always resets the
    // component-level look rather than stacking it.
    overrides: theme.overrides ?? [],
    clearOverrideIds: [...MANAGED_OVERRIDE_IDS],
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

  // ─── Maximalist themes ──────────────────────────────────────────────────
  // These push past clean shadcn via real cva-variant overrides (gradients,
  // circular/oversized buttons, float animation) on top of dramatic tokens.
  // Flagged `maximal` so /learn can surface just this set. Override class
  // strings are literal here so Tailwind generates the arbitrary utilities;
  // the `mintcn-float` keyframe is defined in src/index.css.
  {
    id: 'aurora-glass',
    name: 'Aurora Glass',
    tagline: 'Pillowy gradients, big radii, buttons that float.',
    category: 'classic',
    maximal: true,
    preview: 'light',
    keyColors: {
      primary: { l: 0.62, c: 0.19, h: 280 },
      secondary: { l: 0.75, c: 0.16, h: 350 },
      accent: { l: 0.8, c: 0.13, h: 190 },
      destructive: { l: 0.62, c: 0.22, h: 25 },
      background: { l: 0.98, c: 0.012, h: 280 },
    },
    radius: '1.75rem',
    fontFamily: { sans: SANS_INTER, serif: SERIF_STACK, mono: MONO_STACK },
    shadows: {
      sm: '0 4px 12px -2px oklch(0.62 0.19 280 / 0.18)',
      md: '0 10px 30px -6px oklch(0.62 0.19 280 / 0.25)',
      lg: '0 24px 60px -12px oklch(0.62 0.19 280 / 0.3)',
      xl: '0 32px 80px -16px oklch(0.75 0.16 350 / 0.3)',
      '2xl': '0 48px 120px -24px oklch(0.75 0.16 350 / 0.35)',
    },
    states: { activeScale: 0.94 },
    overrides: [
      {
        componentId: 'button',
        variants: {
          variant: {
            default: addUtil(
              'rounded-full',
              'border-0',
              'text-white',
              '[background-image:linear-gradient(135deg,#6d5efc,#e35ac9)]',
              'shadow-[0_12px_32px_-8px_#6d5efc]',
              'animate-[mintcn-float_3s_ease-in-out_infinite]',
              'hover:brightness-110',
            ),
          },
          size: {
            lg: addUtil('h-12', 'px-8', 'text-base', 'rounded-full'),
            icon: addUtil('rounded-full', 'shadow-[0_10px_24px_-6px_#e35ac9]'),
          },
        },
      },
      {
        componentId: 'badge',
        variants: {
          variant: {
            default: addUtil(
              'rounded-full',
              'border-0',
              'text-white',
              'px-3',
              '[background-image:linear-gradient(135deg,#6d5efc,#e35ac9)]',
            ),
          },
        },
      },
      {
        componentId: 'alert',
        variants: {
          variant: {
            default: addUtil('rounded-2xl', 'border-0', 'shadow-[0_16px_40px_-12px_#6d5efc]'),
          },
        },
      },
    ],
  },
  {
    id: 'brutalist-pop',
    name: 'Brutalist Pop',
    tagline: 'Zero radius, black borders, buttons that physically press.',
    category: 'retro',
    maximal: true,
    preview: 'light',
    keyColors: {
      primary: { l: 0.55, c: 0.24, h: 265 },
      secondary: { l: 0.9, c: 0.02, h: 60 },
      accent: { l: 0.88, c: 0.19, h: 95 },
      destructive: { l: 0.6, c: 0.24, h: 25 },
      background: { l: 0.98, c: 0.02, h: 95 },
    },
    radius: '0rem',
    fontFamily: { sans: SANS_SPACE, serif: SERIF_STACK, mono: MONO_STACK },
    shadows: {
      sm: '3px 3px 0 0 #000',
      md: '5px 5px 0 0 #000',
      lg: '8px 8px 0 0 #000',
      xl: '12px 12px 0 0 #000',
      '2xl': '16px 16px 0 0 #000',
    },
    states: { activeScale: 1, hoverOpacity: 1 },
    overrides: [
      {
        componentId: 'button',
        variants: {
          variant: {
            default: addUtil(
              'rounded-none',
              'border-2',
              'border-black',
              'bg-[#3b2cf5]',
              'text-white',
              'font-bold',
              'uppercase',
              'tracking-wide',
              'shadow-[6px_6px_0_0_#000]',
              'transition-all',
              'hover:translate-x-[3px]',
              'hover:translate-y-[3px]',
              'hover:shadow-[3px_3px_0_0_#000]',
              'active:translate-x-[6px]',
              'active:translate-y-[6px]',
              'active:shadow-[0_0_0_0_#000]',
            ),
          },
          size: {
            lg: addUtil('h-12', 'px-8', 'text-base', 'rounded-none'),
            icon: addUtil('rounded-none', 'border-2', 'border-black', 'shadow-[4px_4px_0_0_#000]'),
          },
        },
      },
      {
        componentId: 'badge',
        variants: {
          variant: {
            default: addUtil(
              'rounded-none',
              'border-2',
              'border-black',
              'bg-[#ffd23f]',
              'text-black',
              'font-bold',
              'uppercase',
              'shadow-[3px_3px_0_0_#000]',
            ),
          },
        },
      },
      {
        componentId: 'alert',
        variants: {
          variant: {
            default: addUtil(
              'rounded-none',
              'border-2',
              'border-black',
              'shadow-[6px_6px_0_0_#000]',
            ),
          },
        },
      },
    ],
  },
  {
    id: 'neon-arcade',
    name: 'Neon Arcade',
    tagline: 'Dark glass, magenta→cyan glow, circular arcade buttons.',
    category: 'sci-fi',
    maximal: true,
    preview: 'dark',
    keyColors: {
      primary: { l: 0.68, c: 0.26, h: 330 },
      secondary: { l: 0.72, c: 0.2, h: 195 },
      accent: { l: 0.85, c: 0.22, h: 130 },
      destructive: { l: 0.62, c: 0.24, h: 25 },
      background: { l: 0.98, c: 0.02, h: 300 },
    },
    radius: '1.25rem',
    fontFamily: { sans: SANS_SPACE, serif: SERIF_STACK, mono: MONO_STACK },
    shadows: SHADOW_PRESETS.neonMagenta,
    states: { activeScale: 0.92 },
    overrides: [
      {
        componentId: 'button',
        variants: {
          variant: {
            default: addUtil(
              'rounded-full',
              'border-0',
              'text-black',
              'font-semibold',
              '[background-image:linear-gradient(135deg,#ff2d95,#22d3ee)]',
              'shadow-[0_0_24px_-2px_#ff2d95]',
              'animate-[mintcn-float_3.5s_ease-in-out_infinite]',
              'hover:brightness-125',
            ),
          },
          size: {
            lg: addUtil('h-12', 'px-8', 'text-base', 'rounded-full'),
            icon: addUtil('rounded-full', 'shadow-[0_0_20px_-2px_#22d3ee]'),
          },
        },
      },
      {
        componentId: 'badge',
        variants: {
          variant: {
            default: addUtil(
              'rounded-full',
              'border-0',
              'text-black',
              'font-semibold',
              '[background-image:linear-gradient(135deg,#ff2d95,#22d3ee)]',
            ),
          },
        },
      },
      {
        componentId: 'alert',
        variants: {
          variant: {
            default: addUtil(
              'rounded-2xl',
              'border',
              'border-[#ff2d95]/40',
              'shadow-[0_0_28px_-4px_#ff2d95]',
            ),
          },
        },
      },
    ],
  },
  {
    id: 'terminal-green',
    name: 'Terminal Green',
    tagline: 'Phosphor-green CRT: square, monospaced, glowing outlines.',
    category: 'hacker',
    maximal: true,
    preview: 'dark',
    keyColors: {
      primary: { l: 0.85, c: 0.24, h: 150 },
      secondary: { l: 0.8, c: 0.18, h: 160 },
      accent: { l: 0.88, c: 0.2, h: 130 },
      destructive: { l: 0.62, c: 0.24, h: 25 },
      background: { l: 0.98, c: 0.03, h: 150 },
    },
    radius: '0rem',
    fontFamily: { sans: MONO_STACK, serif: SERIF_STACK, mono: MONO_STACK },
    shadows: {
      sm: '0 0 0 1px oklch(0.85 0.24 150 / 0.4), 0 0 10px oklch(0.85 0.24 150 / 0.35)',
      md: '0 0 0 1px oklch(0.85 0.24 150 / 0.5), 0 0 18px oklch(0.85 0.24 150 / 0.4)',
      lg: '0 0 0 1px oklch(0.85 0.24 150 / 0.6), 0 0 30px oklch(0.85 0.24 150 / 0.45)',
      xl: '0 0 0 1px oklch(0.85 0.24 150 / 0.7), 0 0 44px oklch(0.85 0.24 150 / 0.5)',
      '2xl': '0 0 0 1px oklch(0.85 0.24 150 / 0.8), 0 0 64px oklch(0.85 0.24 150 / 0.55)',
    },
    states: { activeScale: 1 },
    overrides: [
      {
        componentId: 'button',
        variants: {
          variant: {
            default: addUtil(
              'rounded-none',
              'border',
              'border-[#22ff9c]',
              'bg-transparent',
              'text-[#22ff9c]',
              'font-mono',
              'uppercase',
              'tracking-widest',
              'shadow-[0_0_12px_-2px_#22ff9c]',
              'transition-colors',
              'hover:bg-[#22ff9c]/10',
            ),
          },
          size: {
            lg: addUtil('h-12', 'px-8', 'text-base', 'rounded-none'),
            icon: addUtil('rounded-none', 'border', 'border-[#22ff9c]'),
          },
        },
      },
      {
        componentId: 'badge',
        variants: {
          variant: {
            default: addUtil(
              'rounded-none',
              'border',
              'border-[#22ff9c]',
              'bg-transparent',
              'text-[#22ff9c]',
              'font-mono',
              'uppercase',
              'tracking-widest',
            ),
          },
        },
      },
      {
        componentId: 'alert',
        variants: {
          variant: {
            default: addUtil('rounded-none', 'border', 'border-[#22ff9c]/50', 'font-mono'),
          },
        },
      },
    ],
  },
  {
    id: 'vaporwave',
    name: 'Vaporwave',
    tagline: 'Pink/cyan/purple gradients, soft glow, endless float.',
    category: 'retro',
    maximal: true,
    preview: 'dark',
    keyColors: {
      primary: { l: 0.72, c: 0.18, h: 330 },
      secondary: { l: 0.75, c: 0.16, h: 200 },
      accent: { l: 0.7, c: 0.18, h: 290 },
      destructive: { l: 0.62, c: 0.22, h: 25 },
      background: { l: 0.97, c: 0.03, h: 300 },
    },
    radius: '1.5rem',
    fontFamily: { sans: SANS_SPACE, serif: SERIF_STACK, mono: MONO_STACK },
    shadows: {
      sm: '0 6px 16px -4px oklch(0.7 0.18 290 / 0.35)',
      md: '0 12px 30px -6px oklch(0.7 0.18 290 / 0.4)',
      lg: '0 20px 48px -10px oklch(0.72 0.18 330 / 0.45)',
      xl: '0 28px 64px -12px oklch(0.75 0.16 200 / 0.45)',
      '2xl': '0 40px 90px -18px oklch(0.72 0.18 330 / 0.5)',
    },
    states: { activeScale: 0.94 },
    overrides: [
      {
        componentId: 'button',
        variants: {
          variant: {
            default: addUtil(
              'rounded-full',
              'border-0',
              'text-white',
              '[background-image:linear-gradient(135deg,#ff71ce,#01cdfe,#b967ff)]',
              'shadow-[0_10px_30px_-6px_#b967ff]',
              'animate-[mintcn-float_4s_ease-in-out_infinite]',
              'hover:brightness-110',
            ),
          },
          size: {
            lg: addUtil('h-12', 'px-8', 'text-base', 'rounded-full'),
            icon: addUtil('rounded-full', 'shadow-[0_10px_24px_-6px_#01cdfe]'),
          },
        },
      },
      {
        componentId: 'badge',
        variants: {
          variant: {
            default: addUtil(
              'rounded-full',
              'border-0',
              'text-white',
              '[background-image:linear-gradient(135deg,#ff71ce,#01cdfe,#b967ff)]',
            ),
          },
        },
      },
      {
        componentId: 'alert',
        variants: {
          variant: {
            default: addUtil('rounded-2xl', 'border-0', 'shadow-[0_16px_44px_-12px_#b967ff]'),
          },
        },
      },
    ],
  },
  {
    id: 'claymorphism',
    name: 'Claymorphism',
    tagline: 'Soft 3D clay: puffy radii and dual inner/outer shadows.',
    category: 'classic',
    maximal: true,
    preview: 'light',
    keyColors: {
      primary: { l: 0.62, c: 0.16, h: 285 },
      secondary: { l: 0.8, c: 0.06, h: 285 },
      accent: { l: 0.78, c: 0.12, h: 200 },
      destructive: { l: 0.62, c: 0.2, h: 25 },
      background: { l: 0.95, c: 0.01, h: 285 },
    },
    radius: '2rem',
    fontFamily: { sans: SANS_INTER, serif: SERIF_STACK, mono: MONO_STACK },
    shadows: {
      sm: '4px 4px 8px #c8c8d8, -4px -4px 8px #ffffff',
      md: '6px 6px 12px #c8c8d8, -6px -6px 12px #ffffff',
      lg: '10px 10px 20px #c8c8d8, -10px -10px 20px #ffffff',
      xl: '14px 14px 28px #c8c8d8, -14px -14px 28px #ffffff',
      '2xl': '20px 20px 40px #c8c8d8, -20px -20px 40px #ffffff',
    },
    states: { activeScale: 0.96 },
    overrides: [
      {
        componentId: 'button',
        variants: {
          variant: {
            default: addUtil(
              'rounded-[1.5rem]',
              'border-0',
              'bg-[#ebebf5]',
              'text-[#5b5b7a]',
              'font-semibold',
              'shadow-[6px_6px_12px_#c8c8d8,-6px_-6px_12px_#ffffff]',
              'transition-shadow',
              'hover:shadow-[3px_3px_8px_#c8c8d8,-3px_-3px_8px_#ffffff]',
            ),
          },
          size: {
            lg: addUtil('h-12', 'px-8', 'text-base', 'rounded-[1.75rem]'),
            icon: addUtil('rounded-full', 'shadow-[6px_6px_12px_#c8c8d8,-6px_-6px_12px_#ffffff]'),
          },
        },
      },
      {
        componentId: 'badge',
        variants: {
          variant: {
            default: addUtil(
              'rounded-full',
              'border-0',
              'bg-[#ebebf5]',
              'text-[#5b5b7a]',
              'shadow-[3px_3px_6px_#c8c8d8,-3px_-3px_6px_#ffffff]',
            ),
          },
        },
      },
      {
        componentId: 'alert',
        variants: {
          variant: {
            default: addUtil(
              'rounded-[1.5rem]',
              'border-0',
              'shadow-[8px_8px_16px_#c8c8d8,-8px_-8px_16px_#ffffff]',
            ),
          },
        },
      },
    ],
  },
];
