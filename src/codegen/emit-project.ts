import type { ProjectDocument } from '@/schema';
import { emitComponentSource } from './emit-component-source';
import { emitComponentsJson } from './emit-components-json';
import { type EmitRegistryItemOptions, emitRegistryItem } from './emit-registry-item';
import { emitThemeCss } from './emit-theme-css';

export interface EmittedFile {
  /** Path relative to the project root (e.g. `app/globals.css`). */
  path: string;
  /** What the emitter produced for this document. */
  emitted: string;
  /** The on-disk source bytes the emitter is rewriting, when available. */
  original?: string;
  /** True when the file is brand-new (no original to compare against). */
  isNew: boolean;
}

export interface EmitProjectInput {
  document: ProjectDocument;
  originals: Record<string, string>;
  registryItem?: EmitRegistryItemOptions;
}

/**
 * Run every emitter in one pass and return a path → file record for the
 * complete output set. Pure: same inputs produce byte-identical output, same
 * determinism guarantees as the individual emitters.
 *
 * Layout:
 *   - `app/globals.css` — emitThemeCss
 *   - `components.json` — emitComponentsJson
 *   - `registry/<name>.json` — emitRegistryItem (always new)
 *   - `components/ui/<id>.tsx` — only when an override exists for that id
 */
export function emitProject(input: EmitProjectInput): EmittedFile[] {
  const { document, originals } = input;
  const out: EmittedFile[] = [];

  const cssPath = document.meta.config.tailwind.css;
  out.push({
    path: cssPath,
    emitted: emitThemeCss(document),
    original: originals[cssPath],
    isNew: !(cssPath in originals),
  });

  const componentsJsonPath = 'components.json';
  out.push({
    path: componentsJsonPath,
    emitted: emitComponentsJson(document),
    original: originals[componentsJsonPath],
    isNew: !(componentsJsonPath in originals),
  });

  // Registry item is always emitted as a new artifact under registry/.
  const registryName = input.registryItem?.name ?? `${document.meta.name}-theme`;
  const registryPath = `registry/${registryName}.json`;
  out.push({
    path: registryPath,
    emitted: emitRegistryItem(document, input.registryItem),
    isNew: true,
  });

  // Component source rewrites: only emit when an override targets the component.
  for (const component of document.components) {
    const override = document.overrides.find((o) => o.componentId === component.id);
    if (!override?.variants && !override?.scopedVars) continue;
    const original = originals[component.source.path];
    if (original === undefined) continue;
    const emitted = emitComponentSource({ source: original, override });
    if (emitted === original) continue;
    out.push({
      path: component.source.path,
      emitted,
      original,
      isNew: false,
    });
  }

  return out;
}

/** Convenience: keep only files whose content actually differs from their original. */
export function changedFiles(files: EmittedFile[]): EmittedFile[] {
  return files.filter((f) => f.isNew || f.emitted !== f.original);
}
