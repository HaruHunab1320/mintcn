import {
  type CallExpression,
  type ObjectLiteralExpression,
  Project,
  type PropertyAssignment,
  type SourceFile,
  SyntaxKind,
} from 'ts-morph';
import {
  type ComponentMeta,
  type InteractiveState,
  isSemanticColorToken,
  type Slot,
  type VariantAxis,
} from '@/schema';

const INTERACTIVE_STATE_RE = /(?:^|[\s:])(hover|focus-visible|active|disabled):/g;
const UTILITY_COLOR_PREFIXES = [
  'bg',
  'text',
  'border',
  'ring',
  'outline',
  'fill',
  'stroke',
  'from',
  'to',
  'via',
  'accent',
  'caret',
  'decoration',
  'placeholder',
  'shadow',
  'divide',
];

export interface ParseComponentSourceInput {
  id: string;
  registryName: string;
  filePath: string;
  sourceText: string;
}

function getObjectLiteralProperty(
  obj: ObjectLiteralExpression,
  name: string,
): PropertyAssignment | undefined {
  const prop = obj.getProperty(name);
  if (!prop) return undefined;
  return prop.asKind(SyntaxKind.PropertyAssignment);
}

function objectLiteralStringMap(obj: ObjectLiteralExpression): Map<string, string> {
  const out = new Map<string, string>();
  for (const prop of obj.getProperties()) {
    const pa = prop.asKind(SyntaxKind.PropertyAssignment);
    if (!pa) continue;
    const key = pa.getName();
    const init = pa.getInitializer();
    if (!init) continue;
    if (init.getKind() === SyntaxKind.StringLiteral) {
      out.set(key, init.asKindOrThrow(SyntaxKind.StringLiteral).getLiteralText());
    } else if (init.getKind() === SyntaxKind.NoSubstitutionTemplateLiteral) {
      out.set(key, init.asKindOrThrow(SyntaxKind.NoSubstitutionTemplateLiteral).getLiteralText());
    }
  }
  return out;
}

function findCvaCall(source: SourceFile): CallExpression | undefined {
  return source.getDescendantsOfKind(SyntaxKind.CallExpression).find((call) => {
    const expr = call.getExpression();
    return expr.getKind() === SyntaxKind.Identifier && expr.getText() === 'cva';
  });
}

interface CvaExtraction {
  variants: VariantAxis[];
  variantOptionClasses: Map<string, string>;
}

function extractCva(call: CallExpression): CvaExtraction {
  const args = call.getArguments();
  const variants: VariantAxis[] = [];
  const variantOptionClasses = new Map<string, string>();
  if (args.length < 2) return { variants, variantOptionClasses };

  const config = args[1].asKind(SyntaxKind.ObjectLiteralExpression);
  if (!config) return { variants, variantOptionClasses };

  const variantsProp = getObjectLiteralProperty(config, 'variants');
  const defaultVariantsProp = getObjectLiteralProperty(config, 'defaultVariants');

  const defaults = new Map<string, string>();
  if (defaultVariantsProp) {
    const defaultsObj = defaultVariantsProp.getInitializerIfKind(
      SyntaxKind.ObjectLiteralExpression,
    );
    if (defaultsObj) for (const [k, v] of objectLiteralStringMap(defaultsObj)) defaults.set(k, v);
  }

  if (variantsProp) {
    const variantsObj = variantsProp.getInitializerIfKind(SyntaxKind.ObjectLiteralExpression);
    if (variantsObj) {
      for (const axisProp of variantsObj.getProperties()) {
        const pa = axisProp.asKind(SyntaxKind.PropertyAssignment);
        if (!pa) continue;
        const axisName = pa.getName();
        const optionsObj = pa.getInitializerIfKind(SyntaxKind.ObjectLiteralExpression);
        if (!optionsObj) continue;
        const optionMap = objectLiteralStringMap(optionsObj);
        const options = [...optionMap.keys()];
        if (options.length === 0) continue;
        for (const [opt, cls] of optionMap) {
          variantOptionClasses.set(`${axisName}.${opt}`, cls);
        }
        variants.push({
          name: axisName,
          options,
          default: defaults.get(axisName) ?? options[0],
        });
      }
    }
  }

  return { variants, variantOptionClasses };
}

function extractDataSlots(source: SourceFile): Slot[] {
  const slots = new Map<string, string>();
  for (const attr of source.getDescendantsOfKind(SyntaxKind.JsxAttribute)) {
    if (attr.getNameNode().getText() !== 'data-slot') continue;
    const init = attr.getInitializer();
    if (!init) continue;
    const literal = init.asKind(SyntaxKind.StringLiteral);
    if (!literal) continue;
    const name = literal.getLiteralText();
    slots.set(name, `[data-slot="${name}"]`);
  }
  return [...slots.entries()].map(([name, selector]) => ({ name, selector }));
}

function collectClassStrings(source: SourceFile, cvaClassFragments: Iterable<string>): string[] {
  const out = new Set<string>();
  for (const fragment of cvaClassFragments) out.add(fragment);
  for (const lit of source.getDescendantsOfKind(SyntaxKind.StringLiteral)) {
    const text = lit.getLiteralText();
    if (text.length === 0) continue;
    // Heuristic: looks like a className string if it contains a typical utility token.
    if (
      /\b(?:bg|text|border|flex|grid|rounded|p-|px-|py-|m-|h-|w-|gap-|shadow|inline|focus|hover|disabled|aria|data)/.test(
        text,
      )
    ) {
      out.add(text);
    }
  }
  return [...out];
}

function deriveConsumes(classFragments: string[]) {
  const cssVars = new Set<string>();
  const utilities = new Set<string>();
  for (const fragment of classFragments) {
    for (const token of fragment.split(/\s+/)) {
      if (!token) continue;
      utilities.add(token);
      const bare = token.replace(/^[a-z-]+:/g, ''); // strip state prefixes like hover:, dark:
      const match = bare.match(/^([a-z]+)-([a-z0-9-]+?)(?:\/\d+)?$/);
      if (!match) continue;
      const [, prefix, rawName] = match;
      if (!UTILITY_COLOR_PREFIXES.includes(prefix)) continue;
      if (isSemanticColorToken(rawName)) cssVars.add(`--${rawName}`);
    }
  }
  return {
    cssVars: [...cssVars].sort(),
    utilities: [...utilities].sort(),
  };
}

function deriveStates(classFragments: string[]): InteractiveState[] {
  const states = new Set<InteractiveState>();
  for (const fragment of classFragments) {
    for (const m of fragment.matchAll(INTERACTIVE_STATE_RE)) {
      states.add(m[1] as InteractiveState);
    }
  }
  return [...states];
}

/**
 * Parse a single component source file into a ComponentMeta. Pure: takes the
 * file's text + identity, returns metadata. No filesystem access.
 */
export function parseComponentSource(input: ParseComponentSourceInput): ComponentMeta {
  const project = new Project({ useInMemoryFileSystem: true });
  const source = project.createSourceFile(`${input.id}.tsx`, input.sourceText);

  const cvaCall = findCvaCall(source);
  const cva = cvaCall ? extractCva(cvaCall) : { variants: [], variantOptionClasses: new Map() };

  const classFragments = collectClassStrings(source, cva.variantOptionClasses.values());
  const consumes = deriveConsumes(classFragments);
  const states = deriveStates(classFragments);
  const slots = extractDataSlots(source);

  return {
    id: input.id,
    registryName: input.registryName,
    source: { path: input.filePath },
    variants: cva.variants,
    slots,
    states,
    consumes,
  };
}
