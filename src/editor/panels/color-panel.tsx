import { useEffect, useRef, useState } from 'react';
import {
  type ColorValue,
  type ProjectDocument,
  SEMANTIC_COLOR_TOKENS,
  type SemanticColorToken,
} from '@/schema';
import type { Theme } from '@/store/project-store';
import { ColorEditor, colorValueToCss } from '../color-editor';
import { PanelSection } from '../panel-section';

interface SwatchProps {
  token: SemanticColorToken;
  value: ColorValue;
  selected: boolean;
  onSelect: () => void;
  onOpenPopover: (rect: DOMRect) => void;
}

function Swatch({ token, value, selected, onSelect, onOpenPopover }: SwatchProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onSelect}
      onDoubleClick={() => {
        const rect = buttonRef.current?.getBoundingClientRect();
        if (rect) onOpenPopover(rect);
      }}
      title="Double-click to open the color picker"
      className={`group flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs transition-colors ${
        selected
          ? 'border-neutral-100 bg-neutral-100/5'
          : 'border-neutral-800 hover:border-neutral-700'
      }`}
    >
      <span
        className="h-4 w-4 shrink-0 rounded border border-neutral-700"
        style={{ background: colorValueToCss(value) }}
      />
      <span className="truncate font-mono text-[11px] text-neutral-300">{token}</span>
    </button>
  );
}

interface PopoverState {
  token: SemanticColorToken;
  rect: DOMRect;
}

interface SwatchPopoverProps {
  state: PopoverState;
  theme: Theme;
  value: ColorValue;
  onClose: () => void;
}

function SwatchPopover({ state, theme, value, onClose }: SwatchPopoverProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (ref.current.contains(e.target as Node)) return;
      onClose();
    };
    window.addEventListener('keydown', onKey);
    // Delay one tick so the double-click that opened this popover doesn't
    // immediately fire the outside-click handler and close it.
    const timeout = setTimeout(() => {
      document.addEventListener('mousedown', onClick);
    }, 0);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
      clearTimeout(timeout);
    };
  }, [onClose]);

  // The colors panel lives in the right sidebar, so open the popover
  // to the LEFT of the swatch. Also clamp so it never overflows the
  // viewport vertically.
  const POPOVER_WIDTH = 280;
  const POPOVER_HEIGHT_ESTIMATE = 340;
  const top = Math.max(8, Math.min(state.rect.top, window.innerHeight - POPOVER_HEIGHT_ESTIMATE));
  const left = Math.max(8, state.rect.left - POPOVER_WIDTH - 12);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={`Edit ${state.token} color`}
      className="fixed z-40 flex w-[280px] flex-col gap-3 rounded-md border border-neutral-700 bg-neutral-900 p-3 shadow-2xl"
      style={{ top, left }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wide text-neutral-500">Color picker</span>
        <button
          type="button"
          onClick={onClose}
          className="text-[11px] text-neutral-500 hover:text-neutral-200"
        >
          close
        </button>
      </div>
      <ColorEditor theme={theme} token={state.token} value={value} />
    </div>
  );
}

interface ColorPanelProps {
  document: ProjectDocument;
}

/**
 * Semantic-color editor.
 *
 * Two interactions per swatch:
 *   - single-click selects the token for the inline editor below the grid
 *   - double-click opens a floating color picker popover next to the swatch,
 *     so users don't have to scroll down to the inline editor
 */
export function ColorPanel({ document }: ColorPanelProps) {
  const [theme, setTheme] = useState<Theme>('light');
  const [selected, setSelected] = useState<SemanticColorToken>('primary');
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const map = document.tokens.colors[theme];

  return (
    <PanelSection
      panelId="colors"
      title="Colors"
      description="Semantic tokens · double-click a swatch to pick"
    >
      <div className="inline-flex gap-1 rounded-md border border-neutral-800 p-1 text-xs">
        {(['light', 'dark'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTheme(t)}
            className={`flex-1 rounded px-2 py-1 transition-colors ${
              theme === t
                ? 'bg-neutral-100 text-neutral-900'
                : 'text-neutral-400 hover:text-neutral-100'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {SEMANTIC_COLOR_TOKENS.map((token) => (
          <Swatch
            key={token}
            token={token}
            value={map[token]}
            selected={selected === token}
            onSelect={() => setSelected(token)}
            onOpenPopover={(rect) => setPopover({ token, rect })}
          />
        ))}
      </div>
      <div className="rounded-md border border-neutral-800 bg-neutral-900/50 p-3">
        <ColorEditor theme={theme} token={selected} value={map[selected]} />
      </div>
      {popover ? (
        <SwatchPopover
          state={popover}
          theme={theme}
          value={map[popover.token]}
          onClose={() => setPopover(null)}
        />
      ) : null}
    </PanelSection>
  );
}
