import postcss, { type AtRule, type Container, type Declaration, type Rule } from 'postcss';
import {
  type AnimationTokens,
  type ColorMap,
  type ColorValue,
  isSemanticColorToken,
  type SemanticColorToken,
  type StateTokens,
  type TokenState,
} from '../schema';

interface RootBlock {
  vars: Map<string, string>;
}

const DEFAULT_FONT_FAMILIES = {
  sans: 'ui-sans-serif, system-ui, sans-serif',
  serif: 'ui-serif, Georgia, serif',
  mono: 'ui-monospace, SFMono-Regular, monospace',
} as const;

function collectVars(container: Container): Map<string, string> {
  const out = new Map<string, string>();
  container.walkDecls((decl: Declaration) => {
    if (decl.prop.startsWith('--')) {
      out.set(decl.prop.slice(2), decl.value);
    }
  });
  return out;
}

/** Pull a color space hint out of a raw declaration value so emit can preserve it. */
function detectSpace(value: string): 'oklch' | 'hsl' | 'srgb' {
  const v = value.trim().toLowerCase();
  if (v.startsWith('oklch(') || v.startsWith('oklab(')) return 'oklch';
  if (v.startsWith('hsl(') || v.startsWith('hsla(')) return 'hsl';
  return 'srgb';
}

function buildColorMap(vars: Map<string, string>): ColorMap {
  const map = {} as Record<SemanticColorToken, ColorValue>;
  for (const [name, value] of vars) {
    if (!isSemanticColorToken(name)) continue;
    map[name] = { kind: 'literal', space: detectSpace(value), value };
  }
  return map as ColorMap;
}

function walkBaseLayer(root: Container, onRule: (rule: Rule) => void): void {
  root.walkAtRules('layer', (layer: AtRule) => {
    if (layer.params.trim() !== 'base') return;
    layer.walkRules((rule: Rule) => onRule(rule));
  });
}

/** Collect declarations from every `@theme inline { ... }` block. */
function collectThemeInlineVars(root: Container): Map<string, string> {
  const out = new Map<string, string>();
  root.walkAtRules('theme', (theme: AtRule) => {
    if (theme.params.trim() !== 'inline') return;
    for (const [k, v] of collectVars(theme)) out.set(k, v);
  });
  return out;
}

function extractFontFamilies(
  themeVars: Map<string, string>,
): TokenState['typography']['fontFamily'] {
  return {
    sans: themeVars.get('font-sans') ?? DEFAULT_FONT_FAMILIES.sans,
    serif: themeVars.get('font-serif') ?? DEFAULT_FONT_FAMILIES.serif,
    mono: themeVars.get('font-mono') ?? DEFAULT_FONT_FAMILIES.mono,
  };
}

function extractShadows(themeVars: Map<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of themeVars) {
    if (k.startsWith('shadow-')) out[k.slice('shadow-'.length)] = v;
  }
  return out;
}

const STATE_KEYS = [
  'hover-opacity',
  'focus-ring-width',
  'focus-ring-opacity',
  'active-scale',
  'disabled-opacity',
] as const;

const DEFAULT_STATE_TOKENS: StateTokens = {
  hoverOpacity: 0.9,
  focusRingWidth: '3px',
  focusRingOpacity: 0.5,
  activeScale: 0.97,
  disabledOpacity: 0.5,
};

function parseNumber(raw: string | undefined, fallback: number): number {
  if (raw === undefined) return fallback;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Returns undefined when none of the state-token vars were present, so emit
 * round-trips cleanly for vanilla shadcn projects (which don't ship them).
 * Returns a fully-populated object otherwise — missing pieces fall back to
 * the same defaults shadcn-init would produce.
 */
function extractStateTokens(themeVars: Map<string, string>): StateTokens | undefined {
  if (!STATE_KEYS.some((k) => themeVars.has(k))) return undefined;
  return {
    hoverOpacity: parseNumber(themeVars.get('hover-opacity'), DEFAULT_STATE_TOKENS.hoverOpacity),
    focusRingWidth: themeVars.get('focus-ring-width') ?? DEFAULT_STATE_TOKENS.focusRingWidth,
    focusRingOpacity: parseNumber(
      themeVars.get('focus-ring-opacity'),
      DEFAULT_STATE_TOKENS.focusRingOpacity,
    ),
    activeScale: parseNumber(themeVars.get('active-scale'), DEFAULT_STATE_TOKENS.activeScale),
    disabledOpacity: parseNumber(
      themeVars.get('disabled-opacity'),
      DEFAULT_STATE_TOKENS.disabledOpacity,
    ),
  };
}

function extractAnimationTokens(themeVars: Map<string, string>): AnimationTokens | undefined {
  const durations: Record<string, string> = {};
  const easings: Record<string, string> = {};
  for (const [k, v] of themeVars) {
    if (k.startsWith('duration-')) durations[k.slice('duration-'.length)] = v;
    else if (k.startsWith('ease-')) easings[k.slice('ease-'.length)] = v;
  }
  if (Object.keys(durations).length === 0 && Object.keys(easings).length === 0) return undefined;
  return { durations, easings };
}

function extractThemeImports(root: Container): string[] {
  const out: string[] = [];
  root.walkAtRules('import', (atRule: AtRule) => {
    // params is the raw value after @import, e.g. "tailwindcss" or 'tailwindcss'
    const m = atRule.params.trim().match(/^['"]([^'"]+)['"]$/);
    if (m) out.push(m[1]);
  });
  return out;
}

export interface ParsedThemeCss {
  tokens: TokenState;
  themeImports: string[];
}

/**
 * Read the shadcn theme CSS into a TokenState. Two source blocks are walked:
 * `@layer base { :root, .dark }` for the semantic-color and radius tokens,
 * and `@theme inline { ... }` for typography (`--font-sans/serif/mono`) and
 * shadows (`--shadow-*`). Values are preserved verbatim so ingest -> emit
 * reproduces the source byte-for-byte.
 */
export function parseThemeCss(cssText: string): ParsedThemeCss {
  const root = postcss.parse(cssText);

  const light: RootBlock = { vars: new Map() };
  const dark: RootBlock = { vars: new Map() };

  walkBaseLayer(root, (rule) => {
    const selector = rule.selector.trim();
    if (selector === ':root') {
      for (const [k, v] of collectVars(rule)) light.vars.set(k, v);
    } else if (selector === '.dark') {
      for (const [k, v] of collectVars(rule)) dark.vars.set(k, v);
    }
  });

  const radius = light.vars.get('radius');
  if (!radius) {
    throw new Error('parse-theme-css: missing --radius declaration in :root');
  }

  const themeVars = collectThemeInlineVars(root);

  const tokens: TokenState = {
    colors: {
      light: buildColorMap(light.vars),
      dark: buildColorMap(dark.vars),
    },
    radius: { base: radius },
    typography: {
      fontFamily: extractFontFamilies(themeVars),
      scale: [],
    },
    spacing: [],
    shadows: extractShadows(themeVars),
    borders: { width: {} },
    states: extractStateTokens(themeVars),
    animations: extractAnimationTokens(themeVars),
  };

  return { tokens, themeImports: extractThemeImports(root) };
}
