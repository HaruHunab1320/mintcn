/**
 * Shared OAuth-callback logic. Consumed by:
 *   - Vite dev middleware (see vite.config.ts) for `pnpm dev`
 *   - Production serverless function (Vercel/Netlify/Cloudflare) — see
 *     api/auth/callback.ts
 *
 * Kept as a plain async function so both transports can wrap it without
 * pulling in framework types.
 */

export interface OAuthCallbackInput {
  code: string | null;
  state: string | null;
  origin: string;
}

export interface OAuthCallbackResult {
  status: number;
  /** Absolute URL to redirect the browser to. */
  redirectTo: string;
}

interface Env {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
}

function readEnv(env: Partial<Env>): Env {
  const clientId = env.GITHUB_CLIENT_ID?.trim();
  const clientSecret = env.GITHUB_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error(
      'oauth-callback: GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET must be set in the env.',
    );
  }
  return { GITHUB_CLIENT_ID: clientId, GITHUB_CLIENT_SECRET: clientSecret };
}

/**
 * Handle a `?code=...&state=...` callback. On success returns a 302 with the
 * access_token in the URL fragment (fragments don't hit server logs, unlike
 * query strings) so the client can pick it up + strip it.
 *
 * Errors also redirect back to `/` but with `?auth_error=...` in the query so
 * the UI can surface the failure without any state clientside.
 */
export async function handleOAuthCallback(
  input: OAuthCallbackInput,
  env: Partial<Env>,
): Promise<OAuthCallbackResult> {
  const { code, state, origin } = input;
  if (!code) {
    return {
      status: 302,
      redirectTo: `${origin}/?auth_error=${encodeURIComponent('missing code')}`,
    };
  }
  const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } = readEnv(env);

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  if (!tokenRes.ok) {
    return {
      status: 302,
      redirectTo: `${origin}/?auth_error=${encodeURIComponent(`github ${tokenRes.status}`)}`,
    };
  }

  const body = (await tokenRes.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (body.error || !body.access_token) {
    const msg = body.error_description || body.error || 'no access_token in response';
    return {
      status: 302,
      redirectTo: `${origin}/?auth_error=${encodeURIComponent(msg)}`,
    };
  }

  // Token in the fragment — never sent to any server, kept out of Referer.
  const fragment = new URLSearchParams({
    access_token: body.access_token,
    state: state ?? '',
  });
  return {
    status: 302,
    redirectTo: `${origin}/#${fragment.toString()}`,
  };
}
