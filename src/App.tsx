import { fixtureOriginals, fixtureProject } from 'virtual:tincture-fixture';
import { useCallback, useEffect, useMemo, useState } from 'react';
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

export default function App() {
  const document = useProjectStore((s) => s.document);
  const load = useProjectStore((s) => s.load);
  const applyPalette = useProjectStore((s) => s.applyPalette);
  const savePreset = useProjectStore((s) => s.savePreset);
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
      }),
    [
      scrollToPanel,
      generatePaletteFromCurrent,
      toggleTheme,
      cycleForceState,
      runExportShape,
      savePresetPrompt,
    ],
  );

  // ⌘K / Ctrl+K toggles the command palette anywhere on the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
