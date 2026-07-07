import { handleOAuthCallback } from '../../server/oauth-callback';

interface NetlifyEvent {
  rawUrl?: string;
  queryStringParameters?: Record<string, string | undefined> | null;
  headers?: Record<string, string | undefined>;
}

interface NetlifyResponse {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
}

/**
 * Netlify Function entrypoint for the GitHub OAuth callback. Delegates to
 * the transport-agnostic `handleOAuthCallback` so the Vite dev middleware
 * and this function share one source of truth.
 */
export const handler = async (event: NetlifyEvent): Promise<NetlifyResponse> => {
  const query = event.queryStringParameters ?? {};
  // Prefer the client-visible URL (the pre-rewrite URL) so the origin we redirect
  // back to matches what the user actually loaded.
  const rawUrl = event.rawUrl ?? '';
  const proto = event.headers?.['x-forwarded-proto'] ?? 'https';
  const host = event.headers?.host ?? event.headers?.['x-forwarded-host'] ?? '';
  const origin = rawUrl ? new URL(rawUrl).origin : `${proto}://${host}`;

  const result = await handleOAuthCallback(
    {
      code: query.code ?? null,
      state: query.state ?? null,
      origin,
    },
    {
      GITHUB_CLIENT_ID: process.env.VITE_GITHUB_CLIENT_ID,
      GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    },
  );

  return {
    statusCode: result.status,
    headers: {
      Location: result.redirectTo,
      'Cache-Control': 'no-store',
    },
    body: '',
  };
};
