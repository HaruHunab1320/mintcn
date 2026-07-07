import { useEffect, useRef, useState } from 'react';
import { loadProjectFromSources } from '@/ingest';
import type { ProjectDocument } from '@/schema';
import {
  beginSignIn,
  fetchGitHubUser,
  getGitHubToken,
  type GitHubUser,
  signOut,
} from './github-auth';
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
  const [user, setUser] = useState<GitHubUser | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setStatus('idle');
    setError(null);
    requestAnimationFrame(() => inputRef.current?.focus());
    // Populate the signed-in state whenever the modal opens.
    const token = getGitHubToken();
    if (token) {
      fetchGitHubUser(token)
        .then(setUser)
        .catch(() => setUser(null));
    } else {
      setUser(null);
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
      const token = getGitHubToken();
      const sources = await fetchProjectFromGitHub(ref, { token: token ?? undefined });
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
            Paste a GitHub URL. Mintcn reads components.json + your theme CSS + every
            components/ui/*.tsx file, then swaps the workspace to your project.
          </p>
        </header>

        <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-card p-2 text-[11px]">
          {user ? (
            <>
              <div className="flex items-center gap-2 text-foreground">
                <img
                  src={user.avatar_url}
                  alt=""
                  aria-hidden="true"
                  className="h-5 w-5 rounded-full border border-border"
                />
                <span>
                  Signed in as <span className="font-mono">{user.login}</span> · private repos
                  unlocked
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  signOut();
                  setUser(null);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                sign out
              </button>
            </>
          ) : (
            <>
              <span className="text-muted-foreground">
                Not signed in. Public repos work; private repos need auth.
              </span>
              <button
                type="button"
                onClick={beginSignIn}
                className="rounded border border-border px-2 py-0.5 text-foreground hover:border-ring"
              >
                Sign in with GitHub
              </button>
            </>
          )}
        </div>

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
            {user
              ? 'Authenticated GitHub API is 5000 requests/hour. Private repos work if your account has access.'
              : 'Unauthenticated GitHub API is 60 requests/hour per IP. Sign in above to raise it and unlock private repos.'}
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
