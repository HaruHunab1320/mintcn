import { fixtureOriginals, fixtureProject } from 'virtual:tincture-fixture';
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { changedFiles, emitProject } from '@/codegen';
import {
  buildCommands,
  CommandPalette,
  DiffView,
  downloadProjectZip,
  downloadSingleFile,
  ExportMenu,
  type ExportShape,
  PaletteBar,
  type PanelId,
  PropertyPanel,
  selectFilesForShape,
} from '@/editor';
import { generatePalette } from '@/palette';
import { Canvas, type ForceState, type PreviewTheme } from '@/renderer';
import { useProjectStore } from '@/store/project-store';

const FORCE_STATE_CYCLE: ForceState[] = ['off', 'hover', 'focus-visible', 'active', 'disabled'];

/**
 * Subscribes to the zundo temporal store so header buttons can reflect
 * canUndo / canRedo without polling.
 */
function useTemporal() {
  return useSyncExternalStore(
    (onChange) => useProjectStore.temporal.subscribe(onChange),
    () => useProjectStore.temporal.getState(),
  );
}

export default function App() {
  const document = useProjectStore((s) => s.document);
  const load = useProjectStore((s) => s.load);
  const applyPalette = useProjectStore((s) => s.applyPalette);
  const savePreset = useProjectStore((s) => s.savePreset);
  const temporal = useTemporal();
  const canUndo = temporal.pastStates.length > 0;
  const canRedo = temporal.futureStates.length > 0;
  const [showDiff, setShowDiff] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [theme, setTheme] = useState<PreviewTheme>('light');
  const [forceState, setForceState] = useState<ForceState>('off');

  useEffect(() => {
    load(fixtureProject);
    if (import.meta.env.DEV) {
      (window as unknown as { __TINCTURE_STORE__: typeof useProjectStore }).__TINCTURE_STORE__ =
        useProjectStore;
    }
  }, [load]);

  const emitted = useMemo(() => {
    if (!document) return [];
    return emitProject({ document, originals: fixtureOriginals });
  }, [document]);
  const changed = useMemo(() => changedFiles(emitted), [emitted]);

  const archiveName = document
    ? `${document.meta.name}-${new Date().toISOString().slice(0, 10)}`
    : 'tincture';

  const scrollToPanel = useCallback((id: PanelId) => {
    const el = window.document.querySelector(`[data-panel-id="${id}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const runExportShape = useCallback(
    async (shape: ExportShape) => {
      const selected = selectFilesForShape(emitted, shape);
      if (selected.length === 0) return;
      if (selected.length === 1) downloadSingleFile(selected[0]);
      else await downloadProjectZip(selected, archiveName);
    },
    [emitted, archiveName],
  );

  const generatePaletteFromCurrent = useCallback(() => {
    if (!document) return;
    applyPalette(generatePalette({ strategy: 'monochromatic' }));
  }, [document, applyPalette]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'light' ? 'dark' : 'light'));
  }, []);

  const cycleForceState = useCallback(() => {
    setForceState(
      (s) => FORCE_STATE_CYCLE[(FORCE_STATE_CYCLE.indexOf(s) + 1) % FORCE_STATE_CYCLE.length],
    );
  }, []);

  const savePresetPrompt = useCallback(() => {
    const name = window.prompt('Save current as preset:');
    if (name?.trim()) savePreset(name.trim());
  }, [savePreset]);

  const undo = useCallback(() => useProjectStore.temporal.getState().undo(), []);
  const redo = useCallback(() => useProjectStore.temporal.getState().redo(), []);

  const commands = useMemo(
    () =>
      buildCommands({
        scrollToPanel,
        generatePalette: generatePaletteFromCurrent,
        toggleTheme,
        toggleForceState: cycleForceState,
        openDiff: () => setShowDiff(true),
        exportShape: (shape) => void runExportShape(shape),
        savePresetPrompt,
        undo,
        redo,
      }),
    [
      scrollToPanel,
      generatePaletteFromCurrent,
      toggleTheme,
      cycleForceState,
      runExportShape,
      savePresetPrompt,
      undo,
      redo,
    ],
  );

  // Global keyboard shortcuts:
  //   ⌘K / Ctrl+K → command palette
  //   ⌘Z / Ctrl+Z → undo
  //   ⌘⇧Z / Ctrl+Shift+Z → redo (Ctrl+Y also honored)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      const key = e.key.toLowerCase();
      if (key === 'k') {
        e.preventDefault();
        setPaletteOpen((open) => !open);
        return;
      }
      // Ignore shortcuts fired inside text inputs — users editing a text
      // field expect the native browser undo, not a full document rollback.
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const inTextField =
        tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable === true;
      if (inTextField) return;

      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  return (
    <div className="flex h-screen flex-col bg-neutral-950 text-neutral-100">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-neutral-800 px-6 py-4">
        <div>
          <h1 className="text-lg font-medium tracking-tight">Tincture</h1>
          <p className="text-sm text-neutral-400">
            {document
              ? `${document.meta.name} · ${document.meta.baseColor} · ${document.components.length} components`
              : 'Loading fixture…'}
          </p>
        </div>
        {document ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="inline-flex items-center gap-2 rounded-md border border-neutral-700 px-3 py-1.5 text-xs text-neutral-200 hover:border-neutral-500"
            >
              <span>Search</span>
              <kbd className="rounded border border-neutral-700 px-1 text-[10px] text-neutral-400">
                ⌘K
              </kbd>
            </button>
            <div className="inline-flex overflow-hidden rounded-md border border-neutral-700">
              <button
                type="button"
                onClick={undo}
                disabled={!canUndo}
                aria-label="Undo"
                title="Undo (⌘Z)"
                className="border-r border-neutral-700 px-2 py-1.5 text-xs text-neutral-200 enabled:hover:bg-neutral-900 disabled:opacity-40"
              >
                ↶
              </button>
              <button
                type="button"
                onClick={redo}
                disabled={!canRedo}
                aria-label="Redo"
                title="Redo (⌘⇧Z)"
                className="px-2 py-1.5 text-xs text-neutral-200 enabled:hover:bg-neutral-900 disabled:opacity-40"
              >
                ↷
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowDiff(true)}
              className="inline-flex items-center gap-2 rounded-md border border-neutral-700 px-3 py-1.5 text-xs text-neutral-200 hover:border-neutral-500"
            >
              <span>Diff</span>
              {changed.length > 0 ? (
                <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-900">
                  {changed.length}
                </span>
              ) : null}
            </button>
            <ExportMenu files={emitted} archiveName={archiveName} />
          </div>
        ) : null}
      </header>
      {document ? (
        <div className="flex flex-1 overflow-hidden">
          <main className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
            <PaletteBar document={document} />
            <Canvas
              document={document}
              theme={theme}
              onThemeChange={setTheme}
              forceState={forceState}
              onForceStateChange={setForceState}
            />
          </main>
          <div className="flex h-full shrink-0 border-l border-neutral-800">
            <PropertyPanel document={document} />
          </div>
        </div>
      ) : (
        <main className="p-6 text-sm text-neutral-500">Loading…</main>
      )}
      {showDiff ? <DiffView files={emitted} onClose={() => setShowDiff(false)} /> : null}
      <CommandPalette
        commands={commands}
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
      />
    </div>
  );
}
