import type { ReactNode } from 'react';
import { CURATED_THEMES, themeToSpec } from '@/editor/theme-gallery-data';
import type { PreviewTheme, ShowcaseFocusInput } from '@/renderer';
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
   * Which showcase section(s) the right-hand preview should show. Mostly moot
   * now that the tour chapters render the maximalist gallery, but kept for the
   * few chapters that still drive the category showcase.
   */
  focus?: ShowcaseFocusInput;
  /** Preferred preview canvas mode — dark themes (neon/terminal) read best dark. */
  preview?: PreviewTheme;
  /** Runs once each time the chapter scrolls into view. */
  onEnter?: () => void;
  /** Optional inline call-to-action rendered under the body. */
  cta?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

// Preresolved maximalist theme specs (deterministic → the tour looks the same
// every scroll). Each `themeToSpec` bundle carries palette + radius + shadows +
// font + interaction state + the cva-variant overrides that make the look wild.
function specById(id: string) {
  const theme = CURATED_THEMES.find((t) => t.id === id);
  if (!theme) throw new Error(`Landing: missing curated theme "${id}"`);
  return themeToSpec(theme);
}
const GLASS = specById('aurora-glass');
const NEON = specById('neon-arcade');
const VAPOR = specById('vaporwave');
const BRUTAL = specById('brutalist-pop');
const CLAY = specById('claymorphism');
const TERMINAL = specById('terminal-green');

// The brutalist button, expressed as a replaceWith string so the overrides
// chapter can surface it in the editable callout — the exact classes behind
// the look, live-editable. Must stay literal so Tailwind emits the utilities.
const BRUTAL_BUTTON =
  'rounded-none border-2 border-black bg-[#3b2cf5] text-white font-bold uppercase tracking-wide shadow-[6px_6px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0_0_#000]';
const BUTTON_DEFAULT_ORIGINAL = 'bg-primary text-primary-foreground hover:bg-primary/90';

