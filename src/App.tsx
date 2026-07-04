import { fixtureOriginals, fixtureProject } from 'virtual:tincture-fixture';
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { changedFiles, emitProject } from '@/codegen';
import {
  buildCommands,
  CommandPalette,
  ConnectProject,
  DiffView,
  downloadProjectZip,
  downloadSingleFile,
  ExportMenu,
  type ExportShape,
  PaletteBar,
  type PanelId,
  parsePrimaryFamily,
  preloadFontFamilies,
  PropertyPanel,
  selectFilesForShape,
} from '@/editor';
import { generatePalette } from '@/palette';
import { Canvas, type ForceState, type PreviewTheme, tokensToCssVars } from '@/renderer';
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
  const originals = useProjectStore((s) => s.originals);
  const load = useProjectStore((s) => s.load);
  const resetToInitial = useProjectStore((s) => s.resetToInitial);
  const applyPalette = useProjectStore((s) => s.applyPalette);
  const savePreset = useProjectStore((s) => s.savePreset);
  const temporal = useTemporal();
  const canUndo = temporal.pastStates.length > 0;
  const canRedo = temporal.futureStates.length > 0;
  const [showDiff, setShowDiff] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [theme, setTheme] = useState<PreviewTheme>('light');
  const [forceState, setForceState] = useState<ForceState>('off');

  useEffect(() => {
    load(fixtureProject, fixtureOriginals);
    if (import.meta.env.DEV) {
      (window as unknown as { __TINCTURE_STORE__: typeof useProjectStore }).__TINCTURE_STORE__ =
        useProjectStore;
    }
  }, [load]);

  // Preload the head font of each font-family stack so the preview shows the
  // right typeface immediately after mount — otherwise the browser falls back
  // to system-ui until the user opens the picker.
  useEffect(() => {
    if (!document) return;
    const fam = document.tokens.typography.fontFamily;
    const heads = [fam.sans, fam.serif, fam.mono]
      .map(parsePrimaryFamily)
      .filter((f): f is string => typeof f === 'string' && f.length > 0);
    if (heads.length > 0) preloadFontFamilies(heads);
  }, [document]);

  const emitted = useMemo(() => {
    if (!document) return [];
    return emitProject({ document, originals });
  }, [document, originals]);
  // Hoist the shadcn tokens onto the app root so `bg-background`,
  // `border-border`, `text-foreground` etc. work in the chrome — the whole
  // app becomes a live preview of the current theme.
  const rootStyle = useMemo(
    () => (document ? tokensToCssVars(document, theme) : undefined),
    [document, theme],
  );
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

  const resetToFixture = useCallback(() => {
    load(fixtureProject, fixtureOriginals);
    useProjectStore.temporal.getState().clear();
  }, [load]);

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
        openConnect: () => setConnectOpen(true),
        resetToFixture,
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
      resetToFixture,
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
    <div
      style={rootStyle}
      className={`tincture-chrome flex h-screen flex-col bg-background text-foreground ${
        theme === 'dark' ? 'dark' : ''
      }`}
    >
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-6 py-4 shadow-sm">
        <div>
          <h1 className="text-lg font-medium tracking-tight">Tincture</h1>
          <p className="text-sm text-muted-foreground">
            {document
              ? `${document.meta.name} · ${document.meta.baseColor} · ${document.components.length} components`
              : 'Loading fixture…'}
          </p>
        </div>
        {document ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setConnectOpen(true)}
              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs text-foreground hover:border-ring"
            >
              ⇱ Connect
            </button>
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    'Reset every edit back to the loaded project baseline? This clears all token, override, and preset changes.',
                  )
                ) {
                  resetToInitial();
                }
              }}
              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs text-foreground hover:border-destructive hover:text-destructive"
              title="Discard all edits and restore the loaded project's baseline"
            >
              ↺ Reset
            </button>
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs text-foreground hover:border-ring"
            >
              <span>Search</span>
              <kbd className="rounded border border-border px-1 text-[10px] text-muted-foreground">
                ⌘K
              </kbd>
            </button>
            <div className="inline-flex overflow-hidden rounded-md border border-border">
              <button
                type="button"
                onClick={undo}
                disabled={!canUndo}
                aria-label="Undo"
                title="Undo (⌘Z)"
                className="border-r border-border px-2 py-1.5 text-xs text-foreground enabled:hover:bg-muted disabled:opacity-40"
              >
                ↶
              </button>
              <button
                type="button"
                onClick={redo}
                disabled={!canRedo}
                aria-label="Redo"
                title="Redo (⌘⇧Z)"
                className="px-2 py-1.5 text-xs text-foreground enabled:hover:bg-muted disabled:opacity-40"
              >
                ↷
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowDiff(true)}
              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs text-foreground hover:border-ring"
            >
              <span>Diff</span>
              {changed.length > 0 ? (
                <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
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
          <div className="flex h-full shrink-0 border-l border-border">
            <PropertyPanel document={document} />
          </div>
        </div>
      ) : (
        <main className="p-6 text-sm text-muted-foreground">Loading…</main>
      )}
      {showDiff ? <DiffView files={emitted} onClose={() => setShowDiff(false)} /> : null}
      <ConnectProject
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        onLoaded={(doc, orig) => {
          load(doc, orig);
          useProjectStore.temporal.getState().clear();
        }}
        onResetToFixture={() => {
          resetToFixture();
          setConnectOpen(false);
        }}
      />
      <CommandPalette
        commands={commands}
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
      />
    </div>
  );
}
