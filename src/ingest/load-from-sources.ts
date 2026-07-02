import type { ComponentMeta, ProjectDocument } from '../schema';
import { validateProjectDocument } from '../schema';
import { parseComponentSource } from './parse-component-source';
import { parseComponentsJson } from './parse-components-json';
import { parseThemeCss } from './parse-theme-css';

export interface ProjectSources {
  /** components.json contents (raw JSON text). */
  componentsJson: string;
  /** app/globals.css (or wherever tailwind.css points) contents. */
  globalsCss: string;
  /**
   * Component source files keyed by fixture-root-relative path
   * (`components/ui/button.tsx`). Non-UI files are ignored.
   */
  componentSources: Record<string, string>;
  /** Display name for the document. */
  name: string;
}

/**
 * Browser-friendly project ingest — same output shape as `loadProject` but
 * takes materials in memory instead of reading from disk. Used by the
 * "Connect project" flow, and by any future workflow (paste, local folder,
 * zip upload) that produces the same sources map.
 *
 * Any component source that fails to parse is skipped with a warning so a
 * single malformed file doesn't tank the whole ingest.
 */
export function loadProjectFromSources(sources: ProjectSources): ProjectDocument {
  const componentsJson = parseComponentsJson(sources.componentsJson);
  const { tokens, themeImports } = parseThemeCss(sources.globalsCss);

  const components: ComponentMeta[] = [];
  const uiPaths = Object.keys(sources.componentSources)
    .filter((p) => p.includes('components/ui/'))
    .filter((p) => p.endsWith('.tsx') && !p.endsWith('.test.tsx'))
    // Sort by filename basename so the order matches `fs.readdirSync().sort()`
    // that the on-disk `loadProject` uses — that way both paths produce
    // byte-identical documents for the same materials.
    .sort((a, b) => {
      const aFile = a.split('/').pop() ?? a;
      const bFile = b.split('/').pop() ?? b;
      return aFile.localeCompare(bFile);
    });

  for (const filePath of uiPaths) {
    const sourceText = sources.componentSources[filePath];
    const id = filePath.replace(/^.*components\/ui\//, '').replace(/\.tsx$/, '');
    try {
      components.push(parseComponentSource({ id, registryName: id, filePath, sourceText }));
    } catch (err) {
      // Skip and continue — better to import a partial project than to fail.
      console.warn(`[tincture] skipping unparseable component ${filePath}:`, err);
    }
  }

  const doc: ProjectDocument = {
    version: 1,
    meta: {
      name: sources.name,
      baseColor: componentsJson.tailwind.baseColor as ProjectDocument['meta']['baseColor'],
      colorSpace: 'oklch',
      config: componentsJson,
      themeImports,
    },
    tokens,
    components,
    overrides: [],
    presets: [],
  };

  return validateProjectDocument(doc);
}
