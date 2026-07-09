import { useCallback, useEffect, useMemo, useState } from 'react';
import { CURATED_THEMES, type CuratedTheme, themeToSpec } from '@/editor/theme-gallery-data';
import { generateTheme } from '@/editor/theme-generator';
import type { PreviewTheme } from '@/renderer';
import { useProjectStore } from '@/store/project-store';

interface ThemeLabProps {
  /** Lets a preset flip the preview to dark (neon reads best on a dark canvas). */
  onTheme: (theme: PreviewTheme) => void;
}

/**
 * Interactive switcher for the /learn maximalist chapter. Surfaces the curated
 * themes flagged `maximal` — the SAME entries the editor's theme gallery ships —
 * and applies each with the editor's own applyTheme, which now installs the
 * palette, radius, shadows, font, interaction state, AND the cva-variant
 * overrides (gradients, circular buttons, float) in one history step. So the
 * wild look live-previews and lands in the diff. Applies the first on mount.
 */
export function ThemeLab({ onTheme }: ThemeLabProps) {
  const applyTheme = useProjectStore((s) => s.applyTheme);
  const themes = useMemo(() => CURATED_THEMES.filter((t) => t.maximal), []);
  const [activeId, setActiveId] = useState(themes[0]?.id ?? '');

  const [rolled, setRolled] = useState<{ name: string; tagline: string } | null>(null);

  const apply = useCallback(
    (theme: CuratedTheme) => {
      applyTheme(themeToSpec(theme));
      onTheme(theme.preview ?? 'light');
      setActiveId(theme.id);
      setRolled(null);
    },
    [applyTheme, onTheme],
  );

  const roll = useCallback(() => {
    const theme = generateTheme();
    applyTheme(theme.spec);
    onTheme(theme.preview);
    setActiveId('__rolled__');
    setRolled({
      name: theme.name,
      tagline: 'A random roll — palette, shape, shadows, motion, all of it.',
    });
  }, [applyTheme, onTheme]);

  // Apply the default preset when the chapter scrolls in.
  useEffect(() => {
    const first = themes[0];
    if (first) apply(first);
  }, [apply, themes]);

  const active = themes.find((t) => t.id === activeId);
  const caption = rolled ? `${rolled.name} — ${rolled.tagline}` : active?.tagline;

  return (
    <aside
      aria-label="Maximalist themes"
      className="flex flex-col gap-3 rounded-md border border-border bg-card/60 p-4 shadow-sm backdrop-blur"
    >
      <header className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
        make it anything — click one
      </header>
      <div className="flex flex-wrap gap-2">
        {themes.map((theme) => (
          <button
            key={theme.id}
            type="button"
            onClick={() => apply(theme)}
            data-active={theme.id === activeId ? '' : undefined}
            className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground transition-colors hover:border-ring data-[active]:border-primary data-[active]:bg-primary data-[active]:text-primary-foreground"
          >
            {theme.name}
          </button>
        ))}
        <button
          type="button"
          onClick={roll}
          data-active={activeId === '__rolled__' ? '' : undefined}
          className="rounded-md border border-dashed border-border px-3 py-1.5 text-xs text-foreground transition-colors hover:border-ring data-[active]:border-primary data-[active]:bg-primary data-[active]:text-primary-foreground"
        >
          🎲 Surprise me
        </button>
      </div>
      {caption ? <p className="text-[11px] text-muted-foreground">{caption}</p> : null}
    </aside>
  );
}
