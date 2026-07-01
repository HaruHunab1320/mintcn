import { useState } from 'react';
import type { ProjectDocument } from '@/schema';
import { useProjectStore } from '@/store/project-store';
import { BezierEditor } from '../bezier-editor';
import {
  type BezierEasing,
  EASING_PRESETS,
  matchPreset,
  parseEasing,
  serializeEasing,
} from '../easing';
import { PanelSection } from '../panel-section';

interface RowEditorProps {
  entries: Record<string, string>;
  prefix: string;
  placeholder: string;
  defaultValue: string;
  onSet: (name: string, value: string) => void;
  onRemove: (name: string) => void;
}

function RowEditor({
  entries,
  prefix,
  placeholder,
  defaultValue,
  onSet,
  onRemove,
}: RowEditorProps) {
  const [newName, setNewName] = useState('');
  const names = Object.keys(entries);

  return (
    <div className="flex flex-col gap-2">
      {names.length === 0 ? <p className="text-[11px] text-neutral-500">No entries yet.</p> : null}
      {names.map((name) => (
        <div key={name} className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11px] text-neutral-400">
            <span className="font-mono">
              {prefix}
              {name}
            </span>
            <button
              type="button"
              onClick={() => onRemove(name)}
              className="text-neutral-500 hover:text-red-400"
            >
              remove
            </button>
          </div>
          <input
            type="text"
            value={entries[name]}
            onChange={(e) => onSet(name, e.target.value)}
            className="rounded border border-neutral-800 bg-neutral-950 px-2 py-1 font-mono text-[11px] text-neutral-100 outline-none focus:border-neutral-600"
          />
        </div>
      ))}
      <div className="flex items-center gap-2 border-t border-neutral-800 pt-2">
        <input
          type="text"
          placeholder={placeholder}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="flex-1 rounded border border-neutral-800 bg-neutral-950 px-2 py-1 font-mono text-[11px] text-neutral-100 outline-none focus:border-neutral-600"
        />
        <button
          type="button"
          disabled={!newName.trim() || newName in entries}
          onClick={() => {
            const key = newName.trim();
            if (!key || key in entries) return;
            onSet(key, defaultValue);
            setNewName('');
          }}
          className="rounded border border-neutral-700 px-2 py-1 text-[11px] text-neutral-300 enabled:hover:border-neutral-500 disabled:opacity-40"
        >
          add
        </button>
      </div>
    </div>
  );
}

interface EasingRowProps {
  name: string;
  value: string;
  onChange: (next: string) => void;
  onRemove: () => void;
}

function EasingRow({ name, value, onChange, onRemove }: EasingRowProps) {
  const parsed = parseEasing(value);
  const preset = matchPreset(value);
  const [expanded, setExpanded] = useState(false);

  return (
    <fieldset
      aria-label={`easing ${name}`}
      className="flex min-w-0 flex-col gap-2 rounded-md border border-neutral-800 bg-neutral-950/40 p-2"
    >
      <div className="flex items-center justify-between text-[11px] text-neutral-400">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 font-mono text-neutral-300"
        >
          <span className="text-neutral-500">{expanded ? '▾' : '▸'}</span>
          --ease-{name}
        </button>
        <div className="flex items-center gap-2">
          {preset ? (
            <span className="rounded bg-neutral-800/60 px-1.5 py-0.5 text-[10px] text-neutral-300">
              {preset.family} · {preset.label}
            </span>
          ) : null}
          <button type="button" onClick={onRemove} className="text-neutral-500 hover:text-red-400">
            remove
          </button>
        </div>
      </div>

      <select
        aria-label={`easing ${name} preset`}
        value={preset?.id ?? '__custom__'}
        onChange={(e) => {
          const next = EASING_PRESETS.find((p) => p.id === e.target.value);
          if (next) onChange(next.value);
        }}
        className="rounded border border-neutral-800 bg-neutral-950 px-2 py-1 text-[11px] text-neutral-100 outline-none focus:border-neutral-600"
      >
        <option value="__custom__" disabled hidden>
          Custom
        </option>
        {(['CSS', 'Material', 'Apple', 'Utility'] as const).map((family) => (
          <optgroup key={family} label={family}>
            {EASING_PRESETS.filter((p) => p.family === family).map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      <input
        type="text"
        aria-label={`easing ${name} value`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        className="rounded border border-neutral-800 bg-neutral-950 px-2 py-1 font-mono text-[11px] text-neutral-100 outline-none focus:border-neutral-600"
      />

      {expanded && parsed.kind === 'cubic-bezier' ? (
        <BezierEditor
          bezier={parsed}
          cssValue={value}
          onChange={(next: BezierEasing) => onChange(serializeEasing(next))}
        />
      ) : null}
      {expanded && parsed.kind !== 'cubic-bezier' ? (
        <p className="text-[11px] text-neutral-500">
          Visual editor available for cubic-bezier() values only. Pick a preset or type a
          cubic-bezier tuple to unlock the drag handles.
        </p>
      ) : null}
    </fieldset>
  );
}

interface AnimationPanelProps {
  document: ProjectDocument;
}

export function AnimationPanel({ document }: AnimationPanelProps) {
  const setDuration = useProjectStore((s) => s.setDuration);
  const removeDuration = useProjectStore((s) => s.removeDuration);
  const setEasing = useProjectStore((s) => s.setEasing);
  const removeEasing = useProjectStore((s) => s.removeEasing);
  const [newEasingName, setNewEasingName] = useState('');

  const animations = document.tokens.animations ?? { durations: {}, easings: {} };
  const easingNames = Object.keys(animations.easings);

  return (
    <>
      <PanelSection
        panelId="durations"
        title="Durations"
        description="--duration-* · Tailwind utilities resolve through these"
      >
        <RowEditor
          entries={animations.durations}
          prefix="--duration-"
          placeholder="new duration (e.g. fast)"
          defaultValue="150ms"
          onSet={setDuration}
          onRemove={removeDuration}
        />
      </PanelSection>
      <PanelSection
        panelId="easings"
        title="Easings"
        description="--ease-* · cubic-bezier or keyword"
      >
        {easingNames.length === 0 ? (
          <p className="text-[11px] text-neutral-500">No easings yet.</p>
        ) : null}
        {easingNames.map((name) => (
          <EasingRow
            key={name}
            name={name}
            value={animations.easings[name]}
            onChange={(next) => setEasing(name, next)}
            onRemove={() => removeEasing(name)}
          />
        ))}
        <div className="flex items-center gap-2 border-t border-neutral-800 pt-2">
          <input
            type="text"
            placeholder="new easing (e.g. out)"
            value={newEasingName}
            onChange={(e) => setNewEasingName(e.target.value)}
            className="flex-1 rounded border border-neutral-800 bg-neutral-950 px-2 py-1 font-mono text-[11px] text-neutral-100 outline-none focus:border-neutral-600"
          />
          <button
            type="button"
            disabled={!newEasingName.trim() || newEasingName in animations.easings}
            onClick={() => {
              const key = newEasingName.trim();
              if (!key || key in animations.easings) return;
              setEasing(key, 'cubic-bezier(0.16, 1, 0.3, 1)');
              setNewEasingName('');
            }}
            className="rounded border border-neutral-700 px-2 py-1 text-[11px] text-neutral-300 enabled:hover:border-neutral-500 disabled:opacity-40"
          >
            add
          </button>
        </div>
      </PanelSection>
    </>
  );
}
