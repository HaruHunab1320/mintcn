import { useMemo, useState } from 'react';
import { PaletteBar } from '@/editor';
import {
  Canvas,
  type ForceState,
  type PreviewTheme,
  type ShowcaseFocusInput,
  tokensToCssVars,
} from '@/renderer';
import { useProjectStore } from '@/store/project-store';
import { DiffPreview } from './diff-preview';
import { ImageDropDemo } from './image-drop-demo';
import { MotionLab } from './motion-lab';
import { OverrideCallout } from './override-callout';
import { RepoConnect } from './repo-connect';

interface PreviewShellProps {
  focus?: ShowcaseFocusInput;
  /** Show the interactive override callout — set only for the overrides chapter. */
  showOverrideCallout?: boolean;
  /** Show the editable motion panel — set only for the timing chapter. */
  showMotionLab?: boolean;
  /** Swap the component canvas for the live generated diff — set only for the diff chapter. */
  showDiff?: boolean;
  /** Swap the canvas for the repo-connect demo — set only for the "yours" chapter. */
  showRepoConnect?: boolean;
  /** Show the draggable sample-image card above the palette — set only for the CTA chapter. */
  showImageDemo?: boolean;
}

/**
 * Right-half of the /learn page. Composed from the same building blocks the
 * editor uses — PaletteBar + Canvas + hoisted token style — so token edits
 * dispatched by the scrolling chapters visibly repaint the demo.
 *
 * Intentionally smaller than the full editor: no property panel, no header
 * toolbar. The chapters explain what those panels do; this pane is the
 * moving picture that proves it.
 */
export function PreviewShell({
  focus = 'all',
  showOverrideCallout = false,
  showMotionLab = false,
  showDiff = false,
  showRepoConnect = false,
  showImageDemo = false,
}: PreviewShellProps) {
  const document = useProjectStore((s) => s.document);
  const [theme, setTheme] = useState<PreviewTheme>('light');
  const [forceState, setForceState] = useState<ForceState>('off');

  const rootStyle = useMemo(
    () => (document ? tokensToCssVars(document, theme) : undefined),
    [document, theme],
  );

  if (!document) {
    return (
      <section
        aria-label="Live preview"
        className="flex items-center justify-center border-l border-sidebar-border bg-sidebar text-muted-foreground"
      >
        Loading fixture…
      </section>
    );
  }

  return (
    <section
      aria-label="Live preview"
      style={rootStyle}
      className={`relative flex flex-col gap-4 overflow-y-auto border-l border-sidebar-border bg-background p-6 ${
        theme === 'dark' ? 'dark' : ''
      }`}
    >
      <OverrideCallout visible={showOverrideCallout} />
      {showDiff ? (
        <DiffPreview />
      ) : showRepoConnect ? (
        <RepoConnect />
      ) : (
        <>
          {showMotionLab ? <MotionLab visible /> : null}
          {showImageDemo ? <ImageDropDemo /> : null}
          <PaletteBar document={document} />
          <Canvas
            document={document}
            theme={theme}
            onThemeChange={setTheme}
            forceState={forceState}
            onForceStateChange={setForceState}
            focus={focus}
            showFocusControl={false}
          />
        </>
      )}
    </section>
  );
}
