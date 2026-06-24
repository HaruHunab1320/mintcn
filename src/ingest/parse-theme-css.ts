import postcss, { type AtRule, type Container, type Declaration, type Rule } from 'postcss';
import {
  type ColorMap,
  type ColorValue,
  isSemanticColorToken,
  type SemanticColorToken,
  type TokenState,
} from '@/schema';

interface RootBlock {
  vars: Map<string, string>;
}

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

export interface ParsedThemeCss {
  tokens: TokenState;
}

/**
 * Read the shadcn theme CSS — `@layer base { :root { ... } .dark { ... } }` —
 * into a TokenState. Variable values are preserved verbatim so a round-trip
 * (ingest → emit) reproduces the source byte-for-byte.
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

  const tokens: TokenState = {
    colors: {
      light: buildColorMap(light.vars),
      dark: buildColorMap(dark.vars),
    },
    radius: { base: radius },
    typography: {
      fontFamily: {
        sans: 'ui-sans-serif, system-ui, sans-serif',
        serif: 'ui-serif, Georgia, serif',
        mono: 'ui-monospace, SFMono-Regular, monospace',
      },
      scale: [],
    },
    spacing: [],
    shadows: {},
    borders: { width: {} },
  };

  return { tokens };
}
