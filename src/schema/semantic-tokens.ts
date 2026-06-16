/**
 * Canonical emit order for shadcn's semantic color tokens.
 *
 * This list is the single source of truth used by both schema validators
 * and the theme-CSS emitter. Do not sort, alphabetize, or re-order at emit
 * time — a stable ordering here is what keeps generated diffs minimal.
 */
export const SEMANTIC_COLOR_TOKENS = [
  'background',
  'foreground',
  'card',
  'card-foreground',
  'popover',
  'popover-foreground',
  'primary',
  'primary-foreground',
  'secondary',
  'secondary-foreground',
  'muted',
  'muted-foreground',
  'accent',
  'accent-foreground',
  'destructive',
  'destructive-foreground',
  'border',
  'input',
  'ring',
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
  'sidebar',
  'sidebar-foreground',
  'sidebar-primary',
  'sidebar-primary-foreground',
  'sidebar-accent',
  'sidebar-accent-foreground',
  'sidebar-border',
  'sidebar-ring',
] as const;

export type SemanticColorToken = (typeof SEMANTIC_COLOR_TOKENS)[number];

export const SEMANTIC_COLOR_TOKEN_SET: ReadonlySet<SemanticColorToken> = new Set(
  SEMANTIC_COLOR_TOKENS,
);

export function isSemanticColorToken(value: string): value is SemanticColorToken {
  return SEMANTIC_COLOR_TOKEN_SET.has(value as SemanticColorToken);
}
