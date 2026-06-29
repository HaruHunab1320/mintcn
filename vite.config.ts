import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const FIXTURE_VIRTUAL_ID = 'virtual:tincture-fixture';
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
    name: 'tincture:fixture-project',
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

export default defineConfig({
  plugins: [react(), tailwindcss(), fixtureProjectPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
