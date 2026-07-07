/**
 * GitHub OAuth Web Flow (Authorization Code) — client side.
 *
 * Flow:
 *   1. beginSignIn() generates a random state, stashes it in sessionStorage,
 *      and redirects to github.com/login/oauth/authorize.
 *   2. User approves; GitHub redirects to /api/auth/callback?code=...&state=...
 *   3. Serverless function exchanges the code for an access_token (needs the
 *      client_secret, which cannot live in the browser), then redirects back
 *      to '/' with `#access_token=...&state=...` in the fragment.
 *   4. consumeAuthFragment() runs at app boot: verifies state, stashes the
 *      token in localStorage, and strips the fragment from the URL so it
 *      doesn't linger in browser history.
 *
 * The token is used as `Authorization: Bearer <token>` on subsequent
 * api.github.com requests. Scope is 'repo' (see the note in the README about
 * why granular read-only isn't available for OAuth Apps).
 */

const AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const CALLBACK_PATH = '/api/auth/callback';
const STATE_KEY = 'mintcn:oauth-state';
const TOKEN_KEY = 'mintcn:github-token';
const USER_KEY = 'mintcn:github-user';

export interface GitHubUser {
  login: string;
  avatar_url: string;
  name: string | null;
}

function clientId(): string {
  const id = import.meta.env.VITE_GITHUB_CLIENT_ID;
  if (!id) {
    throw new Error(
      'github-auth: VITE_GITHUB_CLIENT_ID is not set. Add it to .env.local (dev) or your deploy env.',
    );
  }
  return id;
}

function randomState(): string {
  // crypto.randomUUID is available in all evergreen browsers.
  return crypto.randomUUID();
}

/**
 * Redirects the browser to GitHub's authorize screen. Not idempotent — this
 * navigates away, so the returning page load will hit `consumeAuthFragment`.
 */
export function beginSignIn(): void {
  const state = randomState();
  sessionStorage.setItem(STATE_KEY, state);
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set('client_id', clientId());
  url.searchParams.set('redirect_uri', `${window.location.origin}${CALLBACK_PATH}`);
  url.searchParams.set('scope', 'repo');
  url.searchParams.set('state', state);
  url.searchParams.set('allow_signup', 'true');
  window.location.href = url.toString();
}

export type AuthFragmentResult =
  | { ok: true; token: string }
  | { ok: false; reason: string };

/**
 * Called at app boot. If the URL fragment carries an OAuth token, verify state
 * and stash it. Returns null when there's nothing to consume so callers can
 * distinguish "fresh page" from "callback landing."
 */
export function consumeAuthFragment(): AuthFragmentResult | null {
  const rawHash = window.location.hash;
  if (!rawHash.includes('access_token=')) return null;

  // The shared `#doc=...` handler reads from the same hash. Extract just the
  // OAuth pieces and leave anything else alone.
  const params = new URLSearchParams(rawHash.slice(1));
  const token = params.get('access_token');
  const state = params.get('state');
  const expected = sessionStorage.getItem(STATE_KEY);
  sessionStorage.removeItem(STATE_KEY);

  // Strip OAuth-only params from the fragment. If a `doc=` param was in there,
  // leave it — App.tsx's shared-link hydration still needs it.
  params.delete('access_token');
  params.delete('state');
  const remainingFragment = params.toString();
  const nextHash = remainingFragment ? `#${remainingFragment}` : '';
  history.replaceState(null, '', `${window.location.pathname}${window.location.search}${nextHash}`);

  if (!token) return { ok: false, reason: 'missing access_token' };
  if (!expected || state !== expected) {
    return { ok: false, reason: 'state mismatch — possible CSRF, sign-in cancelled' };
  }

  localStorage.setItem(TOKEN_KEY, token);
  return { ok: true, token };
}

/** Read the persisted token. Null when signed out. */
export function getGitHubToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function signOut(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * Fetch the authenticated user's profile. Cached in localStorage so the
 * Connect modal doesn't hit the API on every open. The cache is invalidated
 * on sign-in and sign-out.
 */
export async function fetchGitHubUser(token: string): Promise<GitHubUser> {
  const cached = localStorage.getItem(USER_KEY);
  if (cached) {
    try {
      return JSON.parse(cached) as GitHubUser;
    } catch {
      // fall through to a fresh fetch on a corrupt cache
    }
  }
  const res = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) {
    // 401 usually means the token was revoked — clear so the UI drops back to
    // signed-out and the user can re-auth.
    if (res.status === 401) signOut();
    throw new Error(`github-auth: /user returned ${res.status}`);
  }
  const raw = (await res.json()) as { login: string; avatar_url: string; name: string | null };
  const user: GitHubUser = { login: raw.login, avatar_url: raw.avatar_url, name: raw.name };
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}
