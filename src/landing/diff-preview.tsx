import { useMemo, useState } from 'react';
import { changedFiles, type EmittedFile, emitDiff, emitProject } from '@/codegen';
import { useProjectStore } from '@/store/project-store';

/**
 * Inline diff shown on the /learn preview during the diff chapter. Runs the
 * real emitter over the store document the visitor has been mutating while
 * scrolling (theme swaps, the cva override, radius, motion tokens) and renders
 * the actual patch — framed as the GitHub PR you'd open. It's genuinely "what
 * the system generated": same emitProject the editor's export + diff modal use.
 */

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
    return 'text-muted-foreground';
  }
  if (line.startsWith('@@')) return 'bg-muted/40 text-blue-300';
  if (line.startsWith('+')) return 'bg-green-950/40 text-green-300';
  if (line.startsWith('-')) return 'bg-red-950/40 text-red-300';
  return 'text-muted-foreground';
}

function FileRow({ diff }: { diff: FileDiff }) {
  const { file, patch, added, removed } = diff;
  const [expanded, setExpanded] = useState(true);
  return (
    <article className="overflow-hidden rounded-md border border-border bg-card/40">
      <header className="flex items-center justify-between gap-3 px-3 py-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex flex-1 items-center gap-2 text-left font-mono text-xs text-foreground"
        >
          <span className="text-muted-foreground">{expanded ? '▾' : '▸'}</span>
          <span className="truncate">{file.path}</span>
          {file.isNew ? (
            <span className="rounded bg-blue-950/60 px-1.5 py-0.5 text-[10px] text-blue-300">
              new
            </span>
          ) : null}
        </button>
        <span className="shrink-0 font-mono text-[11px]">
          <span className="text-green-400">+{added}</span>
          <span className="text-muted-foreground/70"> · </span>
          <span className="text-red-400">−{removed}</span>
        </span>
      </header>
      {expanded ? (
        <pre className="max-h-[40vh] overflow-auto border-t border-border bg-background px-3 py-2 font-mono text-[11px] leading-snug">
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
                  {line || ' '}
                </div>
              ))}
        </pre>
      ) : null}
    </article>
  );
}

export function DiffPreview() {
  const document = useProjectStore((s) => s.document);
  const originals = useProjectStore((s) => s.originals);

  const diffs = useMemo(() => {
    if (!document) return [];
    const emitted = changedFiles(emitProject({ document, originals }));
    return buildDiffs(emitted);
  }, [document, originals]);

  const totals = diffs.reduce(
    (acc, d) => ({ added: acc.added + d.added, removed: acc.removed + d.removed }),
    { added: 0, removed: 0 },
  );

  return (
    <section
      aria-label="Generated diff"
      className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto"
    >
      {/* GitHub-PR framing: this is the pull request the export would open. */}
      <header className="flex flex-col gap-3 rounded-md border border-border bg-card/60 p-4">
        <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="size-4 fill-current text-foreground"
          >
            <path d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38v-1.32c-2.23.49-2.7-1.07-2.7-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.06-.49.06-.49.8.06 1.23.83 1.23.83.71 1.22 1.87.87 2.33.66.07-.52.28-.87.5-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.83-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.22 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.52.56.83 1.28.83 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8 8 0 0 0 8 0Z" />
          </svg>
          <span className="text-foreground">your-org/your-app</span>
          <span>·</span>
          <span>
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-foreground/90">
              main
            </span>
            <span className="px-1">←</span>
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-foreground/90">
              mintcn/design-tokens
            </span>
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <h3 className="text-sm font-medium text-foreground">Update shadcn design tokens</h3>
            <p className="font-mono text-[11px] text-muted-foreground">
              {diffs.length} file{diffs.length === 1 ? '' : 's'} changed
              <span className="px-1 text-green-400">+{totals.added}</span>
              <span className="text-red-400">−{totals.removed}</span>
            </p>
          </div>
          <span className="shrink-0 rounded-md border border-border bg-muted px-3 py-1.5 text-xs text-foreground/90">
            Open pull request
          </span>
        </div>
      </header>

      {diffs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Scroll back up through the chapters to stack up some edits — the diff appears here.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {diffs.map((d) => (
            <FileRow key={d.file.path} diff={d} />
          ))}
        </div>
      )}
    </section>
  );
}
