import type { ComponentsJsonShape, ProjectDocument } from '@/schema';

function buildOrdered(config: ComponentsJsonShape): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (config.$schema !== undefined) out.$schema = config.$schema;
  out.style = config.style;
  out.rsc = config.rsc;
  out.tsx = config.tsx;
  out.tailwind = {
    config: config.tailwind.config,
    css: config.tailwind.css,
    baseColor: config.tailwind.baseColor,
    cssVariables: config.tailwind.cssVariables,
    prefix: config.tailwind.prefix,
  };
  if (config.iconLibrary !== undefined) out.iconLibrary = config.iconLibrary;
  out.aliases = {
    components: config.aliases.components,
    utils: config.aliases.utils,
    ui: config.aliases.ui,
    lib: config.aliases.lib,
    hooks: config.aliases.hooks,
  };
  if (config.registries !== undefined) out.registries = config.registries;
  return out;
}

/**
 * Emit components.json from the project document. Key order is fixed (matches
 * `shadcn init` for Tailwind v4) so the same document always serializes to
 * byte-identical JSON.
 */
export function emitComponentsJson(doc: ProjectDocument): string {
  return `${JSON.stringify(buildOrdered(doc.meta.config), null, 2)}\n`;
}
