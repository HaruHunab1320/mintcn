import { useState } from 'react';
import type { ProjectDocument } from '@/schema';
import { useProjectStore } from '@/store/project-store';
import { DEFAULT_LAYER, parseBoxShadow, type ShadowLayer, serializeBoxShadow } from '../box-shadow';
import { PanelSection } from '../panel-section';

interface ShadowPanelProps {
  document: ProjectDocument;
}

interface LayerEditorProps {
  shadowName: string;
  layers: ShadowLayer[];
  layerIndex: number;
  onChange: (next: ShadowLayer[]) => void;
}

function LayerEditor({ shadowName, layers, layerIndex, onChange }: LayerEditorProps) {
  const layer = layers[layerIndex];

  const updateLayer = (patch: Partial<ShadowLayer>) => {
    const next = layers.slice();
    next[layerIndex] = { ...layer, ...patch };
    onChange(next);
  };
  const removeLayer = () => {
    onChange(layers.filter((_, i) => i !== layerIndex));
  };
  const duplicateLayer = () => {
    onChange([...layers.slice(0, layerIndex + 1), { ...layer }, ...layers.slice(layerIndex + 1)]);
  };

  // Numeric fields strip the unit on edit + re-append `px` on commit so the
  // user only types numbers. `0` (unitless) stays unitless.
  const numericField = (key: 'x' | 'y' | 'blur' | 'spread', label: string) => {
    const raw = layer[key];
    const display = raw.replace(/[a-z%]+$/i, '');
    return (
      <label className="flex flex-col gap-0.5">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
        <input
          type="number"
          step={1}
          aria-label={`${shadowName} layer ${layerIndex} ${key}`}
          value={display}
          onChange={(e) => {
            const v = e.target.value;
            updateLayer({ [key]: v === '' ? '0' : v === '0' ? '0' : `${v}px` });
          }}
          className="w-full rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[11px] text-foreground outline-none focus:border-input"
        />
      </label>
    );
  };

  return (
    <fieldset
      aria-label={`shadow ${shadowName} layer ${layerIndex + 1}`}
      className="flex flex-col gap-2 rounded-md border border-border bg-card/40 p-2 min-w-0"
    >
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="font-mono">layer {layerIndex + 1}</span>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-muted-foreground">
            <input
              type="checkbox"
              checked={layer.inset}
              onChange={(e) => updateLayer({ inset: e.target.checked })}
              className="accent-foreground"
            />
            inset
          </label>
          <button
            type="button"
            onClick={duplicateLayer}
            className="text-muted-foreground hover:text-foreground"
          >
            duplicate
          </button>
          <button
            type="button"
            onClick={removeLayer}
            className="text-muted-foreground hover:text-red-400"
          >
            remove
          </button>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {numericField('x', 'X')}
        {numericField('y', 'Y')}
        {numericField('blur', 'Blur')}
        {numericField('spread', 'Spread')}
      </div>
      <label className="flex flex-col gap-0.5">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Color</span>
        <input
          type="text"
          aria-label={`${shadowName} layer ${layerIndex} color`}
          value={layer.color}
          onChange={(e) => updateLayer({ color: e.target.value })}
          className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[11px] text-foreground outline-none focus:border-input"
        />
      </label>
    </fieldset>
  );
}

interface ShadowEditorProps {
  name: string;
  value: string;
  onChange: (next: string) => void;
  onRemove: () => void;
}

function ShadowEditor({ name, value, onChange, onRemove }: ShadowEditorProps) {
  const layers = parseBoxShadow(value);
  const apply = (next: ShadowLayer[]) => {
    onChange(next.length === 0 ? '' : serializeBoxShadow(next));
  };

  return (
    <fieldset
      aria-label={`shadow ${name}`}
      className="flex flex-col gap-2 rounded-md border border-border bg-muted/40 p-2 min-w-0"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] text-foreground/90">--shadow-{name}</span>
        <button
          type="button"
          onClick={onRemove}
          className="text-[10px] text-muted-foreground hover:text-red-400"
        >
          remove
        </button>
      </div>
      <div
        className="flex h-12 items-center justify-center rounded bg-neutral-200"
        style={{ boxShadow: value }}
      >
        <span className="text-[10px] font-medium text-neutral-700">Aa</span>
      </div>
      {layers.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">Empty shadow — add a layer below.</p>
      ) : null}
      {layers.map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: shadow layers have no stable id
        <LayerEditor key={i} shadowName={name} layers={layers} layerIndex={i} onChange={apply} />
      ))}
      <button
        type="button"
        onClick={() => apply([...layers, { ...DEFAULT_LAYER }])}
        className="self-start rounded border border-border px-2 py-1 text-[10px] text-foreground/90 hover:border-ring"
      >
        + add layer
      </button>
    </fieldset>
  );
}

export function ShadowPanel({ document }: ShadowPanelProps) {
  const setShadow = useProjectStore((s) => s.setShadow);
  const removeShadow = useProjectStore((s) => s.removeShadow);
  const [newName, setNewName] = useState('');

  const shadows = document.tokens.shadows;
  const names = Object.keys(shadows);

  return (
    <PanelSection
      panelId="shadows"
      title="Shadows"
      description="--shadow-* tokens · per-layer editor"
    >
      {names.length === 0 ? (
        <p className="text-xs text-muted-foreground">No shadow tokens defined.</p>
      ) : null}
      {names.map((name) => (
        <ShadowEditor
          key={name}
          name={name}
          value={shadows[name]}
          onChange={(next) => setShadow(name, next)}
          onRemove={() => removeShadow(name)}
        />
      ))}
      <div className="flex items-center gap-2 border-t border-border pt-2">
        <input
          type="text"
          placeholder="new shadow name (e.g. xl)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="flex-1 rounded border border-border bg-background px-2 py-1 font-mono text-[11px] text-foreground outline-none focus:border-input"
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
          className="rounded border border-border px-2 py-1 text-[11px] text-foreground/90 enabled:hover:border-ring disabled:opacity-40"
        >
          add
        </button>
      </div>
    </PanelSection>
  );
}
