import { useEffect, useRef, useState } from 'react';
import { loadProjectFromSources } from '@/ingest';
import type { ProjectDocument } from '@/schema';
import { fetchProjectFromGitHub, parseGitHubUrl } from './github-fetch';

interface ConnectProjectProps {
  open: boolean;
  onClose: () => void;
  onLoaded: (document: ProjectDocument, originals: Record<string, string>) => void;
  onResetToFixture: () => void;
}

/**
 * Modal for pulling a shadcn project in from GitHub. Accepts any
 * github.com/... URL; the fetcher figures out the branch and subdir.
 * Ingest runs client-side against the fetched materials.
 */
export function ConnectProject({ open, onClose, onLoaded, onResetToFixture }: ConnectProjectProps) {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setStatus('idle');
      setError(null);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  if (!open) return null;

  const submit = async () => {
    const ref = parseGitHubUrl(url);
    if (!ref) {
      setStatus('error');
      setError(
        'Could not parse that URL. Expected github.com/user/repo, optionally with /tree/branch/subdir.',
      );
      return;
    }
    setStatus('loading');
    setError(null);
    try {
      const sources = await fetchProjectFromGitHub(ref);
      const document = loadProjectFromSources(sources);
      // Build the originals map keyed by paths the emitters use.
      const originals: Record<string, string> = {
        'app/globals.css': sources.globalsCss,
        'components.json': sources.componentsJson,
        ...sources.componentSources,
      };
      // Handle a project whose globals.css lives at a different path
      // (e.g. `styles/globals.css`) — emit-project reads doc.meta.config.tailwind.css.
      const cssPath = document.meta.config.tailwind.css;
      if (cssPath !== 'app/globals.css') {
        originals[cssPath] = sources.globalsCss;
      }
      onLoaded(document, originals);
      onClose();
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Connect project"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center bg-background/70 pt-[15vh] backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        className="flex w-full max-w-lg flex-col gap-3 rounded-lg border border-border bg-background p-5 text-foreground shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="document"
      >
        <header className="flex flex-col gap-1">
          <h2 className="text-sm font-medium tracking-tight">Connect a shadcn project</h2>
          <p className="text-xs text-muted-foreground">
            Paste a public GitHub URL. Tincture reads components.json + your theme CSS + every
            components/ui/*.tsx file, then swaps the workspace to your project.
          </p>
        </header>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">GitHub URL</span>
          <input
            ref={inputRef}
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && status !== 'loading') void submit();
            }}
            placeholder="https://github.com/user/repo (or /tree/branch/subdir)"
            className="rounded border border-border bg-muted px-2 py-1.5 font-mono text-xs text-foreground outline-none focus:border-input"
          />
        </label>

        {error ? (
          <p className="rounded border border-red-900/50 bg-red-950/30 px-2 py-1.5 text-[11px] text-red-300">
            {error}
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            Unauthenticated GitHub API is rate-limited to 60 requests / hour per IP. A single
            connect uses one API call plus one raw fetch per file.
          </p>
        )}

        <div className="flex items-center justify-between gap-2 pt-2">
          <button
            type="button"
            onClick={onResetToFixture}
            className="text-[11px] text-muted-foreground hover:text-foreground/90"
          >
            ↺ Reset to fixture
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-3 py-1 text-xs text-foreground hover:border-ring"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={status === 'loading' || !url.trim()}
              className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {status === 'loading' ? 'Fetching…' : 'Connect'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
