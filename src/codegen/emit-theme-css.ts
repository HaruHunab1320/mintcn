import {
  type ColorValue,
  type ProjectDocument,
  SEMANTIC_COLOR_TOKENS,
  type SemanticColorToken,
  type TokenState,
} from '@/schema';

function formatColorValue(value: ColorValue): string {
  if (value.kind === 'literal') return value.value;
  const basePercent = Math.round((1 - value.mix.amount) * 100);
  return `color-mix(in ${value.mix.space}, var(--${value.from}) ${basePercent}%, ${value.mix.toward})`;
}

function colorDeclLines(map: TokenState['colors']['light'], indent: string): string[] {
  return SEMANTIC_COLOR_TOKENS.map(
    (token: SemanticColorToken) => `${indent}--${token}: ${formatColorValue(map[token])};`,
  );
}

/**
 * Emit the shadcn-v4 theme CSS for a project document. Pure function — same
 * document, byte-identical output. Layout matches `shadcn init` for the
 * new-york / Tailwind v4 / cssVariables=true configuration; the round-trip
 * test asserts byte equality against fixtures/shadcn-app/app/globals.css.
 */
export function emitThemeCss(doc: ProjectDocument): string {
  const lines: string[] = [];

  lines.push('@import "tailwindcss";');
  lines.push('');
  lines.push('@custom-variant dark (&:is(.dark *));');
  lines.push('');

  const { fontFamily } = doc.tokens.typography;
  const shadowKeys = Object.keys(doc.tokens.shadows);

  lines.push('@theme inline {');
  lines.push(`  --font-sans: ${fontFamily.sans};`);
  lines.push(`  --font-serif: ${fontFamily.serif};`);
  lines.push(`  --font-mono: ${fontFamily.mono};`);
  for (const token of SEMANTIC_COLOR_TOKENS) {
    lines.push(`  --color-${token}: var(--${token});`);
  }
  lines.push('  --radius-sm: calc(var(--radius) - 4px);');
  lines.push('  --radius-md: calc(var(--radius) - 2px);');
  lines.push('  --radius-lg: var(--radius);');
  lines.push('  --radius-xl: calc(var(--radius) + 4px);');
  for (const name of shadowKeys) {
    lines.push(`  --shadow-${name}: ${doc.tokens.shadows[name]};`);
  }
  lines.push('}');
  lines.push('');

  lines.push('@layer base {');
  lines.push('  :root {');
  lines.push(`    --radius: ${doc.tokens.radius.base};`);
  for (const line of colorDeclLines(doc.tokens.colors.light, '    ')) lines.push(line);
  lines.push('  }');
  lines.push('');
  lines.push('  .dark {');
  for (const line of colorDeclLines(doc.tokens.colors.dark, '    ')) lines.push(line);
  lines.push('  }');
  lines.push('}');
  lines.push('');

  lines.push('@layer base {');
  lines.push('  * {');
  lines.push('    @apply border-border outline-ring/50;');
  lines.push('  }');
  lines.push('  body {');
  lines.push('    @apply bg-background text-foreground;');
  lines.push('  }');
  lines.push('}');

  return `${lines.join('\n')}\n`;
}
