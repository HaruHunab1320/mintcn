import { useEffect, useState } from 'react';
import type { ComponentMeta, ProjectDocument } from '@/schema';
import { useProjectStore } from '@/store/project-store';
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

function VariantOptionEditor({
  component,
  axis,
  option,
  original,
  current,
  isOverridden,
}: VariantOptionEditorProps) {
  const setVariantClass = useProjectStore((s) => s.setVariantClass);
  // Local buffer so users can type freely before the store rewrites the value.
  const [draft, setDraft] = useState(current);
  useEffect(() => setDraft(current), [current]);

  const commit = () => {
    if (draft === current) return;
    setVariantClass(component.id, axis, option, draft, original);
  };
  const reset = () => {
    setDraft(original);
    setVariantClass(component.id, axis, option, undefined, original);
  };

  return (
    <div className="flex flex-col gap-1 rounded-md border border-neutral-800 bg-neutral-950/40 p-2">
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-mono text-neutral-200">
          {axis}
          <span className="text-neutral-500"> · </span>
          {option}
        </span>
        {isOverridden ? (
          <button type="button" onClick={reset} className="text-neutral-500 hover:text-neutral-200">
            reset
          </button>
        ) : (
          <span className="text-neutral-600">original</span>
        )}
      </div>
      <textarea
        aria-label={`${component.id} ${axis} ${option} classes`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        spellCheck={false}
        className="min-h-[56px] resize-y rounded border border-neutral-800 bg-neutral-950 px-2 py-1 font-mono text-[10px] leading-snug text-neutral-100 outline-none focus:border-neutral-600"
      />
      {isOverridden ? (
        <details className="text-[10px] text-neutral-500">
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
      description="Edit cva variant classes · exports via emit-component-source"
    >
      <select
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        className="rounded border border-neutral-800 bg-neutral-950 px-2 py-1 text-xs text-neutral-100 outline-none focus:border-neutral-600"
      >
        {editableComponents.length === 0 ? <option value="">No cva components</option> : null}
        {editableComponents.map((c) => (
          <option key={c.id} value={c.id}>
            {c.id} ({c.variants.reduce((n, v) => n + v.options.length, 0)} options)
          </option>
        ))}
      </select>

      {!component || component.variants.length === 0 ? (
        <p className="text-[11px] text-neutral-500">
          Pick a component with cva variants to start editing.
        </p>
      ) : null}

      {component?.variants.map((axis) => (
        <div key={axis.name} className="flex flex-col gap-2 pt-1">
          <p className="font-mono text-[11px] text-neutral-400">{axis.name}</p>
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
