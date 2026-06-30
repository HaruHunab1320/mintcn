import type { ProjectDocument, StateTokens } from '@/schema';
import { useProjectStore } from '@/store/project-store';
import { PanelSection } from '../panel-section';

const DEFAULTS: StateTokens = {
  hoverOpacity: 0.9,
  focusRingWidth: '3px',
  focusRingOpacity: 0.5,
  activeScale: 0.97,
  disabledOpacity: 0.5,
};

interface NumberRowProps {
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (next: number) => void;
}

function NumberRow({ label, hint, min, max, step, value, onChange }: NumberRowProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between font-mono text-[11px]">
        <span className="text-neutral-400">{label}</span>
        <span className="text-neutral-500">{hint}</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range"
          aria-label={`${label} slider`}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number.parseFloat(e.target.value))}
          className="flex-1 accent-neutral-200"
        />
        <input
          type="number"
          aria-label={label}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => {
            const n = Number.parseFloat(e.target.value);
            if (Number.isFinite(n)) onChange(n);
          }}
          className="w-16 rounded border border-neutral-800 bg-neutral-950 px-1.5 py-0.5 font-mono text-[11px] text-neutral-100 outline-none focus:border-neutral-600"
        />
      </div>
    </div>
  );
}

interface StatePanelProps {
  document: ProjectDocument;
}

/**
 * Edit the interactive-state tokens that drive the force-state preview
 * stylesheet. Edits flow through `setStateToken` so the document gains a
 * `states` block on first write (auto-seeded from defaults) and the force
 * preview reflects every change live because the stylesheet reads the
 * same CSS vars.
 */
export function StatePanel({ document }: StatePanelProps) {
  const setStateToken = useProjectStore((s) => s.setStateToken);
  const s = document.tokens.states ?? DEFAULTS;

  return (
    <PanelSection
      panelId="states"
      title="States"
      description="Drives the FORCE preview · ranges 0–1"
    >
      <NumberRow
        label="hover-opacity"
        hint="0 fully transparent · 1 opaque"
        min={0}
        max={1}
        step={0.01}
        value={s.hoverOpacity}
        onChange={(v) => setStateToken('hoverOpacity', v)}
      />
      <NumberRow
        label="focus-ring-opacity"
        hint="ring color alpha"
        min={0}
        max={1}
        step={0.01}
        value={s.focusRingOpacity}
        onChange={(v) => setStateToken('focusRingOpacity', v)}
      />
      <NumberRow
        label="active-scale"
        hint="press-down scale"
        min={0.8}
        max={1}
        step={0.01}
        value={s.activeScale}
        onChange={(v) => setStateToken('activeScale', v)}
      />
      <NumberRow
        label="disabled-opacity"
        hint="grayed-out alpha"
        min={0}
        max={1}
        step={0.01}
        value={s.disabledOpacity}
        onChange={(v) => setStateToken('disabledOpacity', v)}
      />
      <label className="flex flex-col gap-1 pt-1">
        <span className="font-mono text-[11px] text-neutral-400">focus-ring-width</span>
        <input
          type="text"
          value={s.focusRingWidth}
          onChange={(e) => setStateToken('focusRingWidth', e.target.value)}
          className="rounded border border-neutral-800 bg-neutral-950 px-2 py-1 font-mono text-[11px] text-neutral-100 outline-none focus:border-neutral-600"
        />
      </label>
    </PanelSection>
  );
}
