import type { ColorValue, ProjectDocument } from '@/schema';
import { SEMANTIC_COLOR_TOKENS } from '@/schema';

function resolveColorValue(value: ColorValue): string {
  if (value.kind === 'literal') return value.value;
  const basePercent = Math.round((1 - value.mix.amount) * 100);
  return `color-mix(in ${value.mix.space}, var(--${value.from}) ${basePercent}%, ${value.mix.toward})`;
}

export interface EmitRegistryItemOptions {
  /** Registry item name. Defaults to `${doc.meta.name}-theme`. */
  name?: string;
}

/**
 * Emit a shadcn registry-item.json describing the project's theme. Targets
 * the Tailwind v4 cssVars.{theme,light,dark} shape; consumers can install via
 * `npx shadcn add` once published.
 */
export function emitRegistryItem(doc: ProjectDocument, opts: EmitRegistryItemOptions = {}): string {
  const name = opts.name ?? `${doc.meta.name}-theme`;

  const theme: Record<string, string> = { radius: doc.tokens.radius.base };
  const light: Record<string, string> = {};
  const dark: Record<string, string> = {};
  for (const token of SEMANTIC_COLOR_TOKENS) {
    light[token] = resolveColorValue(doc.tokens.colors.light[token]);
    dark[token] = resolveColorValue(doc.tokens.colors.dark[token]);
  }

  const item = {
    $schema: 'https://ui.shadcn.com/schema/registry-item.json',
    name,
    type: 'registry:theme',
    cssVars: { theme, light, dark },
  };

  return `${JSON.stringify(item, null, 2)}\n`;
}
