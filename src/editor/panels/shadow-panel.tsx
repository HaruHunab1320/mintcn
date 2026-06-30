import { useState } from 'react';
import type { ProjectDocument } from '@/schema';
import { useProjectStore } from '@/store/project-store';
import { PanelSection } from '../panel-section';

interface ShadowPanelProps {
  document: ProjectDocument;
}

export function ShadowPanel({ document }: ShadowPanelProps) {
  const setShadow = useProjectStore((s) => s.setShadow);
  const removeShadow = useProjectStore((s) => s.removeShadow);
  const [newName, setNewName] = useState('');

  const shadows = document.tokens.shadows;
  const names = Object.keys(shadows);

  return (
    <PanelSection panelId="shadows" title="Shadows" description="--shadow-* tokens">
      {names.length === 0 ? (
        <p className="text-xs text-neutral-500">No shadow tokens defined.</p>
      ) : null}
      {names.map((name) => (
        <div key={name} className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11px] text-neutral-400">
            <span className="font-mono">--shadow-{name}</span>
            <button
              type="button"
              onClick={() => removeShadow(name)}
              className="text-neutral-500 hover:text-red-400"
            >
              remove
            </button>
          </div>
          <input
            type="text"
            value={shadows[name]}
            onChange={(e) => setShadow(name, e.target.value)}
            className="rounded border border-neutral-800 bg-neutral-950 px-2 py-1 font-mono text-[11px] text-neutral-100 outline-none focus:border-neutral-600"
          />
        </div>
      ))}
      <div className="flex items-center gap-2 border-t border-neutral-800 pt-2">
        <input
          type="text"
          placeholder="new shadow name (e.g. xl)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="flex-1 rounded border border-neutral-800 bg-neutral-950 px-2 py-1 font-mono text-[11px] text-neutral-100 outline-none focus:border-neutral-600"
        />
        <button
          type="button"
          disabled={!newName.trim() || newName in shadows}
          onClick={() => {
            const key = newName.trim();
            if (!key || key in shadows) return;
            setShadow(key, '0 1px 2px 0 rgb(0 0 0 / 0.05)');
            setNewName('');
          }}
          className="rounded border border-neutral-700 px-2 py-1 text-[11px] text-neutral-300 enabled:hover:border-neutral-500 disabled:opacity-40"
        >
          add
        </button>
      </div>
    </PanelSection>
  );
}
