import { useState } from 'react';
import type { KeyframeDefinition, KeyframeStop, ProjectDocument } from '@/schema';
import { useProjectStore } from '@/store/project-store';
import { PanelSection } from '../panel-section';

interface StopEditorProps {
  keyframeName: string;
  stopIndex: number;
  stop: KeyframeStop;
  onRemove: () => void;
}

function StopEditor({ keyframeName, stopIndex, stop, onRemove }: StopEditorProps) {
  const setKeyframeStop = useProjectStore((s) => s.setKeyframeStop);
  const updateKey = (key: string) => setKeyframeStop(keyframeName, stopIndex, { ...stop, key });
  const updateDeclaration = (prop: string, value: string) => {
    setKeyframeStop(keyframeName, stopIndex, {
      ...stop,
      declarations: { ...stop.declarations, [prop]: value },
    });
  };
  const removeDeclaration = (prop: string) => {
    const { [prop]: _removed, ...rest } = stop.declarations;
    setKeyframeStop(keyframeName, stopIndex, { ...stop, declarations: rest });
  };
  const [newProp, setNewProp] = useState('');

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-card/40 p-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          aria-label={`stop ${stopIndex} key`}
          value={stop.key}
          onChange={(e) => updateKey(e.target.value)}
          className="w-20 rounded border border-border bg-background px-2 py-1 font-mono text-[11px] text-foreground outline-none focus:border-input"
        />
        <span className="text-[11px] text-muted-foreground">{'{'}</span>
        <button
          type="button"
          onClick={onRemove}
          className="ml-auto text-[10px] text-muted-foreground hover:text-red-400"
        >
          delete stop
        </button>
      </div>
      <div className="flex flex-col gap-1 pl-3">
        {Object.entries(stop.declarations).map(([prop, value]) => (
          <div key={prop} className="flex items-center gap-1">
            <span className="w-32 truncate font-mono text-[11px] text-muted-foreground">
              {prop}:
            </span>
            <input
              type="text"
              aria-label={`stop ${stopIndex} ${prop}`}
              value={value}
              onChange={(e) => updateDeclaration(prop, e.target.value)}
              className="flex-1 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[11px] text-foreground outline-none focus:border-input"
            />
            <button
              type="button"
              onClick={() => removeDeclaration(prop)}
              className="text-[10px] text-muted-foreground/70 hover:text-red-400"
            >
              ×
            </button>
          </div>
        ))}
        <div className="flex items-center gap-1 pt-1">
          <input
            type="text"
            placeholder="new property"
            value={newProp}
            onChange={(e) => setNewProp(e.target.value)}
            className="flex-1 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[11px] text-foreground outline-none focus:border-input"
          />
          <button
            type="button"
            disabled={!newProp.trim() || newProp in stop.declarations}
            onClick={() => {
              const key = newProp.trim();
              if (!key || key in stop.declarations) return;
              updateDeclaration(key, '');
              setNewProp('');
            }}
            className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground enabled:hover:border-ring disabled:opacity-40"
          >
            +
          </button>
        </div>
      </div>
      <span className="pl-1 text-[11px] text-muted-foreground">{'}'}</span>
    </div>
  );
}

interface KeyframeEditorProps {
  name: string;
  definition: KeyframeDefinition;
}

function KeyframeEditor({ name, definition }: KeyframeEditorProps) {
  const setKeyframeStop = useProjectStore((s) => s.setKeyframeStop);
  const removeKeyframeStop = useProjectStore((s) => s.removeKeyframeStop);
  const removeKeyframe = useProjectStore((s) => s.removeKeyframe);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/40">
      <div className="flex items-center justify-between px-2 py-1.5">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-left font-mono text-[11px] text-foreground"
        >
          <span className="text-muted-foreground">{expanded ? '▾' : '▸'}</span>
          @keyframes {name}
          <span className="text-muted-foreground"> · {definition.stops.length} stops</span>
        </button>
        <button
          type="button"
          onClick={() => removeKeyframe(name)}
          className="text-[10px] text-muted-foreground hover:text-red-400"
        >
          remove
        </button>
      </div>
      {expanded ? (
        <div className="flex flex-col gap-2 px-2 pb-2">
          {definition.stops.map((stop, index) => (
            <StopEditor
              // biome-ignore lint/suspicious/noArrayIndexKey: stops have no stable id; index is fine for this editor
              key={index}
              keyframeName={name}
              stopIndex={index}
              stop={stop}
              onRemove={() => removeKeyframeStop(name, index)}
            />
          ))}
          <button
            type="button"
            onClick={() =>
              setKeyframeStop(name, definition.stops.length, {
                key: '100%',
                declarations: {},
              })
            }
            className="self-start rounded border border-border px-2 py-1 text-[10px] text-foreground/90 hover:border-ring"
          >
            + add stop
          </button>
        </div>
      ) : null}
    </div>
  );
}

interface KeyframePanelProps {
  document: ProjectDocument;
}

export function KeyframePanel({ document }: KeyframePanelProps) {
  const setKeyframe = useProjectStore((s) => s.setKeyframe);
  const [newName, setNewName] = useState('');
  const keyframes = document.tokens.animations?.keyframes ?? {};
  const names = Object.keys(keyframes);

  return (
    <PanelSection
      panelId="keyframes"
      title="Keyframes"
      description="@keyframes blocks · click to expand & edit"
    >
      {names.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">No keyframes defined.</p>
      ) : null}
      {names.map((name) => (
        <KeyframeEditor key={name} name={name} definition={keyframes[name]} />
      ))}
      <div className="flex items-center gap-2 border-t border-border pt-2">
        <input
          type="text"
          placeholder="new keyframe (e.g. spin)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="flex-1 rounded border border-border bg-background px-2 py-1 font-mono text-[11px] text-foreground outline-none focus:border-input"
        />
        <button
          type="button"
          disabled={!newName.trim() || newName in keyframes}
          onClick={() => {
            const key = newName.trim();
            if (!key || key in keyframes) return;
            setKeyframe(key, {
              stops: [
                { key: 'from', declarations: { opacity: '0' } },
                { key: 'to', declarations: { opacity: '1' } },
              ],
            });
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
