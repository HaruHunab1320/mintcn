import type { ReactNode } from 'react';
import { CURATED_THEMES, themeToSpec } from '@/editor/theme-gallery-data';
import type { ShowcaseFocusInput } from '@/renderer';
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
  setDuration: (name: string, value: string) => void;
  setEasing: (name: string, value: string) => void;
}

export interface Chapter {
  id: string;
  eyebrow?: string;
  title: string;
  body: ReactNode;
  /**
   * Which showcase section(s) the right-hand preview should show for this
   * chapter. Accepts `'all'`, a single section, or an ordered array — arrays
   * stack the sections top-to-bottom in the preview column, filling the
   * empty space we'd otherwise waste on a single small showcase.
   */
  focus?: ShowcaseFocusInput;
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
      focus: 'all',
      onEnter: () => {
        actions.resetToFixture();
        // Nudge motion tokens to a "medium/pleasant" baseline so the Motion
        // chapter later has visibly different numbers to demo against.
        actions.setDuration('normal', '400ms');
        actions.setEasing('out', 'cubic-bezier(0.16, 1, 0.3, 1)');
      },
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
      focus: 'all',
      onEnter: () => actions.applyTheme(CYBERPUNK),
    },
    {
      id: 'themes',
      eyebrow: 'Chapter 2',
      title: 'Nine curated themes. Click one.',
      body: (
        <p>
          Cyberpunk, Matrix, Amber CRT, Synthwave, Blade Runner, Tron, Ghost in the Shell,
          Solarized, Brutal Editorial. Each locks the five key palette tokens and derives the other
          27 through the same generator the palette bar uses.
        </p>
      ),
      // A theme repaints everything, so show a broad spread — cards, badges,
      // feedback, nav, and the calendar — packed into the masonry so the whole
      // palette shift lands at once instead of one lonely card.
      focus: ['data', 'badges', 'feedback', 'nav', 'calendar'],
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
      // Colors pop hardest on buttons (variant + size grid), badges, and
      // feedback banners; forms + a data card round out the masonry so the
      // hand-painted palette touches inputs and surfaces too.
      focus: ['buttons', 'badges', 'feedback', 'forms', 'data'],
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
      // Buttons first (that's what the callout targets), then badges + a data
      // card + nav so the radius bump (rounded-full / 1rem) reads across
      // several component families, not just the one button.
      focus: ['buttons', 'badges', 'data', 'nav'],
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
      id: 'motion-duration',
      eyebrow: 'Chapter 5',
      title: 'Timing tokens, live.',
      body: (
        <p>
          Durations and easing curves are just CSS custom properties. Drag the sliders and pick a
          curve on the right — every animation driven by{' '}
          <span className="font-mono">--duration-*</span> and{' '}
          <span className="font-mono">--ease-*</span> retimes on its next tick, and so do the real
          buttons and tabs below.
        </p>
      ),
      // The editable MotionLab panel (rendered by the preview shell for this
      // chapter) owns the animated strip + token controls; the focus here is
      // real interactive components that visibly pick up the retimed easing.
      focus: ['buttons', 'nav', 'data'],
      onEnter: () => {
        actions.setDuration('normal', '1400ms');
        actions.setDuration('slow', '2200ms');
      },
    },
    {
      id: 'motion-easing',
      eyebrow: 'Chapter 6',
      title: 'Bezier curves without the guesswork.',
      body: (
        <p>
          A draggable cubic-bezier editor with a live preview dot. The curve token flows through
          every element that uses <span className="font-mono">var(--ease-out)</span> — no hunting
          through class strings.
        </p>
      ),
      focus: ['animations', 'buttons'],
      onEnter: () => {
        actions.setDuration('normal', '900ms');
        actions.setDuration('slow', '1600ms');
        actions.setEasing('out', 'cubic-bezier(0.68, -0.6, 0.32, 1.6)');
        actions.setEasing('in-out', 'cubic-bezier(0.87, 0, 0.13, 1)');
      },
    },
    {
      id: 'diff',
      eyebrow: 'Chapter 7',
      title: 'Every edit becomes a clean diff.',
      body: (
        <p>
          Mintcn re-emits your source files with minimal churn — no unrelated formatting changes.
          The panel on the right is the real diff of everything you just changed while scrolling,
          framed as the GitHub pull request you'd open. Copy it, download a zip, or push the branch.
        </p>
      ),
      // No focus needed — the preview shell swaps the component canvas for the
      // live DiffPreview on this chapter.
      focus: 'all',
    },
    {
      id: 'yours',
      eyebrow: 'Chapter 8',
      title: 'Point it at your repo.',
      body: (
        <p>
          Sign in with GitHub and paste any repo URL — try it on the right. Mintcn reads the
          components, tokens, and overrides straight from your source, public or private, entirely
          in your browser.
        </p>
      ),
      // The preview swaps to the RepoConnect demo for this chapter (see the
      // preview shell), so the focus here is unused.
      focus: ['forms', 'nav'],
      onEnter: actions.resetToFixture,
    },
    {
      id: 'cta',
      eyebrow: "That's it.",
      title: 'Ready to edit yours?',
      body: (
        <p className="text-base text-muted-foreground">
          One last trick: drag the sample image on the right into the palette to sample its colors.
          Mintcn runs entirely in your browser — nothing uploaded, nothing stored. Your token stays
          in your tab.
        </p>
      ),
      // Buttons + badges + data card as the closing tableau. Deliberately
      // excludes the Motion strip — after `yours` reset the fixture defaults,
      // the strip would spin at 200–300ms which reads chaotic on the CTA.
      focus: ['buttons', 'badges', 'data'],
      cta: { label: 'Open the editor →', href: '/' },
    },
  ];
}
