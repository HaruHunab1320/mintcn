import { useEffect, useMemo, useRef, useState } from 'react';
import { ChipFilter, type ChipOption } from './chip-filter';
import {
  type FontCategory,
  type FontEntry,
  GOOGLE_FONTS,
  loadFontFamily,
  preloadFontFamilies,
} from './google-fonts';
import { Modal } from './modal';

interface FontPickerProps {
  open: boolean;
  /** The family currently selected — shown with a check + auto-scrolled into view. */
  currentFamily?: string;
  /** Category filter default: usually matches the FontFamilyKey being edited. */
  defaultCategory?: FontCategory | 'all';
  onPick: (family: string, category: FontCategory) => void;
  onClose: () => void;
}

const CATEGORY_LABELS: Record<FontCategory | 'all', string> = {
  all: 'All',
  'sans-serif': 'Sans',
  serif: 'Serif',
  monospace: 'Mono',
  display: 'Display',
  handwriting: 'Handwriting',
};

const CATEGORY_OPTIONS: ChipOption<FontCategory | 'all'>[] = [
  { id: 'all', label: CATEGORY_LABELS.all },
  { id: 'sans-serif', label: CATEGORY_LABELS['sans-serif'] },
  { id: 'serif', label: CATEGORY_LABELS.serif },
  { id: 'monospace', label: CATEGORY_LABELS.monospace },
  { id: 'display', label: CATEGORY_LABELS.display },
  { id: 'handwriting', label: CATEGORY_LABELS.handwriting },
];

/**
 * A searchable Google Fonts picker. Preloads the "featured" fonts (top ~10)
 * on mount so the initial list previews immediately, then lazy-loads whatever
 * else scrolls into view via IntersectionObserver.
 */
export function FontPicker({
  open,
  currentFamily,
  defaultCategory = 'all',
  onPick,
  onClose,
}: FontPickerProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<FontCategory | 'all'>(defaultCategory);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setCategory(defaultCategory);
    requestAnimationFrame(() => searchRef.current?.focus());
    // Batch-load the featured set so the initial list has previews immediately.
    preloadFontFamilies(GOOGLE_FONTS.filter((f) => f.featured).map((f) => f.family));
  }, [open, defaultCategory]);

  const filtered = useMemo<FontEntry[]>(() => {
    const q = query.trim().toLowerCase();
    return GOOGLE_FONTS.filter((f) => {
      if (category !== 'all' && f.category !== category) return false;
      if (q && !f.family.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [query, category]);

  // Lazy-load each row's font when it enters the viewport. IntersectionObserver
  // is cheap — one observer per open picker, disconnected on close.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const family = entry.target.getAttribute('data-font-family');
          if (family) loadFontFamily(family);
        }
      },
      { root: listRef.current, rootMargin: '200px' },
    );
    const rows = listRef.current.querySelectorAll<HTMLElement>('[data-font-family]');
    for (const row of rows) observer.observe(row);
    return () => observer.disconnect();
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      ariaLabel="Font picker"
      backdropAlignClass="pt-[10vh]"
      surfaceClassName="flex w-full max-w-xl flex-col gap-3 rounded-lg border border-border bg-card p-4 text-foreground shadow-2xl"
    >
      <input
        ref={searchRef}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search Google Fonts…"
        aria-label="Search Google Fonts"
        className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
      />

      <ChipFilter
        options={CATEGORY_OPTIONS}
        active={category}
        onChange={setCategory}
        ariaLabel="Font category"
      />

      <div
        ref={listRef}
        className="max-h-[50vh] overflow-y-auto rounded-md border border-border bg-background"
      >
        {filtered.length === 0 ? (
          <p className="p-4 text-center text-xs text-muted-foreground">No fonts match.</p>
        ) : (
          <ul className="flex flex-col">
            {filtered.map((f) => {
              const selected = currentFamily === f.family;
              return (
                <li key={f.family}>
                  <button
                    type="button"
                    data-font-family={f.family}
                    onClick={() => {
                      loadFontFamily(f.family);
                      onPick(f.family, f.category);
                    }}
                    style={{ fontFamily: `"${f.family}", ${f.category}` }}
                    className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted ${
                      selected ? 'bg-muted' : ''
                    }`}
                  >
                    <span>
                      <span className="mr-2 text-base">{f.family}</span>
                      <span className="text-xs text-muted-foreground">
                        The quick brown fox jumps
                      </span>
                    </span>
                    <span className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="uppercase tracking-wide">{CATEGORY_LABELS[f.category]}</span>
                      {selected ? <span className="text-foreground">✓</span> : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          {filtered.length} font{filtered.length === 1 ? '' : 's'}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-border px-3 py-1 text-xs text-foreground hover:border-ring"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}
