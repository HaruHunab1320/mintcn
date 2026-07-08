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
import { OverrideCallout } from './override-callout';

interface PreviewShellProps {
  focus?: ShowcaseFocusInput;
  /** Show the interactive override callout — set only for the overrides chapter. */
  showOverrideCallout?: boolean;
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
export function PreviewShell({ focus = 'all', showOverrideCallout = false }: PreviewShellProps) {
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
    </section>
  );
}
