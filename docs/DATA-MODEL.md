# Data Model

This is the source of truth for the entire app. Everything the editor does is a mutation of the **project document**; everything codegen does is a serialization of it. Define these as TypeScript types with `zod` (or `valibot`) validators so ingest can fail loudly on malformed input.

The shapes below are a starting contract, written to map cleanly onto shadcn's actual output formats (the semantic token set, `components.json`, and `registry-item.json`). Refine as you go, but keep the round-trip and determinism invariants from [`ARCHITECTURE.md`](ARCHITECTURE.md).

---

## The project document

```ts
interface ProjectDocument {
  version: 1;
  meta: {
    name: string;
    baseColor: 'neutral' | 'stone' | 'zinc' | 'slate' | 'gray';
    /** Storage/emit color space. shadcn v4 defaults toward oklch. */
    colorSpace: 'oklch' | 'hsl';
    /** Mirrors components.json so emit + round-trip stay faithful. */
    config: ComponentsJsonShape;
  };
  tokens: TokenState;              // global theme
  components: ComponentMeta[];     // discovered from the codebase
  overrides: ComponentOverride[];  // per-component deviations
  presets: Preset[];               // saved themes
}
```

`version` exists so the document can be migrated as the schema evolves. Bump it and write a migration rather than silently changing shapes.

---

## Token state (the global theme)

These map 1:1 onto the semantic CSS variables shadcn writes into `@layer base` (`:root` and `.dark`). Store values **space-agnostic** and let the emitter render them in the target space.

```ts
interface TokenState {
  colors: {
    light: Record<SemanticColorToken, ColorValue>;
    dark:  Record<SemanticColorToken, ColorValue>;
  };
  radius: { base: string };                 // --radius, e.g. '0.625rem'
  typography: {
    fontFamily: Record<'sans' | 'serif' | 'mono', string>;
    scale: TypeScaleEntry[];                // optional size/line-height ramp
  };
  spacing: ScaleEntry[];                     // optional spacing-scale overrides
  shadows: Record<string, string>;           // e.g. { sm, md, lg }
  borders: { width: Record<string, string> };
}

/** The shadcn semantic token set. Keep this list canonical & ordered — */
/** emit order is derived from it, which is what keeps diffs stable.     */
type SemanticColorToken =
  | 'background' | 'foreground'
  | 'card' | 'card-foreground'
  | 'popover' | 'popover-foreground'
  | 'primary' | 'primary-foreground'
  | 'secondary' | 'secondary-foreground'
  | 'muted' | 'muted-foreground'
  | 'accent' | 'accent-foreground'
  | 'destructive' | 'destructive-foreground'
  | 'border' | 'input' | 'ring'
  | 'chart-1' | 'chart-2' | 'chart-3' | 'chart-4' | 'chart-5'
  | 'sidebar' | 'sidebar-foreground' | 'sidebar-primary'
  | 'sidebar-primary-foreground' | 'sidebar-accent'
  | 'sidebar-accent-foreground' | 'sidebar-border' | 'sidebar-ring';
```

### Color values — store recipes, not just literals

A color is either a literal in some space, or a **derivation** from another token. Storing derivations (rather than baking them into literals) is what lets the editor emit `color-mix()` and relative-color CSS — and it keeps a theme coherent when you change one base color.

```ts
type ColorValue =
  | { kind: 'literal'; space: 'oklch' | 'hsl' | 'srgb'; value: string }
  | {
      kind: 'derived';
      /** e.g. hover state = base mixed toward foreground by 8% */
      from: SemanticColorToken;
      mix: { space: 'oklch' | 'srgb'; toward: string; amount: number };
    };
```

The emitter decides whether a `derived` value becomes a literal or a live `color-mix(...)` in the output — see [`CODEGEN.md`](CODEGEN.md). Prefer emitting `color-mix()` where it keeps the theme self-describing.

```ts
interface TypeScaleEntry { name: string; size: string; lineHeight: string; weight?: number }
interface ScaleEntry { name: string; value: string }
```

---

