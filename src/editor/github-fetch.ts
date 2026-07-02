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

interface GitHubTreeEntry {
  path: string;
  type: 'blob' | 'tree';
}

interface GitHubTreeResponse {
  tree: GitHubTreeEntry[];
  truncated: boolean;
}

/** Thrown when the initial subdir has no components.json but discovery has options to offer. */
export class ShadcnProjectAmbiguousError extends Error {
  constructor(public candidates: string[]) {
    super(
      `Found multiple components.json files in this repo. Include the subdir in the URL — e.g. https://github.com/<owner>/<repo>/tree/<branch>/${candidates[0]}. Candidates: ${candidates.join(', ')}`,
    );
    this.name = 'ShadcnProjectAmbiguousError';
  }
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
 * Walk the repo tree and return the parent dir of every `components.json`
 * found (empty string for repo root). Uses one git/trees API call with
 * recursive=1 — cheap in rate-limit terms.
 */
export async function discoverShadcnRoots(ref: GitHubProjectRef): Promise<string[]> {
  const url = `https://api.github.com/repos/${ref.owner}/${ref.repo}/git/trees/${encodeURIComponent(
    ref.branch,
  )}?recursive=1`;
  const tree = await githubJson<GitHubTreeResponse>(url);
  const dirs: string[] = [];
  for (const entry of tree.tree) {
    if (entry.type !== 'blob') continue;
    if (!entry.path.endsWith('components.json')) continue;
    // Ignore `node_modules/**/components.json` — those are library metadata,
    // not shadcn project roots.
    if (entry.path.includes('node_modules/')) continue;
    const parent =
      entry.path === 'components.json' ? '' : entry.path.replace(/\/components\.json$/, '');
    dirs.push(parent);
  }
  return dirs;
}

async function fetchTextIfExists(url: string): Promise<string | null> {
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  return res.text();
}

/**
 * Fetch a shadcn project from a public GitHub repo. If the initial path has
 * no components.json, walks the whole tree to find one — silently uses the
 * only candidate, or throws with the list if there's more than one.
 *
 * Uses raw.githubusercontent.com for file bodies (uncapped) and one contents
 * API call per directory listing (rate-limited).
 */
export async function fetchProjectFromGitHub(ref: GitHubProjectRef): Promise<ProjectSources> {
  const rawBase = `https://raw.githubusercontent.com/${ref.owner}/${ref.repo}/${ref.branch}`;
  const apiBase = `https://api.github.com/repos/${ref.owner}/${ref.repo}/contents`;

  let effectiveSubdir = ref.subdir;
  let componentsJson = await fetchTextIfExists(
    `${rawBase}/${joinPath(effectiveSubdir, 'components.json')}`,
  );

  // Missing at the given path — see if we can find one automatically.
  if (componentsJson === null) {
    const candidates = await discoverShadcnRoots(ref);
    if (candidates.length === 0) {
      throw new Error(
        `No components.json anywhere in ${ref.owner}/${ref.repo}@${ref.branch} — is this a shadcn project?`,
      );
    }
    if (candidates.length > 1 && !candidates.includes(effectiveSubdir)) {
      throw new ShadcnProjectAmbiguousError(candidates);
    }
    // Exactly one candidate, or the user's subdir happens to be one of them.
    effectiveSubdir = candidates.includes(effectiveSubdir) ? effectiveSubdir : candidates[0];
    componentsJson = await fetchText(`${rawBase}/${joinPath(effectiveSubdir, 'components.json')}`);
  }

  const parsed = JSON.parse(componentsJson) as {
    tailwind: { css: string };
    aliases: { ui: string };
  };

  const cssRel = parsed.tailwind.css;
  const globalsCss = await fetchText(`${rawBase}/${joinPath(effectiveSubdir, cssRel)}`);

  const uiDirRel = 'components/ui';
  const contentsUrl = `${apiBase}/${joinPath(
    effectiveSubdir,
    uiDirRel,
  )}?ref=${encodeURIComponent(ref.branch)}`;
  const listing = await githubJson<GitHubContentEntry[]>(contentsUrl);
  const uiFiles = listing.filter(
    (e) => e.type === 'file' && e.name.endsWith('.tsx') && !e.name.endsWith('.test.tsx'),
  );

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
    name: effectiveSubdir ? `${ref.repo}/${effectiveSubdir}` : ref.repo,
  };
}
