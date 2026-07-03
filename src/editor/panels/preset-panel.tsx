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
        <p className="text-[11px] text-muted-foreground">No presets yet.</p>
      ) : null}
      {document.presets.map((preset) => (
        <div
          key={preset.id}
          className="flex items-center justify-between gap-2 rounded-md border border-border bg-card/40 px-2 py-1.5"
        >
          <span className="truncate font-mono text-[11px] text-foreground">{preset.name}</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => loadPreset(preset.id)}
              className="rounded border border-border px-2 py-0.5 text-[10px] text-foreground hover:border-ring"
            >
              load
            </button>
            <button
              type="button"
              onClick={() => removePreset(preset.id)}
              className="text-[10px] text-muted-foreground hover:text-red-400"
            >
              remove
            </button>
          </div>
        </div>
      ))}
      <div className="flex items-center gap-2 border-t border-border pt-2">
        <input
          type="text"
          placeholder="preset name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
          }}
          className="flex-1 rounded border border-border bg-background px-2 py-1 font-mono text-[11px] text-foreground outline-none focus:border-input"
        />
        <button
          type="button"
          disabled={!newName.trim()}
          onClick={handleSave}
          className="rounded border border-border px-2 py-1 text-[11px] text-foreground/90 enabled:hover:border-ring disabled:opacity-40"
        >
          save
        </button>
      </div>
    </PanelSection>
  );
}
