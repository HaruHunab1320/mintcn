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
  candidates: string[];
  constructor(candidates: string[]) {
    super(
      `Found multiple components.json files in this repo. Include the subdir in the URL — e.g. https://github.com/<owner>/<repo>/tree/<branch>/${candidates[0]}. Candidates: ${candidates.join(', ')}`,
    );
    this.name = 'ShadcnProjectAmbiguousError';
    this.candidates = candidates;
  }
}

function authHeaders(token: string | undefined): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function githubJson<T>(url: string, token: string | undefined): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: 'application/vnd.github+json', ...authHeaders(token) },
  });
  if (!res.ok) {
    const limit = res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0';
    const message = limit
      ? token
        ? 'GitHub API rate-limit hit (5000/hour authenticated). Try again in a bit.'
        : 'GitHub API rate-limit hit (60/hour unauthenticated). Sign in with GitHub to get 5000/hour.'
      : res.status === 401
        ? 'GitHub token was rejected — sign in again.'
        : res.status === 404
          ? token
            ? "Not found — check the URL, branch, and subdir path. If it's private, verify your account has access."
            : "Not found — check the URL, branch, and subdir path. If it's a private repo, sign in with GitHub."
          : `GitHub request failed: ${res.status} ${res.statusText}`;
    throw new Error(message);
  }
  return (await res.json()) as T;
}

/**
 * Fetch a file's raw text from a repo. Authenticated calls go through the
 * `contents` API with `Accept: application/vnd.github.raw` (works for private
 * repos). Unauth calls hit `raw.githubusercontent.com` directly (uncapped and
 * doesn't count toward the API rate limit for public repos).
 */
async function fetchRepoFile(
  ref: GitHubProjectRef,
  filePath: string,
  token: string | undefined,
): Promise<string> {
  if (token) {
    const url = `https://api.github.com/repos/${ref.owner}/${ref.repo}/contents/${encodeURI(
      filePath,
    )}?ref=${encodeURIComponent(ref.branch)}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/vnd.github.raw', ...authHeaders(token) },
    });
    if (!res.ok) throw new Error(`Failed to fetch ${filePath}: ${res.status} ${res.statusText}`);
    return res.text();
  }
  const url = `https://raw.githubusercontent.com/${ref.owner}/${ref.repo}/${ref.branch}/${filePath}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${filePath}: ${res.status} ${res.statusText}`);
  return res.text();
}

async function fetchRepoFileIfExists(
  ref: GitHubProjectRef,
  filePath: string,
  token: string | undefined,
): Promise<string | null> {
  try {
    return await fetchRepoFile(ref, filePath, token);
  } catch (err) {
    if (err instanceof Error && err.message.includes('404')) return null;
    throw err;
  }
}

function joinPath(...parts: string[]): string {
  return parts.filter(Boolean).join('/').replace(/\/+/g, '/');
}

/**
 * Walk the repo tree and return the parent dir of every `components.json`
 * found (empty string for repo root). Uses one git/trees API call with
 * recursive=1 — cheap in rate-limit terms.
 */
export async function discoverShadcnRoots(
  ref: GitHubProjectRef,
  token?: string,
): Promise<string[]> {
  const url = `https://api.github.com/repos/${ref.owner}/${ref.repo}/git/trees/${encodeURIComponent(
    ref.branch,
  )}?recursive=1`;
  const tree = await githubJson<GitHubTreeResponse>(url, token);
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

export interface FetchProjectOptions {
  /** GitHub Bearer token (from OAuth Web Flow). Enables private repos + 5000/hr. */
  token?: string;
}

/**
 * Fetch a shadcn project from a GitHub repo (public or private).
 *
 * If the initial path has no components.json, walks the whole tree to find
 * one — silently uses the only candidate, or throws with the list if there's
 * more than one.
 *
 * Authenticated calls go through the api.github.com contents endpoint (which
 * handles private repos); unauth calls use raw.githubusercontent.com for
 * uncapped public reads.
 */
export async function fetchProjectFromGitHub(
  ref: GitHubProjectRef,
  options: FetchProjectOptions = {},
): Promise<ProjectSources> {
  const { token } = options;
  const apiBase = `https://api.github.com/repos/${ref.owner}/${ref.repo}/contents`;

  let effectiveSubdir = ref.subdir;
  let componentsJson = await fetchRepoFileIfExists(
    ref,
    joinPath(effectiveSubdir, 'components.json'),
    token,
  );

  // Missing at the given path — see if we can find one automatically.
  if (componentsJson === null) {
    const candidates = await discoverShadcnRoots(ref, token);
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
    componentsJson = await fetchRepoFile(ref, joinPath(effectiveSubdir, 'components.json'), token);
  }

  const parsed = JSON.parse(componentsJson) as {
    tailwind: { css: string };
    aliases: { ui: string };
  };

  const cssRel = parsed.tailwind.css;
  const globalsCss = await fetchRepoFile(ref, joinPath(effectiveSubdir, cssRel), token);

  const uiDirRel = 'components/ui';
  const contentsUrl = `${apiBase}/${joinPath(
    effectiveSubdir,
    uiDirRel,
  )}?ref=${encodeURIComponent(ref.branch)}`;
  const listing = await githubJson<GitHubContentEntry[]>(contentsUrl, token);
  const uiFiles = listing.filter(
    (e) => e.type === 'file' && e.name.endsWith('.tsx') && !e.name.endsWith('.test.tsx'),
  );

  const componentSources: Record<string, string> = {};
  await Promise.all(
    uiFiles.map(async (entry) => {
      const text = await fetchRepoFile(ref, entry.path, token);
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
