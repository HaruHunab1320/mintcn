/**
 * Splitting and rejoining Tailwind class strings by breakpoint prefix, used
 * by the responsive tab editor in OverridePanel.
 *
 * Only the leading breakpoint prefix is stripped — compound state prefixes
 * like `md:hover:bg-primary` stay intact after the breakpoint peel
 * (`hover:bg-primary` in the `md` bucket). `dark:` isn't a breakpoint;
 * `dark:bg-slate-900` stays in `base`, `md:dark:bg-slate-900` in `md`.
 *
 * We deliberately don't split by container-query prefixes (`@sm:`, `@md:`);
 * shadcn's canonical components use viewport-based responsive utilities.
 */

export const BREAKPOINTS = ['base', 'sm', 'md', 'lg', 'xl', '2xl'] as const;
export type Breakpoint = (typeof BREAKPOINTS)[number];

export type BreakpointBuckets = Record<Breakpoint, string>;

// Longest prefixes first so `2xl:` matches before `xl:` prefix.
const PREFIX_ORDER = ['2xl', 'xl', 'lg', 'md', 'sm'] as const;

export function splitByBreakpoint(classString: string): BreakpointBuckets {
  const raw: Record<Breakpoint, string[]> = {
    base: [],
    sm: [],
    md: [],
    lg: [],
    xl: [],
    '2xl': [],
  };
  for (const token of classString.split(/\s+/).filter(Boolean)) {
    let placed = false;
    for (const bp of PREFIX_ORDER) {
      if (token.startsWith(`${bp}:`)) {
        raw[bp].push(token.slice(bp.length + 1));
        placed = true;
        break;
      }
    }
    if (!placed) raw.base.push(token);
  }
  return {
    base: raw.base.join(' '),
    sm: raw.sm.join(' '),
    md: raw.md.join(' '),
    lg: raw.lg.join(' '),
    xl: raw.xl.join(' '),
    '2xl': raw['2xl'].join(' '),
  };
}

export function joinByBreakpoint(buckets: BreakpointBuckets): string {
  const parts: string[] = [];
  const base = buckets.base.trim();
  if (base) parts.push(base);
  for (const bp of ['sm', 'md', 'lg', 'xl', '2xl'] as const) {
    const bucket = buckets[bp].trim();
    if (!bucket) continue;
    const prefixed = bucket
      .split(/\s+/)
      .filter(Boolean)
      // Some users will type the prefix already (`md:text-sm`) in the md tab;
      // don't double-prefix it.
      .map((tok) => (tok.startsWith(`${bp}:`) ? tok : `${bp}:${tok}`));
    parts.push(prefixed.join(' '));
  }
  return parts.join(' ');
}
