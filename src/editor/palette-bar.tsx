import { useCallback, useEffect, useState } from 'react';
import {
  type GeneratedPalette,
  generatePalette,
  KEY_PALETTE_TOKENS,
  type KeyPaletteToken,
  type OklchTriplet,
  type PaletteStrategy,
} from '@/palette';
import type { ColorValue, ProjectDocument } from '@/schema';
import { useProjectStore } from '@/store/project-store';
import { parseOklch } from './oklch';

const STRATEGY_OPTIONS: { id: PaletteStrategy; label: string }[] = [
  { id: 'monochromatic', label: 'Monochromatic' },
  { id: 'analogous', label: 'Analogous' },
  { id: 'complementary', label: 'Complementary' },
  { id: 'triadic', label: 'Triadic' },
  { id: 'random', label: 'Random' },
];

function colorValueToCss(value: ColorValue): string {
  if (value.kind === 'literal') return value.value;
  const basePercent = Math.round((1 - value.mix.amount) * 100);
  return `color-mix(in ${value.mix.space}, var(--${value.from}) ${basePercent}%, ${value.mix.toward})`;
}

function colorValueToTriplet(value: ColorValue): OklchTriplet | null {
  if (value.kind !== 'literal') return null;
  const parsed = parseOklch(value.value);
  if (!parsed) return null;
  return { l: parsed.l, c: parsed.c, h: parsed.h };
}

interface SwatchProps {
  token: KeyPaletteToken;
  color: ColorValue;
  locked: boolean;
  onToggleLock: () => void;
}

function Swatch({ token, color, locked, onToggleLock }: SwatchProps) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1">
      <button
        type="button"
        onClick={onToggleLock}
        aria-label={`${token} swatch ${locked ? 'locked' : 'unlocked'}`}
        className={`group relative h-12 w-full overflow-hidden rounded-md border transition-colors ${
          locked ? 'border-neutral-100' : 'border-neutral-800 hover:border-neutral-600'
        }`}
        style={{ background: colorValueToCss(color) }}
      >
        <span
          className={`absolute right-1 top-1 rounded bg-neutral-950/70 px-1 text-[10px] font-medium transition-opacity ${
            locked
              ? 'opacity-100 text-neutral-100'
              : 'opacity-0 group-hover:opacity-100 text-neutral-300'
          }`}
        >
          {locked ? '🔒' : '🔓'}
        </span>
      </button>
      <span className="truncate font-mono text-[10px] text-neutral-400">{token}</span>
    </div>
  );
}

interface PaletteBarProps {
  document: ProjectDocument;
}

/**
 * Coolers-style palette generator. Five key tokens shown as swatches; click
 * to lock/unlock. Generate (or spacebar) re-rolls the unlocked ones via the
 * chosen harmony strategy, then cascades the result to every other semantic
 * token via contrast pairing and OKLCH mixing.
 */
export function PaletteBar({ document }: PaletteBarProps) {
  const applyPalette = useProjectStore((s) => s.applyPalette);
  const savePreset = useProjectStore((s) => s.savePreset);
  const [strategy, setStrategy] = useState<PaletteStrategy>('monochromatic');
  const [locks, setLocks] = useState<Record<KeyPaletteToken, boolean>>(() => ({
    primary: false,
    secondary: false,
    accent: false,
    destructive: true, // start locked — keeping the red default unless user opts in
    background: false,
  }));

  const generate = useCallback(() => {
    const lockedTriplets: Partial<Record<KeyPaletteToken, OklchTriplet>> = {};
    for (const token of KEY_PALETTE_TOKENS) {
      if (!locks[token]) continue;
      const triplet = colorValueToTriplet(document.tokens.colors.light[token]);
      if (triplet) lockedTriplets[token] = triplet;
    }
    const palette: GeneratedPalette = generatePalette({
      strategy,
      locks: lockedTriplets,
    });
    applyPalette(palette);
  }, [applyPalette, document.tokens.colors.light, locks, strategy]);

  // Spacebar regenerates anywhere on the page, unless the user is typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return;
      }
      e.preventDefault();
      generate();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [generate]);

  const toggleLock = (token: KeyPaletteToken) =>
    setLocks((prev) => ({ ...prev, [token]: !prev[token] }));

  const lockedCount = Object.values(locks).filter(Boolean).length;

  return (
    <section className="flex flex-col gap-2 rounded-lg border border-neutral-800 bg-neutral-950/40 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
            Palette
          </h2>
          <p className="text-[11px] text-neutral-500">
            Click a swatch to lock · press{' '}
            <kbd className="rounded border border-neutral-700 px-1 text-[10px]">space</kbd> to
            regenerate
            {lockedCount > 0 ? ` · ${lockedCount} locked` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={strategy}
            onChange={(e) => setStrategy(e.target.value as PaletteStrategy)}
            className="rounded border border-neutral-800 bg-neutral-950 px-2 py-1 text-xs text-neutral-100 outline-none focus:border-neutral-600"
          >
            {STRATEGY_OPTIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={generate}
            className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-900 hover:bg-white"
          >
            ↻ Generate
          </button>
          <button
            type="button"
            onClick={() => {
              const name = window.prompt('Save palette as preset:');
              if (name?.trim()) savePreset(name.trim());
            }}
            className="rounded-md border border-neutral-700 px-3 py-1 text-xs text-neutral-200 hover:border-neutral-500"
          >
            Save preset
          </button>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {KEY_PALETTE_TOKENS.map((token) => (
          <Swatch
            key={token}
            token={token}
            color={document.tokens.colors.light[token]}
            locked={locks[token]}
            onToggleLock={() => toggleLock(token)}
          />
        ))}
      </div>
    </section>
  );
}
