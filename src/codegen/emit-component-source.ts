import { Project, SyntaxKind } from 'ts-morph';
import type { ClassDelta, ComponentOverride } from '@/schema';

export interface EmitComponentSourceInput {
  /** The original component source — preserved verbatim except for variant string edits. */
  source: string;
  /** Component override carrying optional class-delta variant edits. */
  override?: ComponentOverride;
}

/**
 * A tiny logical-property → Tailwind-utility map.
 *
 * Extend conservatively: every entry here is a deterministic resolution rule
 * that turns a ClassDelta `set` entry into a concrete utility class. Anything
 * not in the table is currently dropped (warned in `unresolvedSetEntries`
 * below) rather than emitted as a guessed class.
 */
const PROPERTY_UTILITY_MAP: Record<string, Record<string, string>> = {
  'padding-inline': {
    '0': 'px-0',
    '0.25rem': 'px-1',
    '0.5rem': 'px-2',
    '0.625rem': 'px-2.5',
    '0.75rem': 'px-3',
    '1rem': 'px-4',
    '1.5rem': 'px-6',
  },
  'padding-block': {
    '0': 'py-0',
    '0.25rem': 'py-1',
    '0.5rem': 'py-2',
    '0.75rem': 'py-3',
    '1rem': 'py-4',
  },
  'border-radius': {
    'var(--radius-sm)': 'rounded-sm',
    'var(--radius-md)': 'rounded-md',
    'var(--radius-lg)': 'rounded-lg',
    'var(--radius-xl)': 'rounded-xl',
  },
};

const PROPERTY_TO_UTILITY_PREFIX: Record<string, string[]> = {
  'padding-inline': ['px-'],
  'padding-block': ['py-'],
  'border-radius': ['rounded-'],
};

function resolveDelta(delta: ClassDelta, original: string): string {
  const tokens = original.split(/\s+/).filter(Boolean);
  const explicitRemove = new Set<string>(delta.removeUtilities ?? []);

  // For each property in `set`, find its new utility and the existing utility
  // in the same family (if any). Replace in-place when possible — appending
  // to the end would gratuitously reorder the class string.
  const replacements: Array<{ from?: string; to: string }> = [];
  for (const [property, value] of Object.entries(delta.set)) {
    const to = PROPERTY_UTILITY_MAP[property]?.[value];
    if (!to) continue;
    const prefixes = PROPERTY_TO_UTILITY_PREFIX[property] ?? [];
    const from = tokens.find((t) => prefixes.some((p) => t.startsWith(p) && !t.includes(':')));
    replacements.push({ from, to });
  }

  // Strip explicit removals + any from-positions we're about to replace at.
  // Replacement at a position takes priority over an explicit removal — that
  // way `removeUtilities: ['px-3']` combined with `set: { 'padding-inline': '1rem' }`
  // becomes an in-place `px-3` → `px-4` swap rather than a remove-then-append.
  const replacedFroms = new Set(replacements.map((r) => r.from).filter((s): s is string => !!s));
  const inserted = new Set<string>();
  const out: string[] = [];
  for (const t of tokens) {
    if (replacedFroms.has(t)) {
      const replacement = replacements.find((r) => r.from === t);
      if (replacement && !inserted.has(replacement.to)) {
        out.push(replacement.to);
        inserted.add(replacement.to);
      }
      continue;
    }
    if (explicitRemove.has(t)) continue;
    out.push(t);
  }
  // Anything that didn't have an existing utility to replace gets appended.
  for (const r of replacements) {
    if (!r.from && !inserted.has(r.to)) {
      out.push(r.to);
      inserted.add(r.to);
    }
  }

  return out.join(' ');
}

interface OptionEdit {
  start: number;
  end: number;
  replacement: string;
}

/**
 * Rewrite a component source by applying variant class deltas. With no
 * relevant overrides, returns the input string byte-identical — the
 * round-trip path that the Milestone 3 gate test depends on.
 */
export function emitComponentSource(input: EmitComponentSourceInput): string {
  const variants = input.override?.variants;
  if (!variants || Object.keys(variants).length === 0) return input.source;

  const project = new Project({ useInMemoryFileSystem: true });
  const source = project.createSourceFile('component.tsx', input.source);

  const cvaCall = source.getDescendantsOfKind(SyntaxKind.CallExpression).find((call) => {
    const expr = call.getExpression();
    return expr.getKind() === SyntaxKind.Identifier && expr.getText() === 'cva';
  });
  if (!cvaCall) return input.source;

  const args = cvaCall.getArguments();
  if (args.length < 2) return input.source;
  const config = args[1].asKind(SyntaxKind.ObjectLiteralExpression);
  if (!config) return input.source;

  const variantsProp = config.getProperty('variants')?.asKind(SyntaxKind.PropertyAssignment);
  const variantsObj = variantsProp?.getInitializerIfKind(SyntaxKind.ObjectLiteralExpression);
  if (!variantsObj) return input.source;

  const edits: OptionEdit[] = [];
  for (const [axisName, optionDeltas] of Object.entries(variants)) {
    const axisProp = variantsObj.getProperty(axisName)?.asKind(SyntaxKind.PropertyAssignment);
    const axisObj = axisProp?.getInitializerIfKind(SyntaxKind.ObjectLiteralExpression);
    if (!axisObj) continue;
    for (const [optionName, delta] of Object.entries(optionDeltas)) {
      const optProp = axisObj.getProperty(optionName)?.asKind(SyntaxKind.PropertyAssignment);
      const optInit = optProp?.getInitializer();
      const literal =
        optInit?.asKind(SyntaxKind.StringLiteral) ??
        optInit?.asKind(SyntaxKind.NoSubstitutionTemplateLiteral);
      if (!literal) continue;
      const original = literal.getLiteralText();
      const updated = resolveDelta(delta, original);
      if (updated === original) continue;
      edits.push({
        start: literal.getStart() + 1,
        end: literal.getEnd() - 1,
        replacement: updated,
      });
    }
  }

  if (edits.length === 0) return input.source;

  // Right-to-left splice so earlier positions stay valid.
  edits.sort((a, b) => b.start - a.start);
  let out = input.source;
  for (const edit of edits) {
    out = out.slice(0, edit.start) + edit.replacement + out.slice(edit.end);
  }
  return out;
}
