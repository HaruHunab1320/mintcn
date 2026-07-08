import { useState } from 'react';

/**
 * Repo-connect demo shown on the /learn preview during the "point it at your
 * repo" chapter. Mirrors the editor's real ConnectProject modal (GitHub
 * sign-in + URL field) so visitors see exactly what connecting looks like —
 * with an expanding ring + nudging arrow drawing the eye to the GitHub button.
 * The actions link into the editor, where the real connect flow lives.
 */

function GitHubMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4 fill-current">
      <path d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38v-1.32c-2.23.49-2.7-1.07-2.7-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.06-.49.06-.49.8.06 1.23.83 1.23.83.71 1.22 1.87.87 2.33.66.07-.52.28-.87.5-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.83-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.22 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.52.56.83 1.28.83 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8 8 0 0 0 8 0Z" />
    </svg>
  );
}

export function RepoConnect() {
  const [url, setUrl] = useState('');

  return (
    <section
      aria-label="Connect a repo"
      className="flex min-h-0 flex-1 flex-col justify-center gap-4"
    >
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-card/60 p-5 shadow-sm">
        <header className="flex flex-col gap-1">
          <h3 className="text-sm font-medium text-foreground">Connect a shadcn project</h3>
          <p className="text-xs text-muted-foreground">
            Paste any GitHub URL — Mintcn reads <span className="font-mono">components.json</span> +
            your theme CSS + every <span className="font-mono">components/ui/*.tsx</span>, then
            swaps the workspace to your project.
          </p>
        </header>

        {/* GitHub sign-in — the focal point, with a nudging arrow + pulse ring. */}
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="font-mono text-xs font-medium text-primary"
            style={{ animation: 'mintcn-point-nudge 1s ease-in-out infinite' }}
          >
            start here →
          </span>
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            style={{ animation: 'mintcn-attention-ring 1.6s ease-out infinite' }}
          >
            <GitHubMark />
            Sign in with GitHub
          </a>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
            GitHub URL
          </span>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/user/repo (or /tree/branch/subdir)"
            className="rounded border border-border bg-muted px-2 py-1.5 font-mono text-xs text-foreground outline-none focus:border-input"
          />
        </label>

        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">
            Public repos work out of the box; sign in to unlock private ones.
          </p>
          <a
            href="/"
            className="shrink-0 rounded-md border border-border px-3 py-1.5 text-xs text-foreground hover:border-ring"
          >
            Connect →
          </a>
        </div>
      </div>
      <p className="px-1 text-[11px] text-muted-foreground/80">
        Runs entirely client-side — nothing is uploaded, and your token stays in your tab.
      </p>
    </section>
  );
}
