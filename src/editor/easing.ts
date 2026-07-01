/**
 * CSS easing parsers + a curated preset library for the visual bezier editor.
 *
 * Two shapes are recognized:
 *   - Cubic bezier: `cubic-bezier(x1, y1, x2, y2)`
 *   - Keyword: `linear`, `ease`, `ease-in`, `ease-out`, `ease-in-out`,
 *     `step-start`, `step-end`
 *
 * Everything else falls through as an opaque string that the editor still
 * displays but doesn't try to render a curve for.
 */

export interface BezierEasing {
  kind: 'cubic-bezier';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface KeywordEasing {
  kind: 'keyword';
  value: string;
}

export interface UnknownEasing {
  kind: 'unknown';
  raw: string;
}

export type ParsedEasing = BezierEasing | KeywordEasing | UnknownEasing;

const KEYWORD_EASINGS = new Set([
  'linear',
  'ease',
  'ease-in',
  'ease-out',
  'ease-in-out',
  'step-start',
  'step-end',
]);

const BEZIER_RE =
  /^cubic-bezier\(\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*\)$/i;

export function parseEasing(input: string): ParsedEasing {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();

  if (KEYWORD_EASINGS.has(lower)) {
    return { kind: 'keyword', value: lower };
  }

  const m = trimmed.match(BEZIER_RE);
  if (m) {
    const [, x1, y1, x2, y2] = m.map(Number);
    if ([x1, y1, x2, y2].every(Number.isFinite)) {
      return { kind: 'cubic-bezier', x1, y1, x2, y2 };
    }
  }

  return { kind: 'unknown', raw: trimmed };
}

function trimNumber(n: number, digits = 3): string {
  const fixed = n.toFixed(digits);
  return Number.parseFloat(fixed).toString();
}

export function serializeEasing(parsed: ParsedEasing): string {
  switch (parsed.kind) {
    case 'keyword':
      return parsed.value;
    case 'cubic-bezier':
      return `cubic-bezier(${[parsed.x1, parsed.y1, parsed.x2, parsed.y2].map((n) => trimNumber(n)).join(', ')})`;
    case 'unknown':
      return parsed.raw;
  }
}

export interface EasingPreset {
  id: string;
  label: string;
  family: 'CSS' | 'Material' | 'Apple' | 'Utility';
  value: string;
}

/**
 * Curated preset library. CSS keywords are always available; Material and
 * Apple curves capture the "feels good" defaults from those design systems;
 * utility curves handle overshoot / anticipate cases.
 */
export const EASING_PRESETS: EasingPreset[] = [
  { id: 'linear', label: 'Linear', family: 'CSS', value: 'linear' },
  { id: 'ease', label: 'Ease', family: 'CSS', value: 'ease' },
  { id: 'ease-in', label: 'Ease in', family: 'CSS', value: 'ease-in' },
  { id: 'ease-out', label: 'Ease out', family: 'CSS', value: 'ease-out' },
  { id: 'ease-in-out', label: 'Ease in-out', family: 'CSS', value: 'ease-in-out' },
  {
    id: 'material-standard',
    label: 'Standard',
    family: 'Material',
    value: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  {
    id: 'material-decelerate',
    label: 'Decelerate',
    family: 'Material',
    value: 'cubic-bezier(0, 0, 0.2, 1)',
  },
  {
    id: 'material-accelerate',
    label: 'Accelerate',
    family: 'Material',
    value: 'cubic-bezier(0.4, 0, 1, 1)',
  },
  {
    id: 'material-sharp',
    label: 'Sharp',
    family: 'Material',
    value: 'cubic-bezier(0.4, 0, 0.6, 1)',
  },
  {
    id: 'apple-default',
    label: 'Apple default',
    family: 'Apple',
    value: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  },
  {
    id: 'apple-ease-out',
    label: 'Apple ease-out',
    family: 'Apple',
    value: 'cubic-bezier(0.16, 1, 0.3, 1)',
  },
  {
    id: 'anticipate',
    label: 'Anticipate',
    family: 'Utility',
    value: 'cubic-bezier(0.7, -0.4, 0.4, 1)',
  },
  {
    id: 'overshoot',
    label: 'Overshoot',
    family: 'Utility',
    value: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
];

/** Find a preset whose value serializes identically. Used to show a match badge. */
export function matchPreset(input: string): EasingPreset | null {
  const target = serializeEasing(parseEasing(input));
  return EASING_PRESETS.find((p) => p.value === target) ?? null;
}
