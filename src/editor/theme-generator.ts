import { generatePalette, type OklchTriplet, type PaletteStrategy } from '@/palette';
import type { ComponentOverride, StateTokens, TokenState } from '@/schema';
import { MANAGED_OVERRIDE_IDS } from './theme-gallery-data';

/**
 * "Roll the dice" full-theme generator. Composes a random palette with a random
 * *style family* — shape, fill, elevation, motion, font, and interaction state —
 * into the exact bundle the store's applyTheme consumes. It's the maximalist
 * vocabulary from the curated themes, made procedural: every roll is a coherent
 * (if wild) UI, and it all live-previews + lands in the diff.
 *
 * Hard constraint: Tailwind only emits utilities it can scan, so every override
 * class string below is a LITERAL in this file. The generator only ever *picks*
 * from these literals (never string-builds a novel utility), so whatever it
 * rolls is guaranteed to have real CSS. Palette, radius, shadow, and state
 * *values* aren't classes, so those stay fully dynamic.
 */

export interface GeneratedTheme {
  name: string;
  preview: 'light' | 'dark';
  spec: {
    colors: TokenState['colors'];
    radius: string;
    fontFamily: TokenState['typography']['fontFamily'];
    shadows: TokenState['shadows'];
    states: Partial<StateTokens>;
    overrides: ComponentOverride[];
    clearOverrideIds: string[];
  };
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)];
const round2 = (n: number) => Math.round(n * 100) / 100;

const FONT_MONO = '"JetBrains Mono", "Fira Code", ui-monospace, monospace';
const FONT_SERIF = '"Instrument Serif", Georgia, serif';
const SANS = [
  '"Inter", ui-sans-serif, system-ui, sans-serif',
  '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
  '"Geist", ui-sans-serif, system-ui, sans-serif',
] as const;

// --- Dynamic shadow-scale builders (values, not classes → free to compute) ---
function neonScale(hue: number): TokenState['shadows'] {
  const g = (blur: number, a: number) =>
    `0 0 0 1px oklch(0.7 0.26 ${hue} / ${a}), 0 0 ${blur}px oklch(0.7 0.26 ${hue} / ${a})`;
  return { sm: g(12, 0.5), md: g(24, 0.55), lg: g(40, 0.6), xl: g(56, 0.65), '2xl': g(80, 0.7) };
}
function softScale(hue: number): TokenState['shadows'] {
  const g = (y: number, blur: number, a: number) =>
    `0 ${y}px ${blur}px -${Math.round(blur / 3)}px oklch(0.55 0.14 ${hue} / ${a})`;
  return {
    sm: g(4, 12, 0.18),
    md: g(10, 30, 0.25),
    lg: g(24, 60, 0.3),
    xl: g(32, 80, 0.32),
    '2xl': g(48, 120, 0.35),
  };
}
const OFFSET_SCALE: TokenState['shadows'] = {
  sm: '3px 3px 0 0 #000',
  md: '5px 5px 0 0 #000',
  lg: '8px 8px 0 0 #000',
  xl: '12px 12px 0 0 #000',
  '2xl': '16px 16px 0 0 #000',
};
const CLAY_SCALE: TokenState['shadows'] = {
  sm: '4px 4px 8px #c8c8d8, -4px -4px 8px #ffffff',
  md: '6px 6px 12px #c8c8d8, -6px -6px 12px #ffffff',
  lg: '10px 10px 20px #c8c8d8, -10px -10px 20px #ffffff',
  xl: '14px 14px 28px #c8c8d8, -14px -14px 28px #ffffff',
  '2xl': '20px 20px 40px #c8c8d8, -20px -20px 40px #ffffff',
};
const CRISP_SCALE: TokenState['shadows'] = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 2px 4px -1px rgb(0 0 0 / 0.06)',
  lg: '0 6px 10px -2px rgb(0 0 0 / 0.08)',
  xl: '0 12px 18px -4px rgb(0 0 0 / 0.1)',
  '2xl': '0 20px 32px -8px rgb(0 0 0 / 0.12)',
};

// --- Literal override-trait pools (Tailwind scans these) ---------------------
const SHAPE = {
  sharp: { radius: '0rem', btn: 'rounded-none', badge: 'rounded-none', icon: 'rounded-none' },
  soft: { radius: '0.5rem', btn: 'rounded-lg', badge: 'rounded-md', icon: 'rounded-lg' },
  round: { radius: '1rem', btn: 'rounded-2xl', badge: 'rounded-xl', icon: 'rounded-2xl' },
  pill: { radius: '1.75rem', btn: 'rounded-full', badge: 'rounded-full', icon: 'rounded-full' },
} as const;

