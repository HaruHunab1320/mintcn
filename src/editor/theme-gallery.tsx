import { useEffect, useMemo, useState } from 'react';
import type { Preset } from '@/schema';
import { useProjectStore } from '@/store/project-store';
import { colorValueToCss } from './color-editor';
import { parsePrimaryFamily, preloadFontFamilies } from './google-fonts';
import {
  CURATED_THEMES,
  type CuratedTheme,
  type ThemeCategory,
  themeToSpec,
} from './theme-gallery-data';

interface ThemeGalleryProps {
  open: boolean;
  onClose: () => void;
}

type Filter = ThemeCategory | 'all' | 'mine';

const FILTER_LABELS: Record<Filter, string> = {
  all: 'All',
  'sci-fi': 'Sci-Fi',
  hacker: 'Hacker',
  retro: 'Retro',
  classic: 'Classic',
  mine: 'Mine',
};

const CATEGORY_LABELS: Record<ThemeCategory, string> = {
  'sci-fi': 'Sci-Fi',
  hacker: 'Hacker',
  retro: 'Retro',
  classic: 'Classic',
};

const FILTERS: Filter[] = ['all', 'sci-fi', 'hacker', 'retro', 'classic', 'mine'];

interface CardProps {
  id: string;
  name: string;
  tagline?: string;
  chip: string;
  swatches: string[];
  fontHint?: string;
  onClick: () => void;
  onHover?: () => void;
  onRemove?: () => void;
}

