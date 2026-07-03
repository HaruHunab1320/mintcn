import { useCallback, useEffect, useRef, useState } from 'react';
import {
  assignPaletteFromImage,
  type GeneratedPalette,
  generatePalette,
  KEY_PALETTE_TOKENS,
  type KeyPaletteToken,
  type OklchTriplet,
  type PaletteStrategy,
  sampleImagePalette,
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
          locked ? 'border-ring' : 'border-border hover:border-input'
        }`}
        style={{ background: colorValueToCss(color) }}
      >
        <span
          className={`absolute right-1 top-1 rounded bg-background/70 px-1 text-[10px] font-medium transition-opacity ${
            locked
              ? 'opacity-100 text-foreground'
              : 'opacity-0 group-hover:opacity-100 text-foreground/90'
          }`}
        >
          {locked ? '🔒' : '🔓'}
        </span>
      </button>
      <span className="truncate font-mono text-[10px] text-muted-foreground">{token}</span>
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
  const [dropActive, setDropActive] = useState(false);
  const [sampling, setSampling] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const applyImageFile = useCallback(
    async (file: File) => {
      setSampling(true);
      try {
        const clusters = await sampleImagePalette(file, { k: 6 });
        const palette = assignPaletteFromImage({
          clusters,
          currentDestructive:
            colorValueToTriplet(document.tokens.colors.light.destructive) ?? undefined,
        });
        applyPalette(palette);
      } finally {
        setSampling(false);
      }
    },
    [applyPalette, document.tokens.colors.light.destructive],
  );

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
    <section className="flex flex-col gap-2 rounded-lg border border-border bg-card/40 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground/90">
            Palette
          </h2>
          <p className="text-[11px] text-muted-foreground">
            Click a swatch to lock · press{' '}
            <kbd className="rounded border border-border px-1 text-[10px]">space</kbd> to
            regenerate
            {lockedCount > 0 ? ` · ${lockedCount} locked` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={strategy}
            onChange={(e) => setStrategy(e.target.value as PaletteStrategy)}
            className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-input"
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
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            ↻ Generate
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={sampling}
            className="rounded-md border border-border px-3 py-1 text-xs text-foreground hover:border-ring disabled:opacity-50"
          >
            {sampling ? 'Sampling…' : '⇪ From image'}
          </button>
          <button
            type="button"
            onClick={() => {
              const name = window.prompt('Save palette as preset:');
              if (name?.trim()) savePreset(name.trim());
            }}
            className="rounded-md border border-border px-3 py-1 text-xs text-foreground hover:border-ring"
          >
            Save preset
          </button>
        </div>
      </div>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: drop target is
         decorative sugar over the file input above; the file input remains
         the accessible entry point. */}
      <div
        onDragOver={(e) => {
          if (Array.from(e.dataTransfer.types).includes('Files')) {
            e.preventDefault();
            setDropActive(true);
          }
        }}
        onDragLeave={() => setDropActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDropActive(false);
          const file = e.dataTransfer.files[0];
          if (file?.type.startsWith('image/')) void applyImageFile(file);
        }}
        className={`relative grid grid-cols-5 gap-2 rounded-md transition-colors ${
          dropActive ? 'ring-2 ring-ring ring-offset-2 ring-offset-background' : ''
        }`}
      >
        {KEY_PALETTE_TOKENS.map((token) => (
          <Swatch
            key={token}
            token={token}
            color={document.tokens.colors.light[token]}
            locked={locks[token]}
            onToggleLock={() => toggleLock(token)}
          />
        ))}
        {dropActive ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-md bg-background/70 text-xs font-medium text-foreground">
            Drop to sample colors
          </div>
        ) : null}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        aria-label="Sample palette from image"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void applyImageFile(file);
          e.target.value = ''; // allow re-selecting the same file next time
        }}
      />
    </section>
  );
}
