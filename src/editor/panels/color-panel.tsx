import { useState } from 'react';
import {
  type ColorValue,
  type ProjectDocument,
  SEMANTIC_COLOR_TOKENS,
  type SemanticColorToken,
} from '@/schema';
import { type Theme, useProjectStore } from '@/store/project-store';
import { clampOklch, formatOklch, type OklchValue, parseOklch } from '../oklch';
import { PanelSection } from '../panel-section';

function colorToCss(value: ColorValue): string {
  if (value.kind === 'literal') return value.value;
  const basePercent = Math.round((1 - value.mix.amount) * 100);
  return `color-mix(in ${value.mix.space}, var(--${value.from}) ${basePercent}%, ${value.mix.toward})`;
}

interface SwatchProps {
  token: SemanticColorToken;
  value: ColorValue;
  selected: boolean;
  onSelect: () => void;
}

function Swatch({ token, value, selected, onSelect }: SwatchProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs transition-colors ${
        selected
          ? 'border-neutral-100 bg-neutral-100/5'
          : 'border-neutral-800 hover:border-neutral-700'
      }`}
    >
      <span
        className="h-4 w-4 shrink-0 rounded border border-neutral-700"
        style={{ background: colorToCss(value) }}
      />
      <span className="truncate font-mono text-[11px] text-neutral-300">{token}</span>
    </button>
  );
}

interface SliderRowProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (next: number) => void;
  hint?: string;
}

function SliderRow({ label, min, max, step, value, onChange, hint }: SliderRowProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between font-mono text-[11px]">
        <span className="text-neutral-400">{label}</span>
        <span className="text-neutral-500">{hint}</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number.parseFloat(e.target.value))}
          className="flex-1 accent-neutral-200"
        />
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => {
            const n = Number.parseFloat(e.target.value);
            if (Number.isFinite(n)) onChange(n);
          }}
          className="w-16 rounded border border-neutral-800 bg-neutral-950 px-1.5 py-0.5 font-mono text-[11px] text-neutral-100 outline-none focus:border-neutral-600"
        />
      </div>
    </div>
  );
}

interface EditorProps {
  theme: Theme;
  token: SemanticColorToken;
  value: ColorValue;
}

function ColorEditor({ theme, token, value }: EditorProps) {
  const setTokenColor = useProjectStore((s) => s.setTokenColor);
  const literal = value.kind === 'literal' ? value.value : colorToCss(value);
  const oklch = parseOklch(literal);

  const writeOklch = (next: OklchValue) => {
    const clamped = clampOklch(next);
    setTokenColor(theme, token, {
      kind: 'literal',
      space: 'oklch',
      value: formatOklch(clamped),
    });
  };

  const writeRaw = (raw: string) => {
    const next = raw.trim();
    if (!next) return;
    const space: 'oklch' | 'hsl' | 'srgb' = next.startsWith('oklch')
      ? 'oklch'
      : next.startsWith('hsl')
        ? 'hsl'
        : 'srgb';
    setTokenColor(theme, token, { kind: 'literal', space, value: next });
  };

  return (
    <div className="flex flex-col gap-3 rounded-md border border-neutral-800 bg-neutral-900/50 p-3">
      <div className="flex items-center gap-2">
        <span
          className="h-8 w-8 shrink-0 rounded border border-neutral-700"
          style={{ background: literal }}
        />
        <div className="flex flex-col">
          <span className="font-mono text-xs text-neutral-300">--{token}</span>
          <span className="text-[11px] text-neutral-500">{theme}</span>
        </div>
      </div>

      {oklch ? (
        <div className="flex flex-col gap-2">
          <SliderRow
            label="L"
            min={0}
            max={1}
            step={0.001}
            value={oklch.l}
            hint="lightness"
            onChange={(l) => writeOklch({ ...oklch, l })}
          />
          <SliderRow
            label="C"
            min={0}
            max={0.4}
            step={0.001}
            value={oklch.c}
            hint="chroma"
            onChange={(c) => writeOklch({ ...oklch, c })}
          />
          <SliderRow
            label="H"
            min={0}
            max={360}
            step={1}
            value={oklch.h}
            hint="hue °"
            onChange={(h) => writeOklch({ ...oklch, h })}
          />
        </div>
      ) : (
        <p className="text-[11px] text-neutral-500">
          Sliders show up for <span className="font-mono">oklch(...)</span> values. The text input
          below accepts any CSS color.
        </p>
      )}

      <input
        type="text"
        value={literal}
        onChange={(e) => writeRaw(e.target.value)}
        className="w-full rounded border border-neutral-800 bg-neutral-950 px-2 py-1 font-mono text-[11px] text-neutral-100 outline-none focus:border-neutral-600"
      />

      {value.kind === 'derived' ? (
        <p className="text-[11px] text-neutral-500">
          Derived from <span className="font-mono">--{value.from}</span> · editing will switch to a
          literal.
        </p>
      ) : null}
    </div>
  );
}

interface ColorPanelProps {
  document: ProjectDocument;
}

/**
 * Semantic-color editor. Switch theme tab to edit the light or dark map;
 * every grid swatch shows the current value, click one to open an editor
 * that writes back through setTokenColor. For oklch values the editor
 * exposes L/C/H sliders; any value can still be typed directly.
 */
export function ColorPanel({ document }: ColorPanelProps) {
  const [theme, setTheme] = useState<Theme>('light');
  const [selected, setSelected] = useState<SemanticColorToken>('primary');
  const map = document.tokens.colors[theme];

  return (
    <PanelSection panelId="colors" title="Colors" description="Semantic tokens · click to edit">
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
          />
        ))}
      </div>
      <ColorEditor theme={theme} token={selected} value={map[selected]} />
    </PanelSection>
  );
}