function ThemeCard({
  id,
  name,
  tagline,
  chip,
  swatches,
  fontHint,
  onClick,
  onHover,
  onRemove,
}: CardProps) {
  return (
    <div
      data-theme-id={id}
      className="group relative flex flex-col gap-2 rounded-lg border border-border bg-background p-3 text-left transition-colors hover:border-ring"
    >
      <button
        type="button"
        onMouseEnter={onHover}
        onClick={onClick}
        className="flex flex-col gap-2 text-left"
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">{name}</span>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{chip}</span>
        </div>
        {tagline ? <p className="text-[11px] text-muted-foreground">{tagline}</p> : null}
        <div className="flex h-6 overflow-hidden rounded">
          {swatches.map((color, i) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: swatches are positional
              key={i}
              style={{ background: color }}
              className="flex-1"
            />
          ))}
        </div>
        {fontHint ? (
          <span className="text-[10px] font-mono text-muted-foreground">{fontHint}</span>
        ) : null}
      </button>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${name}`}
          title="Remove this saved theme"
          className="absolute right-2 top-2 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}

function curatedCardProps(theme: CuratedTheme, onApply: () => void): CardProps {
  const spec = themeToSpec(theme);
  const swatches = [
    spec.colors.light.background,
    spec.colors.light.primary,
    spec.colors.light.secondary,
    spec.colors.light.accent,
    spec.colors.light.foreground,
  ].map(colorValueToCss);
  return {
    id: theme.id,
    name: theme.name,
    tagline: theme.tagline,
    chip: CATEGORY_LABELS[theme.category],
    swatches,
    fontHint: parsePrimaryFamily(spec.fontFamily.sans) ?? spec.fontFamily.sans,
    onClick: onApply,
    onHover: () => {
      const fonts = [spec.fontFamily.sans, spec.fontFamily.serif, spec.fontFamily.mono]
        .map(parsePrimaryFamily)
        .filter((f): f is string => Boolean(f));
      if (fonts.length > 0) preloadFontFamilies(fonts);
    },
  };
}

function presetCardProps(preset: Preset, onLoad: () => void, onRemove: () => void): CardProps {
  const swatches = [
    preset.tokens.colors.light.background,
    preset.tokens.colors.light.primary,
    preset.tokens.colors.light.secondary,
    preset.tokens.colors.light.accent,
    preset.tokens.colors.light.foreground,
  ].map(colorValueToCss);
  return {
    id: `preset-${preset.id}`,
    name: preset.name,
    chip: 'Mine',
    swatches,
    fontHint: parsePrimaryFamily(preset.tokens.typography.fontFamily.sans) ?? undefined,
    onClick: onLoad,
    onRemove,
  };
}

/**
 * Curated theme picker + save/browse for the user's own presets. Clicking a
 * curated card runs `applyTheme` (radius/fonts/palette in one history step).
 * Clicking a preset card runs `loadPreset` (which also restores overrides).
 * "Save current" captures the doc's live token state as a new preset — same
 * mechanism the Presets panel already uses.
 */
export function ThemeGallery({ open, onClose }: ThemeGalleryProps) {
  const document = useProjectStore((s) => s.document);
  const applyTheme = useProjectStore((s) => s.applyTheme);
  const loadPreset = useProjectStore((s) => s.loadPreset);
  const removePreset = useProjectStore((s) => s.removePreset);
  const savePreset = useProjectStore((s) => s.savePreset);
  const [filter, setFilter] = useState<Filter>('all');
  const [newName, setNewName] = useState('');
  const [saveMode, setSaveMode] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFilter('all');
    setSaveMode(false);
    setNewName('');
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  const presets = document?.presets ?? [];
  const showCurated = filter === 'all' || filter !== 'mine';
  const showPresets = filter === 'all' || filter === 'mine';

  const curated = useMemo(
    () =>
      CURATED_THEMES.filter(
        (t) => filter === 'all' || (filter !== 'mine' && t.category === filter),
      ),
    [filter],
  );

  const handleSave = () => {
    const name = newName.trim();
    if (!name) return;
    savePreset(name);
    setNewName('');
    setSaveMode(false);
    setFilter('mine');
  };

  if (!open) return null;

  const totalCards = (showCurated ? curated.length : 0) + (showPresets ? presets.length : 0);

  return (
    <div
      role="dialog"
      aria-label="Theme gallery"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center bg-background/80 pt-[8vh] backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        className="flex w-full max-w-4xl flex-col gap-4 rounded-lg border border-border bg-card p-5 text-foreground shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key !== 'Escape') e.stopPropagation();
        }}
        role="document"
      >
        <header className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium tracking-tight">Theme gallery</h2>
            {saveMode ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave();
                    if (e.key === 'Escape') {
                      e.stopPropagation();
                      setSaveMode(false);
                    }
                  }}
                  placeholder="theme name"
                  className="rounded border border-border bg-background px-2 py-1 font-mono text-[11px] text-foreground outline-none focus:border-input"
                />
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!newName.trim()}
                  className="rounded border border-border px-2 py-1 text-[11px] text-foreground enabled:hover:border-ring disabled:opacity-40"
                >
                  save
                </button>
                <button
                  type="button"
                  onClick={() => setSaveMode(false)}
                  className="text-[11px] text-muted-foreground hover:text-foreground"
                >
                  cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setSaveMode(true)}
                disabled={!document}
                className="rounded-md border border-border px-2 py-1 text-[11px] text-foreground enabled:hover:border-ring disabled:opacity-40"
                title="Save the current theme so you can come back to it later"
              >
                ＋ Save current
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Pick a curated theme or one of your saved themes — palette, radius, and font stacks
            apply in one step.
          </p>
        </header>

        <div className="flex flex-wrap items-center gap-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded px-2 py-1 text-[11px] transition-colors ${
                f === filter
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {FILTER_LABELS[f]}
              {f === 'mine' && presets.length > 0 ? (
                <span className="ml-1 text-[9px] opacity-70">{presets.length}</span>
              ) : null}
            </button>
          ))}
        </div>

        <div className="grid max-h-[65vh] grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2">
          {showPresets && presets.length === 0 && filter === 'mine' ? (
            <p className="col-span-full text-[11px] text-muted-foreground">
              No saved themes yet. Click "Save current" up top to snapshot your current palette,
              radius, and fonts.
            </p>
          ) : null}
          {showPresets
            ? presets.map((preset) => {
                const props = presetCardProps(
                  preset,
                  () => {
                    loadPreset(preset.id);
                    onClose();
                  },
                  () => removePreset(preset.id),
                );
                return <ThemeCard key={props.id} {...props} />;
              })
            : null}
          {showCurated
            ? curated.map((theme) => {
                const props = curatedCardProps(theme, () => {
                  applyTheme(themeToSpec(theme));
                  onClose();
                });
                return <ThemeCard key={props.id} {...props} />;
              })
            : null}
        </div>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            {totalCards} theme{totalCards === 1 ? '' : 's'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-3 py-1 text-xs text-foreground hover:border-ring"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
