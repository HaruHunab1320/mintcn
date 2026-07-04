export type FontCategory = 'sans-serif' | 'serif' | 'monospace' | 'display' | 'handwriting';

export interface FontEntry {
  family: string;
  category: FontCategory;
  /** True for the small set we bundle-preload so the picker isn't blank on open. */
  featured?: boolean;
}

/**
 * Curated slice of Google Fonts — ~60 popular typefaces bucketed by category.
 * Not exhaustive; a real Fonts API integration would enumerate all ~1500. But
 * this covers the "designer's shortlist" for a first-time visitor, and the
 * loader will happily load anything by family name if you type the raw text.
 *
 * Sourced from the Google Fonts popular-by-usage list, hand-trimmed for
 * variety across categories. Kept in one file so future edits are a single
 * commit rather than fetching a live catalog.
 */
export const GOOGLE_FONTS: FontEntry[] = [
  // Sans-serif — the workhorses
  { family: 'Inter', category: 'sans-serif', featured: true },
  { family: 'Roboto', category: 'sans-serif', featured: true },
  { family: 'Geist', category: 'sans-serif', featured: true },
  { family: 'Manrope', category: 'sans-serif', featured: true },
  { family: 'Open Sans', category: 'sans-serif', featured: true },
  { family: 'Poppins', category: 'sans-serif', featured: true },
  { family: 'DM Sans', category: 'sans-serif', featured: true },
  { family: 'Plus Jakarta Sans', category: 'sans-serif' },
  { family: 'Work Sans', category: 'sans-serif' },
  { family: 'Rubik', category: 'sans-serif' },
  { family: 'Nunito', category: 'sans-serif' },
  { family: 'Nunito Sans', category: 'sans-serif' },
  { family: 'Montserrat', category: 'sans-serif' },
  { family: 'Raleway', category: 'sans-serif' },
  { family: 'Lato', category: 'sans-serif' },
  { family: 'Karla', category: 'sans-serif' },
  { family: 'Figtree', category: 'sans-serif' },
  { family: 'Outfit', category: 'sans-serif' },
  { family: 'Onest', category: 'sans-serif' },
  { family: 'Sora', category: 'sans-serif' },
  { family: 'Space Grotesk', category: 'sans-serif' },
  { family: 'Barlow', category: 'sans-serif' },
  { family: 'IBM Plex Sans', category: 'sans-serif' },
  { family: 'Source Sans 3', category: 'sans-serif' },
  { family: 'Noto Sans', category: 'sans-serif' },
  { family: 'Archivo', category: 'sans-serif' },
  { family: 'Hind', category: 'sans-serif' },
  { family: 'Public Sans', category: 'sans-serif' },

  // Serif
  { family: 'Playfair Display', category: 'serif', featured: true },
  { family: 'Merriweather', category: 'serif', featured: true },
  { family: 'Lora', category: 'serif' },
  { family: 'PT Serif', category: 'serif' },
  { family: 'Cormorant Garamond', category: 'serif' },
  { family: 'EB Garamond', category: 'serif' },
  { family: 'Crimson Pro', category: 'serif' },
  { family: 'Libre Baskerville', category: 'serif' },
  { family: 'Bitter', category: 'serif' },
  { family: 'Roboto Slab', category: 'serif' },
  { family: 'Source Serif 4', category: 'serif' },
  { family: 'IBM Plex Serif', category: 'serif' },
  { family: 'Noto Serif', category: 'serif' },
  { family: 'DM Serif Display', category: 'serif' },
  { family: 'Fraunces', category: 'serif' },
  { family: 'Instrument Serif', category: 'serif' },

  // Monospace
  { family: 'JetBrains Mono', category: 'monospace', featured: true },
  { family: 'Geist Mono', category: 'monospace', featured: true },
  { family: 'Fira Code', category: 'monospace' },
  { family: 'IBM Plex Mono', category: 'monospace' },
  { family: 'Source Code Pro', category: 'monospace' },
  { family: 'Roboto Mono', category: 'monospace' },
  { family: 'Space Mono', category: 'monospace' },
  { family: 'DM Mono', category: 'monospace' },
  { family: 'Inconsolata', category: 'monospace' },
  { family: 'Ubuntu Mono', category: 'monospace' },
  { family: 'Cousine', category: 'monospace' },

  // Display
  { family: 'Bebas Neue', category: 'display' },
  { family: 'Archivo Black', category: 'display' },
  { family: 'Anton', category: 'display' },
  { family: 'Righteous', category: 'display' },
  { family: 'Alfa Slab One', category: 'display' },

  // Handwriting
  { family: 'Caveat', category: 'handwriting' },
  { family: 'Dancing Script', category: 'handwriting' },
  { family: 'Pacifico', category: 'handwriting' },
  { family: 'Kalam', category: 'handwriting' },
];

const loadedFamilies = new Set<string>();

/**
 * Injects a Google Fonts CSS `<link>` for the given family, once. Subsequent
 * calls are no-ops. Loads a small weight range (400, 600, 700) — enough for
 * the shadcn preview and light/bold copy without pulling every weight.
 */
export function loadFontFamily(family: string): void {
  if (loadedFamilies.has(family)) return;
  loadedFamilies.add(family);
  const encoded = encodeURIComponent(family).replace(/%20/g, '+');
  const href = `https://fonts.googleapis.com/css2?family=${encoded}:wght@400;600;700&display=swap`;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.setAttribute('data-tincture-font', family);
  document.head.appendChild(link);
}

/** Preload multiple families in one batched CSS request. */
export function preloadFontFamilies(families: string[]): void {
  const fresh = families.filter((f) => !loadedFamilies.has(f));
  if (fresh.length === 0) return;
  for (const f of fresh) loadedFamilies.add(f);
  const familyParams = fresh
    .map((f) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@400;600;700`)
    .join('&');
  const href = `https://fonts.googleapis.com/css2?${familyParams}&display=swap`;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.setAttribute('data-tincture-font-batch', fresh.join(','));
  document.head.appendChild(link);
}

/**
 * Extracts the primary family (the first quoted or bare token before a comma)
 * from a CSS font stack. Used when a project loads with existing font tokens —
 * we preload whichever family is at the head of each stack.
 */
export function parsePrimaryFamily(stack: string): string | null {
  const first = stack.split(',')[0]?.trim();
  if (!first) return null;
  const stripped = first.replace(/^['"]|['"]$/g, '').trim();
  return stripped || null;
}

/** Format a stack: primary + fallback. `primary` may contain spaces. */
export function buildFontStack(primary: string, fallback: FontCategory): string {
  const quoted = primary.includes(' ') ? `"${primary}"` : primary;
  return `${quoted}, ${fallback}`;
}
