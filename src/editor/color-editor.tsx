import type { ColorValue, SemanticColorToken } from '@/schema';
import { type Theme, useProjectStore } from '@/store/project-store';
import { clampOklch, formatOklch, type OklchValue, parseOklch } from './oklch';

export function colorValueToCss(value: ColorValue): string {
  if (value.kind === 'literal') return value.value;
  const basePercent = Math.round((1 - value.mix.amount) * 100);
  return `color-mix(in ${value.mix.space}, var(--${value.from}) ${basePercent}%, ${value.mix.toward})`;
}

interface SliderRowProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  hint?: string;
  onChange: (next: number) => void;
}

function SliderRow({ label, min, max, step, value, hint, onChange }: SliderRowProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between font-mono text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{hint}</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range"
          aria-label={`${label} slider`}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number.parseFloat(e.target.value))}
          className="flex-1 accent-foreground"
        />
        <input
          type="number"
          aria-label={label}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => {
            const n = Number.parseFloat(e.target.value);
            if (Number.isFinite(n)) onChange(n);
          }}
          className="w-16 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[11px] text-foreground outline-none focus:border-input"
        />
      </div>
    </div>
  );
}

interface ColorEditorProps {
  theme: Theme;
  token: SemanticColorToken;
  value: ColorValue;
}

/**
 * OKLCH-first color editor. Reused by:
 *   - the inline editor at the bottom of the Colors panel
 *   - the double-click popover on each swatch
 * so both paths share the exact same L/C/H sliders + text input behavior.
 */
export function ColorEditor({ theme, token, value }: ColorEditorProps) {
  const setTokenColor = useProjectStore((s) => s.setTokenColor);
  const literal = value.kind === 'literal' ? value.value : colorValueToCss(value);
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
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span
          className="h-8 w-8 shrink-0 rounded border border-border"
          style={{ background: literal }}
        />
        <div className="flex flex-col">
          <span className="font-mono text-xs text-foreground/90">--{token}</span>
          <span className="text-[11px] text-muted-foreground">{theme}</span>
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
        <p className="text-[11px] text-muted-foreground">
          Sliders show up for <span className="font-mono">oklch(...)</span> values. The text input
          below accepts any CSS color.
        </p>
      )}

      <input
        type="text"
        aria-label={`${token} value`}
        value={literal}
        onChange={(e) => writeRaw(e.target.value)}
        className="w-full rounded border border-border bg-background px-2 py-1 font-mono text-[11px] text-foreground outline-none focus:border-input"
      />

      {value.kind === 'derived' ? (
        <p className="text-[11px] text-muted-foreground">
          Derived from <span className="font-mono">--{value.from}</span> · editing will switch to a
          literal.
        </p>
      ) : null}
    </div>
  );
}
