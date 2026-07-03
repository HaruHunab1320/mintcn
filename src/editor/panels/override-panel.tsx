import { useEffect, useMemo, useState } from 'react';
import type { ComponentMeta, ProjectDocument } from '@/schema';
import { useProjectStore } from '@/store/project-store';
import { type Breakpoint, BREAKPOINTS, joinByBreakpoint, splitByBreakpoint } from '../breakpoints';
import { PanelSection } from '../panel-section';

interface OverridePanelProps {
  document: ProjectDocument;
}

interface VariantOptionEditorProps {
  component: ComponentMeta;
  axis: string;
  option: string;
  original: string;
  current: string;
  isOverridden: boolean;
}

const BREAKPOINT_LABELS: Record<Breakpoint, string> = {
  base: 'Base',
  sm: 'sm',
  md: 'md',
  lg: 'lg',
  xl: 'xl',
  '2xl': '2xl',
};

function VariantOptionEditor({
  component,
  axis,
  option,
  original,
  current,
  isOverridden,
}: VariantOptionEditorProps) {
  const setVariantClass = useProjectStore((s) => s.setVariantClass);
  const [draft, setDraft] = useState(current);
  const [activeBreakpoint, setActiveBreakpoint] = useState<Breakpoint>('base');
  useEffect(() => setDraft(current), [current]);

  const buckets = useMemo(() => splitByBreakpoint(draft), [draft]);
  const activeValue = buckets[activeBreakpoint];

  const commit = (nextDraft: string) => {
    if (nextDraft === current) return;
    setVariantClass(component.id, axis, option, nextDraft, original);
  };
  const reset = () => {
    setDraft(original);
    setVariantClass(component.id, axis, option, undefined, original);
  };

  // How many classes exist per bucket — used to badge tabs so users see
  // which breakpoints already have overrides in play.
  const counts = useMemo(() => {
    const out: Record<Breakpoint, number> = { base: 0, sm: 0, md: 0, lg: 0, xl: 0, '2xl': 0 };
    for (const bp of BREAKPOINTS) {
      out[bp] = buckets[bp].split(/\s+/).filter(Boolean).length;
    }
    return out;
  }, [buckets]);

  const updateBreakpoint = (breakpoint: Breakpoint, value: string) => {
    const next = joinByBreakpoint({ ...buckets, [breakpoint]: value });
    setDraft(next);
  };

  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-border bg-card/40 p-2">
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-mono text-foreground">
          {axis}
          <span className="text-muted-foreground"> · </span>
          {option}
        </span>
        {isOverridden ? (
          <button type="button" onClick={reset} className="text-muted-foreground hover:text-foreground">
            reset
          </button>
        ) : (
          <span className="text-muted-foreground/70">original</span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1 border-b border-border pb-1">
        {BREAKPOINTS.map((bp) => (
          <button
            key={bp}
            type="button"
            onClick={() => setActiveBreakpoint(bp)}
            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] transition-colors ${
              bp === activeBreakpoint
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {BREAKPOINT_LABELS[bp]}
            {counts[bp] > 0 ? (
              <span
                className={`rounded px-1 text-[9px] ${
                  bp === activeBreakpoint
                    ? 'bg-muted text-foreground'
                    : 'bg-muted/60 text-muted-foreground'
                }`}
              >
                {counts[bp]}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <textarea
        aria-label={`${component.id} ${axis} ${option} ${activeBreakpoint} classes`}
        value={activeValue}
        onChange={(e) => updateBreakpoint(activeBreakpoint, e.target.value)}
        onBlur={() => commit(draft)}
        spellCheck={false}
        placeholder={
          activeBreakpoint === 'base'
            ? 'flex items-center gap-2 …'
            : `Classes to apply at ≥${activeBreakpoint}. Prefix stripped — write text-sm, not ${activeBreakpoint}:text-sm.`
        }
        className="min-h-[52px] resize-y rounded border border-border bg-background px-2 py-1 font-mono text-[10px] leading-snug text-foreground outline-none focus:border-input"
      />
      {activeBreakpoint !== 'base' ? (
        <p className="text-[10px] text-muted-foreground">
          Applied at the {activeBreakpoint} breakpoint and up. Tailwind's sm:/md:/lg: utilities
          respond to the browser viewport, not the preview canvas width.
        </p>
      ) : null}

      {isOverridden ? (
        <details className="text-[10px] text-muted-foreground">
          <summary className="cursor-pointer">show original</summary>
          <pre className="mt-1 whitespace-pre-wrap break-words font-mono">{original}</pre>
        </details>
      ) : null}
    </div>
  );
}

/**
 * Per-component variant override editor (Path A workhorse). Pick a component,
 * see each cva variant option as an editable class string. Edits flow through
 * `setVariantClass` which stores a `replaceWith` ClassDelta, then
 * `emit-component-source` rewrites the cva on export.
 *
 * Live preview of overrides is intentionally deferred — overrides currently
 * surface via the upcoming diff/export view. Today the panel shows the change
 * structurally so users can author + verify before export.
 */
export function OverridePanel({ document }: OverridePanelProps) {
  const initialId = document.components.find((c) => c.variants.length > 0)?.id ?? '';
  const [selectedId, setSelectedId] = useState<string>(initialId);
  useEffect(() => {
    if (!document.components.find((c) => c.id === selectedId)) {
      setSelectedId(document.components.find((c) => c.variants.length > 0)?.id ?? '');
    }
  }, [document.components, selectedId]);

  const component = document.components.find((c) => c.id === selectedId);
  const override = document.overrides.find((o) => o.componentId === selectedId);

  const editableComponents = document.components.filter((c) => c.variants.length > 0);

  return (
    <PanelSection
      panelId="overrides"
      title="Overrides"
      description="Edit cva variant classes · per-breakpoint · exports via emit-component-source"
    >
      <select
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-input"
      >
        {editableComponents.length === 0 ? <option value="">No cva components</option> : null}
        {editableComponents.map((c) => (
          <option key={c.id} value={c.id}>
            {c.id} ({c.variants.reduce((n, v) => n + v.options.length, 0)} options)
          </option>
        ))}
      </select>

      {!component || component.variants.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          Pick a component with cva variants to start editing.
        </p>
      ) : null}

      {component?.variants.map((axis) => (
        <div key={axis.name} className="flex flex-col gap-2 pt-1">
          <p className="font-mono text-[11px] text-muted-foreground">{axis.name}</p>
          {axis.options.map((option) => {
            const key = `${axis.name}.${option}`;
            const original = component.variantClasses?.[key] ?? '';
            const overridden = override?.variants?.[axis.name]?.[option]?.replaceWith;
            const current = overridden ?? original;
            return (
              <VariantOptionEditor
                key={option}
                component={component}
                axis={axis.name}
                option={option}
                original={original}
                current={current}
                isOverridden={overridden !== undefined}
              />
            );
          })}
        </div>
      ))}
    </PanelSection>
  );
}
