import { useProjectStore } from '@/store/project-store';

interface OverrideCalloutProps {
  /**
   * Whether the callout should show. Tied to the active chapter so it only
   * appears on the "overrides" chapter — otherwise a lingering
   * `document.overrides` entry (which persists until the reset chapter
   * further down) keeps the callout on screen past the point where it's
   * meaningful.
   */
  visible: boolean;
}

/**
 * Editable annotation shown on the /learn preview during the overrides
 * chapter. Reads the active class-string rewrite from `document.overrides`
 * and lets the visitor mutate it — typing in the textarea dispatches
 * `setVariantClass`, so the shadcn Button reshapes as they type. Makes the
 * invisible edit visible AND puts the tool in the visitor's hands.
 */
export function OverrideCallout({ visible }: OverrideCalloutProps) {
  const document = useProjectStore((s) => s.document);
  const setVariantClass = useProjectStore((s) => s.setVariantClass);
  if (!visible || !document) return null;

  const rows: {
    key: string;
    componentId: string;
    axis: string;
    option: string;
    label: string;
    classString: string;
    originalString: string;
  }[] = [];
  for (const ov of document.overrides) {
    if (!ov.variants) continue;
    const component = document.components.find((c) => c.id === ov.componentId);
    for (const [axis, options] of Object.entries(ov.variants)) {
      for (const [option, delta] of Object.entries(options)) {
        if (delta.replaceWith === undefined) continue;
        const original = component?.variantClasses?.[`${axis}.${option}`] ?? '';
        rows.push({
          key: `${ov.componentId}.${axis}.${option}`,
          componentId: ov.componentId,
          axis,
          option,
          label: `${ov.componentId}.${axis}.${option}`,
          classString: delta.replaceWith,
          originalString: original,
        });
      }
    }
  }
  if (rows.length === 0) return null;

  return (
    <aside
      aria-label="Active overrides"
      className="absolute right-4 top-4 z-10 flex max-w-[26rem] flex-col gap-2 rounded-md border border-border bg-card/95 p-3 text-[11px] shadow-sm backdrop-blur"
    >
      <header className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
        editable override — type to remix
      </header>
      <ul className="flex flex-col gap-2">
        {rows.map((r) => (
          <li key={r.key} className="flex flex-col gap-1">
            <span className="font-mono text-[10px] text-muted-foreground">{r.label}</span>
            <textarea
              value={r.classString}
              aria-label={`${r.label} class string`}
              spellCheck={false}
              onChange={(e) =>
                setVariantClass(r.componentId, r.axis, r.option, e.target.value, r.originalString)
              }
              className="min-h-[3.25rem] resize-y rounded border border-border bg-muted px-2 py-1 font-mono text-[10px] leading-relaxed text-foreground outline-none focus:border-ring"
            />
          </li>
        ))}
      </ul>
    </aside>
  );
}
