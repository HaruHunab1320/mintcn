import { handleOAuthCallback } from '../../server/oauth-callback';

/**
 * Vercel / Netlify (and Node-style) serverless entrypoint for the GitHub
 * OAuth callback. Cloudflare Pages Functions would need a slightly different
 * signature; the delegated `handleOAuthCallback` is transport-agnostic so
 * porting is just a shell rewrite.
 */
export default async function handler(
  req: { url?: string; headers: { host?: string; 'x-forwarded-proto'?: string } },
  res: {
    statusCode: number;
    setHeader: (name: string, value: string) => void;
    end: () => void;
  },
): Promise<void> {
  const url = new URL(req.url || '/', `https://${req.headers.host}`);
  const proto = req.headers['x-forwarded-proto'] ?? 'https';
  const origin = `${proto}://${req.headers.host}`;
  const result = await handleOAuthCallback(
    {
      code: url.searchParams.get('code'),
      state: url.searchParams.get('state'),
      origin,
    },
    {
      GITHUB_CLIENT_ID: process.env.VITE_GITHUB_CLIENT_ID,
      GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    },
  );
  res.statusCode = result.status;
  res.setHeader('Location', result.redirectTo);
  res.setHeader('Cache-Control', 'no-store');
  res.end();
}
