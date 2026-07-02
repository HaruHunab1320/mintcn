import type { ProjectSources } from '@/ingest';

export interface GitHubProjectRef {
  owner: string;
  repo: string;
  branch: string;
  /** Path within the repo to the shadcn project root (empty for repo root). */
  subdir: string;
}

/**
 * Parse a github.com URL of any of these shapes into a project reference:
 *   https://github.com/user/repo
 *   https://github.com/user/repo.git
 *   https://github.com/user/repo/tree/branch
 *   https://github.com/user/repo/tree/branch/subdir/further
 *
 * Returns null for anything we don't recognize. Branch defaults to 'main'
 * when the URL doesn't specify one.
 */
export function parseGitHubUrl(input: string): GitHubProjectRef | null {
  const trimmed = input.trim();
  const match = trimmed.match(
    /^https?:\/\/github\.com\/([^/\s]+)\/([^/\s]+?)(?:\.git)?(?:\/(tree|blob)\/([^/\s]+)(?:\/([^\s]+))?)?\/?$/i,
  );
  if (!match) return null;
  const [, owner, repo, , branch, subdir] = match;
  return {
    owner,
    repo,
    branch: branch ?? 'main',
    subdir: subdir?.replace(/\/$/, '') ?? '',
  };
}

interface GitHubContentEntry {
  name: string;
  path: string;
  type: 'file' | 'dir' | 'symlink' | 'submodule';
  download_url: string | null;
}

async function githubJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) {
    const message =
      res.status === 403
        ? 'GitHub API rate-limit hit (60 requests/hour without auth). Try again later.'
        : res.status === 404
          ? 'Not found — check the URL, branch, and subdir path.'
          : `GitHub request failed: ${res.status} ${res.statusText}`;
    throw new Error(message);
  }
  return (await res.json()) as T;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  return res.text();
}

function joinPath(...parts: string[]): string {
  return parts.filter(Boolean).join('/').replace(/\/+/g, '/');
}

/**
 * Fetch a shadcn project from a public GitHub repo. Uses the contents API
 * to discover the components/ui directory contents, then raw.githubusercontent.com
 * to pull each file (no rate limit on raw). Total API calls: 1 per directory.
 */
export async function fetchProjectFromGitHub(ref: GitHubProjectRef): Promise<ProjectSources> {
  const rawBase = `https://raw.githubusercontent.com/${ref.owner}/${ref.repo}/${ref.branch}`;
  const apiBase = `https://api.github.com/repos/${ref.owner}/${ref.repo}/contents`;
  const rootWithinRepo = ref.subdir;

  // 1) components.json is required — it tells us where the CSS entry lives.
  const componentsJsonPath = joinPath(rootWithinRepo, 'components.json');
  const componentsJson = await fetchText(`${rawBase}/${componentsJsonPath}`);
  const parsed = JSON.parse(componentsJson) as {
    tailwind: { css: string };
    aliases: { ui: string };
  };

  // 2) globals.css lives at the tailwind.css path (relative to project root).
  const cssRel = parsed.tailwind.css;
  const globalsCss = await fetchText(`${rawBase}/${joinPath(rootWithinRepo, cssRel)}`);

  // 3) list components/ui/ via the contents API. The aliases.ui value is a
  //    tsconfig-style alias (`@/components/ui`), not a real path. Real shadcn
  //    convention puts UI components in `components/ui` under the project
  //    root, so we hardcode that.
  const uiDirRel = 'components/ui';
  const contentsUrl = `${apiBase}/${joinPath(rootWithinRepo, uiDirRel)}?ref=${encodeURIComponent(ref.branch)}`;
  const listing = await githubJson<GitHubContentEntry[]>(contentsUrl);
  const uiFiles = listing.filter(
    (e) => e.type === 'file' && e.name.endsWith('.tsx') && !e.name.endsWith('.test.tsx'),
  );

  // 4) pull each source file in parallel.
  const componentSources: Record<string, string> = {};
  await Promise.all(
    uiFiles.map(async (entry) => {
      if (!entry.download_url) return;
      const text = await fetchText(entry.download_url);
      componentSources[`${uiDirRel}/${entry.name}`] = text;
    }),
  );

  return {
    componentsJson,
    globalsCss,
    componentSources,
    name: ref.subdir ? `${ref.repo}/${ref.subdir}` : ref.repo,
  };
}
