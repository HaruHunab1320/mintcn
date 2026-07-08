import { useProjectStore } from '@/store/project-store';

/**
 * Small floating annotation shown on the /learn preview whenever the doc
 * carries active overrides. Chapter 5 rewrites `button.size.sm`; without
 * this callout the visitor sees the Small button change shape but has no
 * cue that it's because a class string was just rewritten. The chip makes
 * the invisible edit visible.
 *
 * Fixed to the top-right of the preview shell so it doesn't compete with
 * the shadcn showcase for center-stage attention. Auto-hides when there
 * are no overrides, so chapters that don't rewrite variants stay clean.
 */
export function OverrideCallout() {
  const document = useProjectStore((s) => s.document);
  if (!document || document.overrides.length === 0) return null;

  const rows: { key: string; label: string; classString: string }[] = [];
  for (const ov of document.overrides) {
    if (!ov.variants) continue;
    for (const [axis, options] of Object.entries(ov.variants)) {
      for (const [option, delta] of Object.entries(options)) {
        if (delta.replaceWith === undefined) continue;
        rows.push({
          key: `${ov.componentId}.${axis}.${option}`,
          label: `${ov.componentId}.${axis}.${option}`,
          classString: delta.replaceWith,
        });
      }
    }
  }
  if (rows.length === 0) return null;

  return (
    <aside
      aria-label="Active overrides"
      className="pointer-events-none absolute right-4 top-4 z-10 flex max-w-[24rem] flex-col gap-2 rounded-md border border-border bg-card/95 p-3 text-[11px] shadow-sm backdrop-blur"
    >
      <header className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
        override rewritten
      </header>
      <ul className="flex flex-col gap-1.5">
        {rows.map((r) => (
          <li key={r.key} className="flex flex-col gap-0.5">
            <span className="font-mono text-[10px] text-muted-foreground">{r.label}</span>
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] leading-relaxed text-foreground">
              {r.classString}
            </code>
          </li>
        ))}
      </ul>
    </aside>
  );
}
