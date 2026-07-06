import { useEffect, useMemo, useState } from 'react';
import { useProjectStore } from '@/store/project-store';
import { colorValueToCss } from './color-editor';
import { preloadFontFamilies, parsePrimaryFamily } from './google-fonts';
import { CURATED_THEMES, type ThemeCategory, themeToSpec } from './theme-gallery-data';

interface ThemeGalleryProps {
  open: boolean;
  onClose: () => void;
}

const CATEGORY_LABELS: Record<ThemeCategory | 'all', string> = {
  all: 'All',
  'sci-fi': 'Sci-Fi',
  hacker: 'Hacker',
  retro: 'Retro',
  classic: 'Classic',
};

const CATEGORIES: (ThemeCategory | 'all')[] = ['all', 'sci-fi', 'hacker', 'retro', 'classic'];

/**
 * Curated theme picker. Each card previews the theme's key palette + name +
 * tagline. Clicking applies the theme via `applyTheme` — one history step,
 * undoable. Fonts referenced by the theme are preloaded on hover so the
 * apply is visually instant.
 */
export function ThemeGallery({ open, onClose }: ThemeGalleryProps) {
  const applyTheme = useProjectStore((s) => s.applyTheme);
  const [category, setCategory] = useState<ThemeCategory | 'all'>('all');

  useEffect(() => {
    if (!open) return;
    setCategory('all');
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  const visible = useMemo(
    () => CURATED_THEMES.filter((t) => category === 'all' || t.category === category),
    [category],
  );

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="Theme gallery"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center bg-background/80 pt-[8vh] backdrop-blur-sm"
      onClick={onClose}
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
          <h2 className="text-sm font-medium tracking-tight">Theme gallery</h2>
          <p className="text-xs text-muted-foreground">
            Pick a curated theme — palette, radius, and font stacks apply in one step. Everything
            stays editable after.
          </p>
        </header>

        <div className="flex flex-wrap items-center gap-1">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded px-2 py-1 text-[11px] transition-colors ${
                c === category
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>

        <div className="grid max-h-[65vh] grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2">
          {visible.map((theme) => {
            const spec = themeToSpec(theme);
            const swatches = [
              spec.colors.light.background,
              spec.colors.light.primary,
              spec.colors.light.secondary,
              spec.colors.light.accent,
              spec.colors.light.foreground,
            ].map(colorValueToCss);
            return (
              <button
                key={theme.id}
                type="button"
                data-theme-id={theme.id}
                onMouseEnter={() => {
                  const fonts = [spec.fontFamily.sans, spec.fontFamily.serif, spec.fontFamily.mono]
                    .map(parsePrimaryFamily)
                    .filter((f): f is string => Boolean(f));
                  if (fonts.length > 0) preloadFontFamilies(fonts);
                }}
                onClick={() => {
                  applyTheme(spec);
                  onClose();
                }}
                className="group flex flex-col gap-2 rounded-lg border border-border bg-background p-3 text-left transition-colors hover:border-ring"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{theme.name}</span>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {CATEGORY_LABELS[theme.category]}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">{theme.tagline}</p>
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
                <span className="text-[10px] font-mono text-muted-foreground">
                  {parsePrimaryFamily(spec.fontFamily.sans) ?? spec.fontFamily.sans}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            {visible.length} theme{visible.length === 1 ? '' : 's'}
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
