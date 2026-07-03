import type { CSSProperties } from 'react';
import type { ColorValue, ProjectDocument } from '@/schema';
import { SEMANTIC_COLOR_TOKENS } from '@/schema';

export type TinctureTheme = 'light' | 'dark';

function resolveColorValue(value: ColorValue): string {
  if (value.kind === 'literal') return value.value;
  const basePercent = Math.round((1 - value.mix.amount) * 100);
  return `color-mix(in ${value.mix.space}, var(--${value.from}) ${basePercent}%, ${value.mix.toward})`;
}

/**
 * Materializes every semantic token (colors, radius, states, animations) as
 * inline CSS custom properties. Used by:
 *   - `PreviewRoot` to scope the shadcn preview
 *   - `App.tsx` to hoist the same tokens to the app root so the chrome
 *     (headers, panels, borders) responds to token edits too — i.e. Tincture
 *     itself is a live preview.
 *
 * Emit and preview read the same source of truth, so what you see is what
 * you'll export.
 */
export function tokensToCssVars(doc: ProjectDocument, theme: TinctureTheme): CSSProperties {
  const themeColors = doc.tokens.colors[theme];
  const style: Record<string, string> = { '--radius': doc.tokens.radius.base };
  for (const token of SEMANTIC_COLOR_TOKENS) {
    style[`--${token}`] = resolveColorValue(themeColors[token]);
  }
  const states = doc.tokens.states;
  if (states) {
    style['--hover-opacity'] = String(states.hoverOpacity);
    style['--focus-ring-width'] = states.focusRingWidth;
    style['--focus-ring-opacity'] = String(states.focusRingOpacity);
    style['--active-scale'] = String(states.activeScale);
    style['--disabled-opacity'] = String(states.disabledOpacity);
  }
  const animations = doc.tokens.animations;
  if (animations) {
    for (const [name, value] of Object.entries(animations.durations)) {
      style[`--duration-${name}`] = value;
    }
    for (const [name, value] of Object.entries(animations.easings)) {
      style[`--ease-${name}`] = value;
    }
  }
  return style as CSSProperties;
}
