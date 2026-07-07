import { useCallback, useEffect, useRef, useState } from 'react';
import type { Chapter } from './chapters';

interface ScrollChaptersProps {
  chapters: Chapter[];
  activeId?: string;
  onActiveChange?: (id: string) => void;
}

/**
 * Scrolling column of Landing chapters + an IntersectionObserver that fires
 * `chapter.onEnter` once when a chapter's card enters the middle of the
 * viewport. Runs onEnter at most once per crossing so that gentle scroll
 * corrections don't spam store dispatches.
 */
export function ScrollChapters({
  chapters,
  activeId: controlledActiveId,
  onActiveChange,
}: ScrollChaptersProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chapterRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [uncontrolledActiveId, setUncontrolledActiveId] = useState<string>(chapters[0]?.id ?? '');
  const activeId = controlledActiveId ?? uncontrolledActiveId;
  const setActiveId = useCallback(
    (id: string) => {
      if (onActiveChange) onActiveChange(id);
      else setUncontrolledActiveId(id);
    },
    [onActiveChange],
  );
  // Track the last chapter that fired onEnter so we don't spam dispatches
  // for tiny scroll corrections that stay inside a chapter's active zone.
  // We do NOT gate on a fire-once set — scrolling back up should replay
  // earlier chapters (the whole point of the demo being reversible).
  const lastFiredRef = useRef<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const id = entry.target.getAttribute('data-chapter-id');
          if (!id) continue;
          setActiveId(id);
          if (id === lastFiredRef.current) continue;
          lastFiredRef.current = id;
          const chapter = chapters.find((c) => c.id === id);
          chapter?.onEnter?.();
        }
      },
      {
        root: container,
        // Fire when the chapter's midpoint is roughly at the viewport middle.
        rootMargin: '-40% 0px -40% 0px',
        threshold: 0,
      },
    );

    for (const el of chapterRefs.current.values()) observer.observe(el);
    return () => observer.disconnect();
  }, [chapters, setActiveId]);

  return (
    <div
      ref={containerRef}
      className="flex flex-col overflow-y-auto bg-sidebar text-sidebar-foreground"
    >
      <header className="flex items-center justify-between border-b border-sidebar-border bg-sidebar px-8 py-4">
        <a href="/" className="font-mono text-sm font-medium">
          mintcn
        </a>
        <nav className="flex items-center gap-4 text-xs text-muted-foreground">
          <a
            href="https://github.com/HaruHunab1320/mintcn"
            target="_blank"
            rel="noreferrer"
            className="hover:text-sidebar-foreground"
          >
            GitHub
          </a>
          <a
            href="/"
            className="rounded-md border border-sidebar-border px-3 py-1.5 text-sidebar-foreground hover:border-ring"
          >
            Open editor →
          </a>
        </nav>
      </header>

      <ol className="flex flex-col">
        {chapters.map((chapter, i) => (
          <li
            key={chapter.id}
            data-chapter-id={chapter.id}
            data-active={chapter.id === activeId ? '' : undefined}
            ref={(el) => {
              if (el) chapterRefs.current.set(chapter.id, el);
              else chapterRefs.current.delete(chapter.id);
            }}
            className="flex min-h-[80vh] flex-col justify-center gap-4 px-8 py-16"
          >
            {chapter.eyebrow ? (
              <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                {chapter.eyebrow}
              </span>
            ) : null}
            <h2 className="text-3xl font-medium tracking-tight text-sidebar-foreground">
              {chapter.title}
            </h2>
            <div className="max-w-md text-sm leading-relaxed text-muted-foreground">
              {chapter.body}
            </div>
            {chapter.cta ? (
              <div className="pt-2">
                {chapter.cta.href ? (
                  <a
                    href={chapter.cta.href}
                    onClick={chapter.cta.onClick}
                    className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    {chapter.cta.label}
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={chapter.cta.onClick}
                    className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    {chapter.cta.label}
                  </button>
                )}
              </div>
            ) : null}
            <div className="pt-6 text-[11px] text-muted-foreground/70">
              {i + 1} / {chapters.length}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