const FILL = {
  solid: [] as string[],
  gradientPrimaryAccent: [
    'border-0',
    'text-primary-foreground',
    '[background-image:linear-gradient(135deg,var(--primary),var(--accent))]',
  ],
  gradientPrimarySecondary: [
    'border-0',
    'text-primary-foreground',
    '[background-image:linear-gradient(120deg,var(--primary),var(--secondary))]',
  ],
  outline: ['bg-transparent', 'border-2', 'border-primary', 'text-primary'],
} as const;

const ELEVATION = {
  none: [] as string[],
  glow: ['shadow-[0_0_24px_-2px_var(--primary)]'],
  drop: ['shadow-[0_12px_32px_-8px_var(--primary)]'],
  offset: ['border-2', 'border-black', 'shadow-[6px_6px_0_0_#000]'],
} as const;

const MOTION = {
  none: [] as string[],
  float: ['animate-[mintcn-float_3.5s_ease-in-out_infinite]'],
  press: ['transition-transform', 'active:scale-95'],
  lift: ['transition-transform', 'hover:-translate-y-0.5'],
} as const;

const EMPHASIS = {
  none: [] as string[],
  bold: ['font-bold', 'uppercase', 'tracking-wide'],
  mono: ['font-mono', 'uppercase', 'tracking-widest'],
} as const;

type Shape = keyof typeof SHAPE;
type Fill = keyof typeof FILL;
type Elevation = keyof typeof ELEVATION;
type Motion = keyof typeof MOTION;
type Emphasis = keyof typeof EMPHASIS;

interface Traits {
  shape: Shape;
  fill: Fill;
  elevation: Elevation;
  motion: Motion;
  emphasis: Emphasis;
}

function buildOverrides(t: Traits): ComponentOverride[] {
  const s = SHAPE[t.shape];
  const btn = [
    s.btn,
    ...FILL[t.fill],
    ...ELEVATION[t.elevation],
    ...MOTION[t.motion],
    ...EMPHASIS[t.emphasis],
  ];
  // Badges echo the shape + fill but skip motion/elevation so they stay legible.
  const badge = [s.badge, ...FILL[t.fill], ...EMPHASIS[t.emphasis]];
  const alert = [t.shape === 'sharp' ? 'rounded-none' : 'rounded-2xl', ...ELEVATION[t.elevation]];
  return [
    {
      componentId: 'button',
      variants: {
        variant: { default: { addUtilities: btn } },
        size: {
          lg: { addUtilities: [s.btn, 'h-12', 'px-8', 'text-base'] },
          icon: { addUtilities: [s.icon, ...ELEVATION[t.elevation]] },
        },
      },
    },
    { componentId: 'badge', variants: { variant: { default: { addUtilities: badge } } } },
    { componentId: 'alert', variants: { variant: { default: { addUtilities: alert } } } },
  ];
}

// --- Style families: coherent constraint sets the dice rolls within ----------
interface Family {
  id: string;
  preview: 'light' | 'dark';
  strategy: PaletteStrategy;
  /** Locked primary L/C; hue is randomized per roll for variety. */
  primaryLC: { l: number; c: number };
  radius: () => string;
  shadows: (hue: number) => TokenState['shadows'];
  font: () => TokenState['typography']['fontFamily'];
  states: () => Partial<StateTokens>;
  traits: () => Traits;
}

const monoFonts = () => ({ sans: FONT_MONO, serif: FONT_SERIF, mono: FONT_MONO });
const sansFonts = () => ({ sans: pick(SANS), serif: FONT_SERIF, mono: FONT_MONO });

