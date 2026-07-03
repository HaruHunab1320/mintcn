import { useEffect, useState } from 'react';
import type { ProjectDocument } from '@/schema';
import { PanelSection } from '../panel-section';

interface ComponentPanelProps {
  document: ProjectDocument;
}

/**
 * Read-only inspector: pick a component, see its cva variant axes, slots,
 * and consumed CSS vars. Override editing is a separate milestone.
 */
export function ComponentPanel({ document }: ComponentPanelProps) {
  const [selectedId, setSelectedId] = useState<string>(document.components[0]?.id ?? '');

  useEffect(() => {
    if (!document.components.find((c) => c.id === selectedId)) {
      setSelectedId(document.components[0]?.id ?? '');
    }
  }, [document.components, selectedId]);

  const selected = document.components.find((c) => c.id === selectedId);

  return (
    <PanelSection panelId="component" title="Component" description="Inspect variants & slots">
      <select
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-input"
      >
        {document.components.map((c) => (
          <option key={c.id} value={c.id}>
            {c.id}
          </option>
        ))}
      </select>

      {selected ? (
        <div className="flex flex-col gap-3 text-[11px] text-muted-foreground">
          <div>
            <p className="text-muted-foreground">source</p>
            <p className="font-mono text-foreground/90">{selected.source.path}</p>
          </div>

          {selected.variants.length > 0 ? (
            <div>
              <p className="text-muted-foreground">variants</p>
              <div className="flex flex-col gap-1 pt-1">
                {selected.variants.map((axis) => (
                  <div
                    key={axis.name}
                    className="rounded border border-border bg-card/60 px-2 py-1.5"
                  >
                    <p className="font-mono text-foreground/90">{axis.name}</p>
                    <p className="text-muted-foreground">
                      {axis.options
                        .map((opt) => (opt === axis.default ? `[${opt}]` : opt))
                        .join(' · ')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">No cva variants.</p>
          )}

          {selected.slots.length > 0 ? (
            <div>
              <p className="text-muted-foreground">slots</p>
              <p className="font-mono text-foreground/90">
                {selected.slots.map((s) => s.name).join(', ')}
              </p>
            </div>
          ) : null}

          {selected.consumes.cssVars.length > 0 ? (
            <div>
              <p className="text-muted-foreground">consumes</p>
              <p className="font-mono text-foreground/90 break-all">
                {selected.consumes.cssVars.join(' · ')}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </PanelSection>
  );
}
