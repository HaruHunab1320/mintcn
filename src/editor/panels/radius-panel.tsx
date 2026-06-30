import type { ProjectDocument } from '@/schema';
import { useProjectStore } from '@/store/project-store';
import { PanelSection } from '../panel-section';

interface RadiusPanelProps {
  document: ProjectDocument;
}

/**
 * Single editor for `--radius`. The sm/md/lg/xl scale is derived from it via
 * the emitted @theme inline calc() expressions and is shown here read-only.
 */
export function RadiusPanel({ document }: RadiusPanelProps) {
  const setRadius = useProjectStore((s) => s.setRadius);
  const base = document.tokens.radius.base;
  const numericRem = Number.parseFloat(base.replace(/rem$/, ''));
  const isRem = base.endsWith('rem');

  return (
    <PanelSection panelId="radius" title="Radius" description="--radius drives the rounded-* scale">
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={0}
          max={1.5}
          step={0.025}
          value={isRem && Number.isFinite(numericRem) ? numericRem : 0.5}
          onChange={(e) => setRadius(`${e.target.value}rem`)}
          className="flex-1 accent-neutral-200"
        />
        <input
          type="text"
          value={base}
          onChange={(e) => setRadius(e.target.value)}
          className="w-24 rounded border border-neutral-800 bg-neutral-950 px-2 py-1 font-mono text-xs text-neutral-100 outline-none focus:border-neutral-600"
        />
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1 font-mono text-[11px] text-neutral-500">
        <div className="flex items-center justify-between">
          <dt>--radius-sm</dt>
          <dd>calc({base} - 4px)</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt>--radius-md</dt>
          <dd>calc({base} - 2px)</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt>--radius-lg</dt>
          <dd>{base}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt>--radius-xl</dt>
          <dd>calc({base} + 4px)</dd>
        </div>
      </dl>
    </PanelSection>
  );
}