const FAMILIES: Family[] = [
  {
    id: 'glass',
    preview: 'light',
    strategy: 'analogous',
    primaryLC: { l: 0.62, c: 0.19 },
    radius: () => pick(['1.5rem', '1.75rem', '2rem']),
    shadows: (h) => softScale(h),
    font: sansFonts,
    states: () => ({ activeScale: round2(rand(0.92, 0.96)) }),
    traits: () => ({
      shape: pick(['round', 'pill']),
      fill: pick(['gradientPrimaryAccent', 'gradientPrimarySecondary']),
      elevation: 'drop',
      motion: pick(['float', 'lift']),
      emphasis: 'none',
    }),
  },
  {
    id: 'neon',
    preview: 'dark',
    strategy: 'complementary',
    primaryLC: { l: 0.68, c: 0.26 },
    radius: () => pick(['0.75rem', '1.25rem', '9999px']),
    shadows: (h) => neonScale(h),
    font: () => ({ sans: pick(SANS), serif: FONT_SERIF, mono: FONT_MONO }),
    states: () => ({ activeScale: round2(rand(0.9, 0.94)) }),
    traits: () => ({
      shape: 'pill',
      fill: pick(['gradientPrimaryAccent', 'gradientPrimarySecondary']),
      elevation: 'glow',
      motion: pick(['float', 'none']),
      emphasis: 'none',
    }),
  },
  {
    id: 'brutal',
    preview: 'light',
    strategy: 'triadic',
    primaryLC: { l: 0.55, c: 0.24 },
    radius: () => '0rem',
    shadows: () => OFFSET_SCALE,
    font: () => ({ sans: pick(SANS), serif: FONT_SERIF, mono: FONT_MONO }),
    states: () => ({ activeScale: 1, hoverOpacity: 1 }),
    traits: () => ({
      shape: 'sharp',
      fill: 'solid',
      elevation: 'offset',
      motion: 'press',
      emphasis: 'bold',
    }),
  },
  {
    id: 'clay',
    preview: 'light',
    strategy: 'monochromatic',
    primaryLC: { l: 0.62, c: 0.14 },
    radius: () => pick(['1.5rem', '2rem']),
    shadows: () => CLAY_SCALE,
    font: sansFonts,
    states: () => ({ activeScale: round2(rand(0.94, 0.97)) }),
    traits: () => ({
      shape: 'round',
      fill: 'solid',
      elevation: 'drop',
      motion: pick(['lift', 'none']),
      emphasis: 'none',
    }),
  },
  {
    id: 'terminal',
    preview: 'dark',
    strategy: 'monochromatic',
    primaryLC: { l: 0.85, c: 0.24 },
    radius: () => '0rem',
    shadows: (h) => neonScale(h),
    font: monoFonts,
    states: () => ({ activeScale: 1 }),
    traits: () => ({
      shape: 'sharp',
      fill: 'outline',
      elevation: 'glow',
      motion: 'none',
      emphasis: 'mono',
    }),
  },
  {
    id: 'minimal',
    preview: 'light',
    strategy: 'analogous',
    primaryLC: { l: 0.5, c: 0.1 },
    radius: () => pick(['0.25rem', '0.5rem', '0.75rem']),
    shadows: () => CRISP_SCALE,
    font: sansFonts,
    states: () => ({ activeScale: round2(rand(0.96, 0.99)) }),
    traits: () => ({
      shape: 'soft',
      fill: pick(['solid', 'outline']),
      elevation: pick(['none', 'drop']),
      motion: 'press',
      emphasis: 'none',
    }),
  },
];

const ADJECTIVES = [
  'Molten',
  'Glacial',
  'Voltaic',
  'Velvet',
  'Chrome',
  'Sunken',
  'Radiant',
  'Feral',
  'Lucid',
  'Obsidian',
  'Saccharine',
  'Static',
];
const NOUNS = [
  'Bloom',
  'Circuit',
  'Mirage',
  'Riot',
  'Drift',
  'Halo',
  'Pulse',
  'Relic',
  'Fizz',
  'Grid',
];

/** Roll a complete random theme. Call on every dice click for a fresh one. */
export function generateTheme(): GeneratedTheme {
  const family = pick(FAMILIES);
  const hue = Math.round(rand(0, 360));
  const primary: OklchTriplet = { l: family.primaryLC.l, c: family.primaryLC.c, h: hue };
  const { light, dark } = generatePalette({ strategy: family.strategy, locks: { primary } });

  return {
    name: `${pick(ADJECTIVES)} ${pick(NOUNS)}`,
    preview: family.preview,
    spec: {
      colors: { light, dark },
      radius: family.radius(),
      fontFamily: family.font(),
      shadows: family.shadows(hue),
      states: family.states(),
      overrides: buildOverrides(family.traits()),
      clearOverrideIds: [...MANAGED_OVERRIDE_IDS],
    },
  };
}
