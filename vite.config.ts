import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { handleOAuthCallback } from './server/oauth-callback';

const FIXTURE_VIRTUAL_ID = 'virtual:mintcn-fixture';
const RESOLVED_FIXTURE_ID = `\0${FIXTURE_VIRTUAL_ID}`;
const FIXTURE_ROOT = path.resolve(__dirname, 'fixtures/shadcn-app');

/**
 * Surface the ingested fixture ProjectDocument to the browser. The plugin
 * calls our own ingest pipeline at dev time and re-runs whenever any file
 * under `fixtures/shadcn-app/` changes, so the editor always reflects the
 * canonical fixture without bundling a stale snapshot.
 */
function fixtureProjectPlugin(): Plugin {
  return {
    name: 'mintcn:fixture-project',
    resolveId(id) {
      if (id === FIXTURE_VIRTUAL_ID) return RESOLVED_FIXTURE_ID;
      return null;
    },
    async load(id) {
      if (id !== RESOLVED_FIXTURE_ID) return null;
      const fs = await import('node:fs/promises');
      const { loadProject } = await import('./src/ingest/load-project');
      const doc = loadProject({ rootDir: FIXTURE_ROOT, name: 'shadcn-app' });

      // Also expose the raw bytes of every file emit might rewrite, so the
      // DiffView can compare emitter output against what's on disk today.
      const originals: Record<string, string> = {};
      const relativeFiles = [
        'app/globals.css',
        'components.json',
        ...doc.components.map((c) => c.source.path),
      ];
      await Promise.all(
        relativeFiles.map(async (rel) => {
          try {
            originals[rel] = await fs.readFile(path.join(FIXTURE_ROOT, rel), 'utf8');
          } catch {
            // File missing on disk — skip; emitter still runs.
          }
        }),
      );

      return `export const fixtureProject = ${JSON.stringify(doc)};\nexport const fixtureOriginals = ${JSON.stringify(originals)};`;
    },
    configureServer(server) {
      server.watcher.add(FIXTURE_ROOT);
      server.watcher.on('all', (_event, filePath) => {
        if (filePath.startsWith(FIXTURE_ROOT)) {
          const mod = server.moduleGraph.getModuleById(RESOLVED_FIXTURE_ID);
          if (mod) server.reloadModule(mod);
        }
      });
    },
  };
}

/**
 * Handles the GitHub OAuth callback in local dev so `pnpm dev` matches prod
 * behavior without needing `vercel dev`. Delegates to the same
 * `handleOAuthCallback` the production serverless function uses.
 */
function oauthCallbackDevPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'mintcn:oauth-callback-dev',
    configureServer(server) {
      server.middlewares.use('/api/auth/callback', async (req, res, next) => {
        if (req.method !== 'GET') return next();
        try {
          const host = req.headers.host ?? 'localhost:5173';
          const proto = req.headers['x-forwarded-proto'] ?? 'http';
          const url = new URL(req.url ?? '/', `${proto}://${host}`);
          const result = await handleOAuthCallback(
            {
              code: url.searchParams.get('code'),
              state: url.searchParams.get('state'),
              origin: `${proto}://${host}`,
            },
            {
              GITHUB_CLIENT_ID: env.VITE_GITHUB_CLIENT_ID,
              GITHUB_CLIENT_SECRET: env.GITHUB_CLIENT_SECRET,
            },
          );
          res.statusCode = result.status;
          res.setHeader('Location', result.redirectTo);
          res.setHeader('Cache-Control', 'no-store');
          res.end();
        } catch (err) {
          res.statusCode = 500;
          res.end(err instanceof Error ? err.message : 'oauth callback failed');
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Vite by default only exposes VITE_* env to import.meta.env. Load the raw
  // env with an empty prefix so the dev middleware can also see the
  // GITHUB_CLIENT_SECRET.
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss(), fixtureProjectPlugin(), oauthCallbackDevPlugin(env)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  };
});
