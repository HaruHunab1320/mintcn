import { useEffect, useMemo, useState } from 'react';
import { type EmittedFile, emitDiff } from '@/codegen';

interface DiffViewProps {
  files: EmittedFile[];
  onClose: () => void;
}

interface FileDiff {
  file: EmittedFile;
  patch: string;
  added: number;
  removed: number;
}

function buildDiffs(files: EmittedFile[]): FileDiff[] {
  const diffs: FileDiff[] = [];
  for (const file of files) {
    const original = file.original ?? '';
    const patch = emitDiff({ filename: file.path, original, emitted: file.emitted });
    if (!patch && !file.isNew) continue;
    let added = 0;
    let removed = 0;
    if (patch) {
      for (const line of patch.split('\n')) {
        if (line.startsWith('+') && !line.startsWith('+++')) added++;
        else if (line.startsWith('-') && !line.startsWith('---')) removed++;
      }
    } else if (file.isNew) {
      added = file.emitted.split('\n').length;
    }
    diffs.push({ file, patch, added, removed });
  }
  return diffs;
}

function classNameForLine(line: string): string {
  if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('diff ')) {
    return 'text-neutral-500';
  }
  if (line.startsWith('@@')) return 'bg-neutral-800/40 text-blue-300';
  if (line.startsWith('+')) return 'bg-green-950/40 text-green-300';
  if (line.startsWith('-')) return 'bg-red-950/40 text-red-300';
  return 'text-neutral-400';
}

interface FileCardProps {
  diff: FileDiff;
  expanded: boolean;
  onToggle: () => void;
}

function FileCard({ diff, expanded, onToggle }: FileCardProps) {
  const { file, patch, added, removed } = diff;
  const copy = async () => {
    if (!navigator.clipboard) return;
    await navigator.clipboard.writeText(patch || file.emitted);
  };
  return (
    <article className="overflow-hidden rounded-md border border-neutral-800 bg-neutral-950/40">
      <header className="flex items-center justify-between gap-3 px-3 py-2">
        <button
          type="button"
          onClick={onToggle}
          className="flex flex-1 items-center gap-2 text-left font-mono text-xs text-neutral-200"
        >
          <span className="text-neutral-500">{expanded ? '▾' : '▸'}</span>
          <span>{file.path}</span>
          {file.isNew ? (
            <span className="rounded bg-blue-950/60 px-1.5 py-0.5 text-[10px] text-blue-300">
              new
            </span>
          ) : null}
        </button>
        <span className="font-mono text-[11px]">
          <span className="text-green-400">+{added}</span>
          <span className="text-neutral-600"> · </span>
          <span className="text-red-400">−{removed}</span>
        </span>
        <button
          type="button"
          onClick={copy}
          className="rounded border border-neutral-700 px-2 py-0.5 text-[10px] text-neutral-300 hover:border-neutral-500"
        >
          copy
        </button>
      </header>
      {expanded ? (
        <pre className="max-h-[60vh] overflow-auto border-t border-neutral-800 bg-neutral-950 px-3 py-2 font-mono text-[11px] leading-snug">
          {file.isNew && !patch
            ? file.emitted.split('\n').map((line, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: line ordering is stable for this render
                <div key={i} className="bg-green-950/40 text-green-300">
                  {`+${line}`}
                </div>
              ))
            : patch.split('\n').map((line, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: line ordering is stable for this render
                <div key={i} className={classNameForLine(line)}>
                  {line || ' '}
                </div>
              ))}
        </pre>
      ) : null}
    </article>
  );
}

export function DiffView({ files, onClose }: DiffViewProps) {
  const diffs = useMemo(() => buildDiffs(files), [files]);
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(diffs.map((d) => d.file.path)),
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const toggle = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-neutral-950/80 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      role="dialog"
      aria-label="Diff view"
      aria-modal="true"
      tabIndex={-1}
    >
      <div
        className="m-6 flex h-[calc(100vh-3rem)] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950 text-neutral-100"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="document"
      >
        <header className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
          <div>
            <h2 className="text-sm font-medium tracking-tight">Diff</h2>
            <p className="text-xs text-neutral-500">
              {diffs.length === 0
                ? 'No edits — everything matches the source.'
                : `${diffs.length} file${diffs.length === 1 ? '' : 's'} differ from source.`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-neutral-700 px-3 py-1 text-xs text-neutral-200 hover:border-neutral-500"
          >
            close
          </button>
        </header>
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          {diffs.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Edit a token or override to see changes appear here.
            </p>
          ) : null}
          {diffs.map((d) => (
            <FileCard
              key={d.file.path}
              diff={d}
              expanded={expanded.has(d.file.path)}
              onToggle={() => toggle(d.file.path)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
