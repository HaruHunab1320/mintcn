import type { ReactNode } from 'react';
import type { ProjectDocument } from '@/schema';
import { tokensToCssVars } from './token-style';

export type PreviewTheme = 'light' | 'dark';

export interface PreviewRootProps {
  document: ProjectDocument;
  theme: PreviewTheme;
  children: ReactNode;
  className?: string;
  /** Force a pseudo-state on every descendant. Wired via use-force-state.ts. */
  forceState?: 'off' | 'hover' | 'focus-visible' | 'active' | 'disabled';
}

/**
 * Live-preview root: applies the current TokenState as inline CSS custom
 * properties on a wrapper div so child components reflect token edits
 * without any recompile. Toggles the `.dark` class when theme === 'dark' so
 * shadcn's `@custom-variant dark (&:is(.dark *))` utilities resolve too.
 *
 * The bytes the preview applies are the same ones `emit-theme-css` writes
 * for each token, so what you see here is what you'll export.
 */
export function PreviewRoot({
  document,
  theme,
  children,
  className,
  forceState = 'off',
}: PreviewRootProps) {
  const vars = tokensToCssVars(document, theme);
  const composed = ['mintcn-preview', theme === 'dark' ? 'dark' : '', className]
    .filter(Boolean)
    .join(' ');
  return (
    <div
      data-theme={theme}
      data-force-state={forceState === 'off' ? undefined : forceState}
      style={vars}
      className={`${composed} bg-background text-foreground`}
    >
      {children}
    </div>
  );
}