/**
 * The scripted /learn tour. Every content chapter reskins the ENTIRE preview
 * with a distinct maximalist theme as it scrolls in — glass, neon, vaporwave,
 * brutalist, clay, terminal — so the visitor watches the same components morph
 * through radically different design languages. Each chapter's copy teaches the
 * lever that theme leans on hardest, and the interactive panels (palette bar,
 * motion lab, override callout, theme switcher) layer on top where they fit.
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
          <p className="text-sm text-muted-foreground">
            Scroll — every chapter reskins the whole app in front of you ↓
          </p>
        </>
      ),
      preview: 'light',
      onEnter: () => {
        // Clean shadcn baseline, so the first scroll is a dramatic before→after.
        actions.resetToFixture();
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
          Watch every card, border, and button repaint at once — glassy gradients, pillowy radii,
          buttons that float. Same components you started with, an entirely new skin. That's the
          tool proving its own point.
        </p>
      ),
      preview: 'light',
      onEnter: () => actions.applyTheme(GLASS),
    },
    {
      id: 'themes',
      eyebrow: 'Chapter 2',
      title: 'A theme is more than a palette.',
      body: (
        <p>
          One click flips shape, shadow, motion, font, and the canvas to dark — here, a neon arcade.
          Curated themes lock five key colors and derive the rest, then layer on the radius, glow,
          and circular buttons that make the vibe read instantly.
        </p>
      ),
      preview: 'dark',
      onEnter: () => actions.applyTheme(NEON),
    },
    {
      id: 'palette',
      eyebrow: 'Chapter 3',
      title: 'Hand-paint the five that matter.',
      body: (
        <p>
          The five key colors on the right seed the entire scheme. Nudge one, hit generate, or drop
          an image to sample — the whole vaporwave cascade re-derives across every component in real
          time.
        </p>
      ),
      preview: 'dark',
      onEnter: () => actions.applyTheme(VAPOR),
    },
    {
      id: 'overrides',
      eyebrow: 'Chapter 4',
      title: 'Every wild button is just a class string.',
      body: (
        <p>
          None of this is bespoke CSS. Each override targets one cva variant with the exact Tailwind
          classes you want — read the string powering this brutalist button on the right, and edit
          it live.
        </p>
      ),
      preview: 'light',
      onEnter: () => {
        actions.applyTheme(BRUTAL);
        // Re-express the primary button as an editable replaceWith so the
        // override callout can surface + edit the exact classes.
        actions.setVariantClass(
          'button',
          'variant',
          'default',
          BRUTAL_BUTTON,
          BUTTON_DEFAULT_ORIGINAL,
        );
      },
    },
    {
      id: 'motion-duration',
      eyebrow: 'Chapter 5',
      title: 'Timing tokens, live.',
      body: (
        <p>
          Durations and easing curves are just CSS custom properties. Drag the sliders on the right
          — every animation driven by <span className="font-mono">--duration-*</span> and{' '}
          <span className="font-mono">--ease-*</span> retimes on its next tick, right down to the
          clay UI's soft press.
        </p>
      ),
      preview: 'light',
      onEnter: () => {
        actions.applyTheme(CLAY);
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
          through class strings, phosphor glow included.
        </p>
      ),
      preview: 'dark',
      onEnter: () => {
        actions.applyTheme(TERMINAL);
        actions.setDuration('normal', '900ms');
        actions.setDuration('slow', '1600ms');
        actions.setEasing('out', 'cubic-bezier(0.68, -0.6, 0.32, 1.6)');
        actions.setEasing('in-out', 'cubic-bezier(0.87, 0, 0.13, 1)');
      },
    },
    {
      id: 'maximal',
      eyebrow: 'Chapter 7',
      title: 'Now you drive.',
      body: (
        <p>
          You've watched six reskins scroll by — every one a bundle of tokens and overrides. Take
          the wheel: click a preset, or roll the dice for a brand-new UI experience. Palette, shape,
          shadow, motion, all of it, and every pixel ships in the diff.
        </p>
      ),
      preview: 'light',
    },
    {
      id: 'test',
      eyebrow: 'Chapter 8',
      title: 'Test it like it ships.',
      body: (
        <p>
          Before you open a PR, poke it. Check every breakpoint with the width toggle, force{' '}
          <span className="font-mono">hover</span>, <span className="font-mono">focus</span>, and{' '}
          <span className="font-mono">active</span> without chasing your cursor, and confirm light
          and dark both hold up — all from the panel on the right, exactly like the editor's canvas
          header.
        </p>
      ),
      preview: 'light',
      onEnter: () => actions.applyTheme(GLASS),
    },
    {
      id: 'diff',
      eyebrow: 'Chapter 9',
      title: 'Every edit becomes a clean diff.',
      body: (
        <p>
          Mintcn re-emits your source files with minimal churn — no unrelated formatting changes.
          The panel on the right is the real diff of everything you just rolled through, framed as
          the GitHub pull request you'd open. Copy it, download a zip, or push the branch.
        </p>
      ),
      preview: 'light',
    },
    {
      id: 'yours',
      eyebrow: 'Chapter 10',
      title: 'Point it at your repo.',
      body: (
        <p>
          Sign in with GitHub and paste any repo URL — try it on the right. Mintcn reads the
          components, tokens, and overrides straight from your source, public or private, entirely
          in your browser.
        </p>
      ),
      preview: 'light',
      onEnter: actions.resetToFixture,
    },
    {
      id: 'cta',
      eyebrow: "That's it.",
      title: 'Ready to edit yours?',
      body: (
        <p className="text-base text-muted-foreground">
          One last trick: drag the sample image on the right into the palette to recolor everything.
          Mintcn runs entirely in your browser — nothing uploaded, nothing stored. Your token stays
          in your tab.
        </p>
      ),
      preview: 'light',
      onEnter: () => actions.applyTheme(GLASS),
      cta: { label: 'Open the editor →', href: '/' },
    },
  ];
}
