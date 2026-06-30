import { useState } from 'react';
import type { ProjectDocument } from '@/schema';
import { useProjectStore } from '@/store/project-store';
import { PanelSection } from '../panel-section';

interface PresetPanelProps {
  document: ProjectDocument;
}

/**
 * Named theme snapshots. Saving captures the current TokenState (and any
 * active overrides) into doc.presets; loading swaps the document back to that
 * snapshot in one shot, so every panel value + the canvas update together.
 */
export function PresetPanel({ document }: PresetPanelProps) {
  const savePreset = useProjectStore((s) => s.savePreset);
  const loadPreset = useProjectStore((s) => s.loadPreset);
  const removePreset = useProjectStore((s) => s.removePreset);
  const [newName, setNewName] = useState('');

  const handleSave = () => {
    const name = newName.trim();
    if (!name) return;
    savePreset(name);
    setNewName('');
  };

  return (
    <PanelSection panelId="presets" title="Presets" description="Save + load full theme snapshots">
      {document.presets.length === 0 ? (
        <p className="text-[11px] text-neutral-500">No presets yet.</p>
      ) : null}
      {document.presets.map((preset) => (
        <div
          key={preset.id}
          className="flex items-center justify-between gap-2 rounded-md border border-neutral-800 bg-neutral-950/40 px-2 py-1.5"
        >
          <span className="truncate font-mono text-[11px] text-neutral-200">{preset.name}</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => loadPreset(preset.id)}
              className="rounded border border-neutral-700 px-2 py-0.5 text-[10px] text-neutral-200 hover:border-neutral-500"
            >
              load
            </button>
            <button
              type="button"
              onClick={() => removePreset(preset.id)}
              className="text-[10px] text-neutral-500 hover:text-red-400"
            >
              remove
            </button>
          </div>
        </div>
      ))}
      <div className="flex items-center gap-2 border-t border-neutral-800 pt-2">
        <input
          type="text"
          placeholder="preset name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
          }}
          className="flex-1 rounded border border-neutral-800 bg-neutral-950 px-2 py-1 font-mono text-[11px] text-neutral-100 outline-none focus:border-neutral-600"
        />
        <button
          type="button"
          disabled={!newName.trim()}
          onClick={handleSave}
          className="rounded border border-neutral-700 px-2 py-1 text-[11px] text-neutral-300 enabled:hover:border-neutral-500 disabled:opacity-40"
        >
          save
        </button>
      </div>
    </PanelSection>
  );
}
