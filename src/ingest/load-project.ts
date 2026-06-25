import fs from 'node:fs';
import path from 'node:path';
import { type ComponentMeta, type ProjectDocument, validateProjectDocument } from '../schema';
import { parseComponentSource } from './parse-component-source';
import { parseComponentsJson } from './parse-components-json';
import { parseThemeCss } from './parse-theme-css';

const UI_DIR_SEGMENT = 'components/ui';

export interface LoadProjectOptions {
  /** Absolute path to the shadcn project root (contains components.json). */
  rootDir: string;
  /** Optional project display name; defaults to the rootDir basename. */
  name?: string;
}

function isComponentFile(file: string): boolean {
  return file.endsWith('.tsx') && !file.endsWith('.test.tsx');
}

function loadComponents(rootDir: string): ComponentMeta[] {
  const uiDir = path.join(rootDir, UI_DIR_SEGMENT);
  if (!fs.existsSync(uiDir)) return [];
  const entries = fs.readdirSync(uiDir).filter(isComponentFile).sort();
  return entries.map((file) => {
    const id = path.basename(file, '.tsx');
    const filePath = `${UI_DIR_SEGMENT}/${file}`;
    const sourceText = fs.readFileSync(path.join(uiDir, file), 'utf8');
    return parseComponentSource({
      id,
      registryName: id,
      filePath,
      sourceText,
    });
  });
}

/**
 * Load a shadcn project from disk into a validated ProjectDocument.
 *
 * The components.json is the source of truth for the Tailwind CSS entry path
 * (`tailwind.css`); the theme CSS is read from there. Components are loaded
 * from `components/ui/*.tsx`. The result is validated through the project
 * document schema before returning.
 */
export function loadProject(opts: LoadProjectOptions): ProjectDocument {
  const { rootDir, name = path.basename(rootDir) } = opts;

  const componentsJsonPath = path.join(rootDir, 'components.json');
  const componentsJson = parseComponentsJson(fs.readFileSync(componentsJsonPath, 'utf8'));

  const cssPath = path.join(rootDir, componentsJson.tailwind.css);
  const { tokens, themeImports } = parseThemeCss(fs.readFileSync(cssPath, 'utf8'));

  const components = loadComponents(rootDir);

  const doc: ProjectDocument = {
    version: 1,
    meta: {
      name,
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
