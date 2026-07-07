import type { ReactNode } from 'react';
import { CURATED_THEMES, themeToSpec } from '@/editor/theme-gallery-data';
import type { ColorValue, SemanticColorToken, TokenState } from '@/schema';
import type { Theme } from '@/store/project-store';

export interface ChapterActions {
  resetToFixture: () => void;
  applyTheme: (spec: {
    colors: TokenState['colors'];
    radius: string;
    fontFamily: TokenState['typography']['fontFamily'];
  }) => void;
  setTokenColor: (theme: Theme, token: SemanticColorToken, value: ColorValue) => void;
  setVariantClass: (
    componentId: string,
    axis: string,
    option: string,
    newString: string | undefined,
    originalString: string,
  ) => void;
  setRadius: (value: string) => void;
}

export interface Chapter {
  id: string;
  eyebrow?: string;
  title: string;
  body: ReactNode;
  /** Runs once each time the chapter scrolls into view. */
  onEnter?: () => void;
  /** Optional inline call-to-action rendered under the body. */
  cta?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

// Preresolved theme specs (deterministic, so the demo always looks the same).
function specById(id: string) {
  const theme = CURATED_THEMES.find((t) => t.id === id);
  if (!theme) throw new Error(`Landing: missing curated theme "${id}"`);
  return themeToSpec(theme);
}
const CYBERPUNK = specById('cyberpunk-2077');
const MATRIX = specById('matrix-terminal');
const AMBER = specById('amber-crt');

/**
 * The scripted set of chapters shown on /learn. Each has a scroll-in action
 * that dispatches into the same Zustand store the editor uses, so the demo
 * on the right visibly reacts as the visitor reads.
 *
 * Chapters are intentionally punchy — this is a marketing lander, not
 * documentation. The full docs live in the roadmap + README.
 */
export function buildChapters(actions: ChapterActions): Chapter[] {
  return [
    {
      id: 'hero',
      eyebrow: 'Mintcn',
      title: 'Your shadcn design system, live.',
      body: (
        <>
          <p className="text-base text-muted-foreground">
            Mintcn is a visual editor for shadcn/ui that reads your real project source, edits it
            visually, and hands you back a clean diff you can PR.
          </p>
          <p className="text-sm text-muted-foreground">Scroll to see it in action ↓</p>
        </>
      ),
      onEnter: actions.resetToFixture,
      cta: { label: 'Open the editor →', href: '/' },
    },
    {
      id: 'whole-app',
      eyebrow: 'Chapter 1',
      title: 'The whole app IS the preview.',
      body: (
        <p>
          Every panel, border, and button on the right uses the same shadcn tokens you're editing.
          Watch the entire canvas repaint when a theme applies — that's the tool proving its own
          point.
        </p>
      ),
      onEnter: () => actions.applyTheme(CYBERPUNK),
    },
    {
      id: 'themes',
      eyebrow: 'Chapter 2',
      title: 'Eight curated themes. Click one.',
      body: (
        <p>
          Cyberpunk, Matrix, Amber CRT, Synthwave, Blade Runner, Tron, Ghost in the Shell,
          Solarized. Each locks the five key palette tokens and derives the other 27 through the
          same generator the palette bar uses.
        </p>
      ),
      onEnter: () => actions.applyTheme(MATRIX),
    },
    {
      id: 'palette',
      eyebrow: 'Chapter 3',
      title: 'Or hand-paint your own.',
      body: (
        <p>
          OKLCH color wheel, chroma/lightness sliders, and a Coolers-style palette bar with
          per-token locks. Drop an image and Mintcn samples its dominant hues into a palette.
        </p>
      ),
      onEnter: () => actions.applyTheme(AMBER),
    },
    {
      id: 'overrides',
      eyebrow: 'Chapter 4',
      title: 'Rewrite any cva variant.',
      body: (
        <p>
          Overrides target specific variant options — `size.sm`, `variant.destructive` — with the
          exact Tailwind class string you want, per breakpoint. Live-previewed via a tailwind-merge
          overlay before export.
        </p>
      ),
      onEnter: () => {
        actions.setVariantClass(
          'button',
          'size',
          'sm',
          'h-9 gap-1.5 rounded-full px-4 text-sm',
          'h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5',
        );
        actions.setRadius('1rem');
      },
    },
    {
      id: 'diff',
      eyebrow: 'Chapter 5',
      title: 'Every edit becomes a clean diff.',
      body: (
        <p>
          Mintcn re-emits your source files with minimal churn — no unrelated formatting changes.
          Copy the diff, or download a zip of just the changed files, and open the PR yourself.
        </p>
      ),
    },
    {
      id: 'yours',
      eyebrow: 'Chapter 6',
      title: 'Point it at your repo.',
      body: (
        <p>
          Sign in with GitHub and paste any repo URL. Mintcn reads the components, tokens, and
          overrides straight from your source — public or private.
        </p>
      ),
      onEnter: actions.resetToFixture,
    },
    {
      id: 'cta',
      eyebrow: "That's it.",
      title: 'Ready to edit yours?',
      body: (
        <p className="text-base text-muted-foreground">
          Mintcn runs entirely in your browser. Nothing gets uploaded, nothing is stored on any
          server. Your token stays in your tab.
        </p>
      ),
      cta: { label: 'Open the editor →', href: '/' },
    },
  ];
}
