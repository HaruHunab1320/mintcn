/**
 * Tiny CSS box-shadow parser / serializer.
 *
 * Handles the three shapes the fixture uses (single and multi-layer with
 * rgb()/oklch() colors) plus the common cases users will type: inset
 * keyword, 2-4 length values, color anywhere in the tuple.
 *
 * Round-trip target: parseBoxShadow(s).map(serializeLayer).join(', ') === s
 * for any well-formed CSS box-shadow our fixture or a user would write.
 */

export interface ShadowLayer {
  /** "inset" keyword present. */
  inset: boolean;
  /** Horizontal offset, with unit (e.g. "0", "1px", "-3px"). */
  x: string;
  /** Vertical offset. */
  y: string;
  /** Blur radius. Always emitted; defaults to "0" when missing. */
  blur: string;
  /** Spread radius. Always emitted; defaults to "0" when missing. */
  spread: string;
  /** Color literal (rgb/oklch/hex/named). Empty string when omitted. */
  color: string;
}

/** Default layer used when adding a new entry from the UI. */
export const DEFAULT_LAYER: ShadowLayer = {
  inset: false,
  x: '0',
  y: '1px',
  blur: '2px',
  spread: '0',
  color: 'rgb(0 0 0 / 0.1)',
};

/**
 * Split a CSS value by `,` while respecting nested parentheses, so
 * `rgb(0, 0, 0 / 0.1)` doesn't split into garbage.
 */
function splitTopLevelCommas(input: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === ',' && depth === 0) {
      out.push(input.slice(start, i).trim());
      start = i + 1;
    }
  }
  const tail = input.slice(start).trim();
  if (tail) out.push(tail);
  return out;
}

/** Split by whitespace at top level (parens preserved as one token). */
function tokenizeLayer(input: string): string[] {
  const tokens: string[] = [];
  let depth = 0;
  let buf = '';
  for (const ch of input) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (/\s/.test(ch) && depth === 0) {
      if (buf) {
        tokens.push(buf);
        buf = '';
      }
    } else {
      buf += ch;
    }
  }
  if (buf) tokens.push(buf);
  return tokens;
}

const LENGTH_RE = /^-?\d*\.?\d+(?:px|rem|em|%)?$/;
const COLOR_FN_PREFIX = /^(rgb|rgba|hsl|hsla|oklch|oklab|color|hwb|lab|lch)\(/i;
const HEX_COLOR_RE = /^#[0-9a-f]{3,8}$/i;
// Named colors aren't worth enumerating fully — anything that isn't a length
// or an inset keyword and isn't a function/hex falls through as a color too.
function isLength(token: string): boolean {
  return LENGTH_RE.test(token);
}
function isColor(token: string): boolean {
  return HEX_COLOR_RE.test(token) || COLOR_FN_PREFIX.test(token);
}

/** Parse one shadow tuple into its ShadowLayer form. */
function parseLayer(input: string): ShadowLayer | null {
  const tokens = tokenizeLayer(input);
  if (tokens.length === 0) return null;
  let inset = false;
  const lengths: string[] = [];
  let color = '';
  for (const t of tokens) {
    if (t.toLowerCase() === 'inset') inset = true;
    else if (isLength(t)) lengths.push(t);
    else if (isColor(t)) color = t;
    else {
      // Anything else — bare named color (red, currentColor, etc.) — also goes
      // to color so we don't drop it on round-trip.
      if (!color) color = t;
    }
  }
  if (lengths.length < 2) return null;
  const [x, y, blur = '0', spread = '0'] = lengths;
  return { inset, x, y, blur, spread, color };
}

export function parseBoxShadow(input: string): ShadowLayer[] {
  return splitTopLevelCommas(input)
    .map(parseLayer)
    .filter((layer): layer is ShadowLayer => layer !== null);
}

/** Inverse of parseLayer: a canonical compact serialization. */
export function serializeLayer(layer: ShadowLayer): string {
  const parts: string[] = [];
  if (layer.inset) parts.push('inset');
  parts.push(layer.x, layer.y, layer.blur, layer.spread);
  if (layer.color) parts.push(layer.color);
  return parts.join(' ');
}

export function serializeBoxShadow(layers: ShadowLayer[]): string {
  return layers.map(serializeLayer).join(', ');
}
