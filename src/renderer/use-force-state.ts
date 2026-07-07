import { useEffect, useState } from 'react';

export type ForceState = 'off' | 'hover' | 'focus-visible' | 'active' | 'disabled';

const STYLE_ELEMENT_ID = 'mintcn-force-state-styles';

/**
 * Force-state preview stylesheet.
 *
 * Why a hand-authored sheet instead of walking Tailwind's CSSOM: Tailwind v4
 * emits hover/focus utilities as nested `&:hover { @media (hover: hover) {
 * ... } }`, so the outer selector has no declarations to copy and the inner
 * rule has the wrong selector context. Flattening that perfectly is fragile.
 *
 * The targeted approach below uses shadcn's data-slot/data-variant attributes
 * — which every fixture component sets — and the state tokens from M6a
 * (--hover-opacity, --focus-ring-*, --active-scale, --disabled-opacity), so
 * when the M6c panel edits a state token, force-preview reflects it live.
 *
 * Coverage is intentionally focused: button variants, badges, inputs/textarea,
 * card, checkbox/switch trigger, select trigger. The state tokens drive the
 * actual values so edits in the panel propagate visually.
 */
const FORCE_STATE_CSS = `
.mintcn-preview[data-force-state="hover"] [data-slot="button"][data-variant="default"],
.mintcn-preview[data-force-state="hover"] [data-slot="badge"][data-variant="default"] {
  background-color: color-mix(in oklab, var(--primary), transparent calc((1 - var(--hover-opacity, 0.9)) * 100%));
}
.mintcn-preview[data-force-state="hover"] [data-slot="button"][data-variant="destructive"],
.mintcn-preview[data-force-state="hover"] [data-slot="badge"][data-variant="destructive"] {
  background-color: color-mix(in oklab, var(--destructive), transparent calc((1 - var(--hover-opacity, 0.9)) * 100%));
}
.mintcn-preview[data-force-state="hover"] [data-slot="button"][data-variant="secondary"],
.mintcn-preview[data-force-state="hover"] [data-slot="badge"][data-variant="secondary"] {
  background-color: color-mix(in oklab, var(--secondary), transparent calc((1 - var(--hover-opacity, 0.9)) * 100%));
}
.mintcn-preview[data-force-state="hover"] [data-slot="button"][data-variant="outline"],
.mintcn-preview[data-force-state="hover"] [data-slot="button"][data-variant="ghost"] {
  background-color: var(--accent);
  color: var(--accent-foreground);
}
.mintcn-preview[data-force-state="hover"] [data-slot="button"][data-variant="link"] {
  text-decoration: underline;
}

.mintcn-preview[data-force-state="focus-visible"] [data-slot="button"],
.mintcn-preview[data-force-state="focus-visible"] [data-slot="input"],
.mintcn-preview[data-force-state="focus-visible"] [data-slot="textarea"],
.mintcn-preview[data-force-state="focus-visible"] [data-slot="select-trigger"] {
  outline: none;
  border-color: var(--ring);
  box-shadow: 0 0 0 var(--focus-ring-width, 3px) color-mix(in oklch, var(--ring), transparent calc((1 - var(--focus-ring-opacity, 0.5)) * 100%));
}

.mintcn-preview[data-force-state="active"] [data-slot="button"] {
  transform: scale(var(--active-scale, 0.97));
}

.mintcn-preview[data-force-state="disabled"] [data-slot="button"],
.mintcn-preview[data-force-state="disabled"] [data-slot="badge"],
.mintcn-preview[data-force-state="disabled"] [data-slot="input"],
.mintcn-preview[data-force-state="disabled"] [data-slot="textarea"],
.mintcn-preview[data-force-state="disabled"] [data-slot="select-trigger"],
.mintcn-preview[data-force-state="disabled"] [data-slot="checkbox"],
.mintcn-preview[data-force-state="disabled"] [data-slot="switch"] {
  opacity: var(--disabled-opacity, 0.5);
  pointer-events: none;
}
`;

function ensureStyleEl(): HTMLStyleElement {
  let el = document.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = STYLE_ELEMENT_ID;
    el.textContent = FORCE_STATE_CSS;
    document.head.appendChild(el);
  }
  return el;
}

/**
 * Returns [activeState, setState]. The stylesheet is injected once; toggling
 * the state just flips the data-force-state attribute on PreviewRoot.
 */
export function useForceState(): [ForceState, (next: ForceState) => void] {
  const [state, setState] = useState<ForceState>('off');

  useEffect(() => {
    ensureStyleEl();
  }, []);

  return [state, setState];
}
