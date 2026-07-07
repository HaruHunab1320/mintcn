import { fixtureOriginals, fixtureProject } from 'virtual:mintcn-fixture';
import { useEffect, useMemo } from 'react';
import { useProjectStore } from '@/store/project-store';
import { buildChapters, type ChapterActions } from './chapters';
import { PreviewShell } from './preview-shell';
import { ScrollChapters } from './scroll-chapters';

/**
 * The `/learn` route: split-screen marketing lander that demonstrates Mintcn
 * by driving the live editor state as the visitor scrolls.
 *
 * Left column: scrolling chapters. Each chapter's onEnter dispatches store
 * actions (`applyTheme`, `setTokenColor`, `setVariantClass`) so the visitor
 * sees the app react in real time to what they're reading.
 *
 * Right column: sticky live preview. This is a compact composition of the
 * same Canvas + PaletteBar the editor uses, wired to the same Zustand store,
 * so the demo IS the tool, not a render of it.
 *
 * The Landing owns the fixture reset lifecycle: it loads a clean fixture on
 * mount so demo actions have a predictable starting point, and it also runs
 * a reset on unmount so navigating from /learn → / doesn't leak the demo
 * state into the user's editor session.
 */
export function Landing() {
  const load = useProjectStore((s) => s.load);
  const applyTheme = useProjectStore((s) => s.applyTheme);
  const setTokenColor = useProjectStore((s) => s.setTokenColor);
  const setVariantClass = useProjectStore((s) => s.setVariantClass);
  const setRadius = useProjectStore((s) => s.setRadius);

  // Reset on mount so the demo starts from the fixture, no matter where the
  // visitor came from. Reset on unmount so returning to /editor is clean.
  useEffect(() => {
    load(fixtureProject, fixtureOriginals);
    return () => {
      load(fixtureProject, fixtureOriginals);
    };
  }, [load]);

  const actions = useMemo<ChapterActions>(
    () => ({
      resetToFixture: () => load(fixtureProject, fixtureOriginals),
      applyTheme,
      setTokenColor,
      setVariantClass,
      setRadius,
    }),
    [load, applyTheme, setTokenColor, setVariantClass, setRadius],
  );

  const chapters = useMemo(() => buildChapters(actions), [actions]);

  return (
    <div className="grid h-screen grid-cols-1 bg-background text-foreground lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <ScrollChapters chapters={chapters} />
      <PreviewShell />
    </div>
  );
}
