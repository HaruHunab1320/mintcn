import { fixtureOriginals, fixtureProject } from 'virtual:tincture-fixture';
import { useEffect, useMemo, useState } from 'react';
import { changedFiles, emitProject } from '@/codegen';
import { DiffView, downloadProjectZip, PropertyPanel } from '@/editor';
import { Canvas } from '@/renderer';
import { useProjectStore } from '@/store/project-store';

export default function App() {
  const document = useProjectStore((s) => s.document);
  const load = useProjectStore((s) => s.load);
  const [showDiff, setShowDiff] = useState(false);

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

  const handleExport = async () => {
    if (!document) return;
    const archive = `${document.meta.name}-${new Date().toISOString().slice(0, 10)}`;
    await downloadProjectZip(emitted, archive);
  };

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
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-2 rounded-md bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-900 hover:bg-white"
            >
              Export
            </button>
          </div>
        ) : null}
      </header>
      {document ? (
        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 overflow-y-auto p-6">
            <Canvas document={document} />
          </main>
          <div className="flex h-full shrink-0 border-l border-neutral-800">
            <PropertyPanel document={document} />
          </div>
        </div>
      ) : (
        <main className="p-6 text-sm text-neutral-500">Loading…</main>
      )}
      {showDiff ? <DiffView files={emitted} onClose={() => setShowDiff(false)} /> : null}
    </div>
  );
}
