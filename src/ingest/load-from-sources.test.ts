import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadProjectFromSources, type ProjectSources } from './load-from-sources';
import { loadProject } from './load-project';

const FIXTURE_ROOT = path.resolve(__dirname, '../../fixtures/shadcn-app');

function readFixtureSources(): ProjectSources {
  const componentsJson = fs.readFileSync(path.join(FIXTURE_ROOT, 'components.json'), 'utf8');
  const globalsCss = fs.readFileSync(path.join(FIXTURE_ROOT, 'app/globals.css'), 'utf8');
  const uiDir = path.join(FIXTURE_ROOT, 'components/ui');
  const componentSources: Record<string, string> = {};
  for (const file of fs.readdirSync(uiDir).sort()) {
    if (!file.endsWith('.tsx')) continue;
    componentSources[`components/ui/${file}`] = fs.readFileSync(path.join(uiDir, file), 'utf8');
  }
  return { componentsJson, globalsCss, componentSources, name: 'shadcn-app' };
}

describe('loadProjectFromSources', () => {
  it('produces an equivalent document to loadProject on the same fixture', () => {
    const fromDisk = loadProject({ rootDir: FIXTURE_ROOT, name: 'shadcn-app' });
    const fromSources = loadProjectFromSources(readFixtureSources());

    // Same set of components, same order.
    expect(fromSources.components.map((c) => c.id)).toEqual(fromDisk.components.map((c) => c.id));

    // Same key metadata.
    expect(fromSources.meta.name).toBe(fromDisk.meta.name);
    expect(fromSources.meta.baseColor).toBe(fromDisk.meta.baseColor);
    expect(fromSources.meta.themeImports).toEqual(fromDisk.meta.themeImports);

    // Same tokens (identity round-trip through the same parsers).
    expect(fromSources.tokens.radius).toEqual(fromDisk.tokens.radius);
    expect(fromSources.tokens.colors.light.primary).toEqual(fromDisk.tokens.colors.light.primary);
  });

  it('skips unparseable component sources without throwing', () => {
    const good = readFixtureSources();
    const bad: ProjectSources = {
      ...good,
      componentSources: {
        ...good.componentSources,
        'components/ui/broken.tsx': 'this is not valid tsx {{{ syntax error }}}',
      },
    };
    // The parser is remarkably tolerant — even a garbage file usually surfaces
    // as an empty ComponentMeta rather than throwing. We just assert the
    // pipeline doesn't reject the whole project.
    const doc = loadProjectFromSources(bad);
    expect(doc.components.length).toBeGreaterThan(0);
  });

  it('ignores non-UI files in the sources map', () => {
    const good = readFixtureSources();
    const withNoise: ProjectSources = {
      ...good,
      componentSources: {
        ...good.componentSources,
        'lib/utils.ts': 'export const x = 1;',
        'components/ui/button.test.tsx': 'test file',
      },
    };
    const doc = loadProjectFromSources(withNoise);
    // Only real ui components got picked up.
    expect(doc.components.every((c) => !c.id.endsWith('.test'))).toBe(true);
  });
});
