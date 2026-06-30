import { useState } from 'react';
import type { ProjectDocument } from '@/schema';
import { useProjectStore } from '@/store/project-store';
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

interface AnimationPanelProps {
  document: ProjectDocument;
}

export function AnimationPanel({ document }: AnimationPanelProps) {
  const setDuration = useProjectStore((s) => s.setDuration);
  const removeDuration = useProjectStore((s) => s.removeDuration);
  const setEasing = useProjectStore((s) => s.setEasing);
  const removeEasing = useProjectStore((s) => s.removeEasing);

  const animations = document.tokens.animations ?? { durations: {}, easings: {} };

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
        <RowEditor
          entries={animations.easings}
          prefix="--ease-"
          placeholder="new easing (e.g. out)"
          defaultValue="cubic-bezier(0.16, 1, 0.3, 1)"
          onSet={setEasing}
          onRemove={removeEasing}
        />
      </PanelSection>
    </>
  );
}