## Component metadata (discovered, read-mostly)

Produced by `ingest/parse-component-source.ts` using a TypeScript AST. It describes what a component exposes so the property panel knows what to show and codegen knows what to rewrite.

```ts
interface ComponentMeta {
  id: string;                  // 'button'
  registryName: string;        // matches the registry-item name
  source: { path: string };    // 'components/ui/button.tsx'
  variants: VariantAxis[];     // parsed out of cva()
  slots: Slot[];               // data-slot targets within the component
  states: InteractiveState[];  // which states it styles
  consumes: {
    cssVars: string[];         // e.g. ['--primary','--primary-foreground','--radius']
    utilities: string[];       // tailwind utilities present on each variant
  };
}

interface VariantAxis {
  name: string;                // 'variant' | 'size'
  options: string[];           // ['default','destructive','outline',...]
  default: string;
}

interface Slot { name: string; selector: string }  // 'icon' -> '[data-slot="icon"]'
type InteractiveState = 'hover' | 'focus-visible' | 'active' | 'disabled';
```

> Parse `cva()` rather than regexing class strings. The variant axes, their options, and the per-option class lists all live in the `cva` config object; reading them structurally is what lets you edit them structurally later.

---

## Overrides (per-component intent)

The deltas a user creates. Two flavors: scoped variable overrides (cheap, var-based) and structured class deltas (require a source rewrite).

```ts
interface ComponentOverride {
  componentId: string;

  /** Scoped CSS var overrides — emitted as a scoped block, no source edit. */
  scopedVars?: Record<string, ColorValue | string>;

  /** Per-axis, per-option class edits — emitted by rewriting cva(). */
  variants?: Record<string /*axis*/, Record<string /*option*/, ClassDelta>>;
}

interface ClassDelta {
  /** logical property -> value; the emitter maps to a utility or raw CSS. */
  set: Record<string, string>;     // e.g. { 'padding-inline': '1rem', 'border-radius': 'var(--radius-sm)' }
  /** utilities to strip when they conflict with `set`. */
  removeUtilities?: string[];
}
```

Storing edits as **logical-property deltas** (`padding-inline`, not `pl-4 pr-4`) keeps overrides framework-neutral and RTL-correct, and lets the emitter choose the cleanest representation (a Tailwind utility when one exists, raw CSS otherwise).

---

## Presets

```ts
interface Preset {
  id: string;
  name: string;
  tokens: TokenState;                 // a full theme snapshot
  overrides?: ComponentOverride[];    // optional, if a preset bundles component tweaks
}
```

Presets are just named snapshots of token state (and optionally overrides). Save = copy current into a preset; load = replace current with the preset's contents.

---

## `components.json` shape (mirrored)

Keep a faithful mirror of the file so ingest → edit → emit round-trips without surprises. Notable current fields: `style`, `rsc`, `tsx`, `tailwind.{css,baseColor,cssVariables,prefix}` (in Tailwind v4 the `tailwind.config` path is left blank), `aliases.{components,ui,utils,lib,hooks}`, and `registries` for namespaced sources.

```ts
interface ComponentsJsonShape {
  $schema?: string;
  style: string;                       // e.g. 'new-york'
  rsc: boolean;
  tsx: boolean;
  tailwind: {
    config: '';                        // blank for Tailwind v4
    css: string;                       // path to the CSS entry that imports tailwind
    baseColor: string;
    cssVariables: boolean;
    prefix: string;
  };
  iconLibrary?: string;                // e.g. 'lucide'
  aliases: Record<'components'|'ui'|'utils'|'lib'|'hooks', string>;
  registries?: Record<string, unknown>;
}
```

---

## Validation & invariants

- Validate the whole document on ingest and before every export. Reject rather than emit something malformed.
- `SemanticColorToken` ordering is canonical and drives emit order — **do not** sort by insertion or alphabetize at emit time.
- Every `derived` color must resolve to a real base token (no dangling references).
- A clean ingest (no user edits) must re-emit to a **zero diff**. Add a test that asserts this against a fixture shadcn project.
