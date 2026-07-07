# Code Generation

Codegen turns the project document into files. Every emitter is a **pure function** `(ProjectDocument) => string | FileSet`. No I/O inside the function, no current time, no environment lookups — pass everything in. That's what makes output testable and git-clean.

There are five targets. They are independent; a user can export any subset.

```
ProjectDocument
   ├── emit-theme-css         →  app/globals.css  (the @layer base theme block + @theme inline)
   ├── emit-components-json   →  components.json   (config patch)
   ├── emit-registry-item     →  registry/<name>.json  (shadcn-native distributable)
   ├── emit-component-source  →  components/ui/<name>.tsx  (rewritten cva variants)
   └── emit-diff              →  unified diff of any of the above vs original
```

---

## 1. Theme CSS (`emit-theme-css`)

The highest-value, lowest-risk target. shadcn v4 keeps the theme as semantic CSS variables in a cascade layer, with a `@theme inline` block mapping them onto Tailwind utilities. Emit exactly that shape so it slots into a real `globals.css` untouched.

```css
@layer base {
  :root {
    --radius: 0.625rem;
    --background: oklch(1 0 0);
    --foreground: oklch(0.145 0 0);
    --primary: oklch(0.205 0 0);
    --primary-foreground: oklch(0.985 0 0);
    /* ...emit in canonical SemanticColorToken order... */
  }

  .dark {
    --background: oklch(0.145 0 0);
    --foreground: oklch(0.985 0 0);
    /* ... */
  }
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  /* ... */
}
```

**Derived colors:** a `ColorValue` of `kind: 'derived'` can emit either as a resolved literal or as a live expression. Prefer the live expression — it keeps the theme self-describing and recomputes correctly if the base changes:

```css
/* derived: hover = primary mixed 8% toward foreground */
--primary-hover: color-mix(in oklab, var(--primary) 92%, var(--foreground));
```

Provide a toggle (live `color-mix()` vs baked literal) for teams whose target browsers predate `color-mix()` — though as of 2025 it's widely available, so live is the sane default.

---

## 2. `components.json` patch (`emit-components-json`)

Read the existing file (via ingest), apply changes from `meta.config`, re-serialize. Only `baseColor`, `cssVariables`, `aliases`, `prefix`, and `registries` are typically editable; `baseColor` and `cssVariables` **cannot change after init** in shadcn, so surface that in the UI as a one-time/locked setting rather than letting a user silently produce an invalid config.

Keep key order stable and match the user's existing indentation.

---

## 3. `registry-item.json` (`emit-registry-item`) — the shadcn-native export

This is the format that makes Mintcn a first-class citizen of the shadcn ecosystem: a registry item can be installed into any project with `npx shadcn add`, and a collection of them can be served as a private namespaced registry. Emit theme edits via `cssVars` and any extra rules via `css`.

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "brand-theme",
  "type": "registry:theme",
  "cssVars": {
    "theme": { "font-sans": "Inter, sans-serif" },
    "light": { "primary": "oklch(0.205 0 0)", "radius": "0.625rem" },
    "dark":  { "primary": "oklch(0.985 0 0)" }
  },
  "css": {
    "@layer components": {
      ".btn-brand": { "border-radius": "var(--radius-sm)" }
    }
  }
}
```

Notes that matter for staying current:
- Use `cssVars.theme` / `cssVars.light` / `cssVars.dark`. The old `tailwind.config` property on registry items is deprecated for Tailwind v4 projects — don't emit it.
- For a component (not just a theme) the `type` is `registry:ui` and `files[]` carries the source; combine with `cssVars` to ship tokens alongside the component.

A nice product path: let a user publish their edited set as a namespaced registry (`@brand`) so teammates run `npx shadcn add @brand/button` and inherit the customizations. That is standardization-as-a-feature.

---

## 4. Component source (`emit-component-source`) — the hard one

When an override carries `variants` (class deltas), the actual `.tsx` must change. **Do this with a TypeScript AST (`ts-morph`), never string replacement.** The variant classes live inside the `cva()` call's config object; locate the right axis → option array and rewrite only its class string.

Pipeline:

1. Parse the original source into an AST.
2. Find the `cva(base, { variants: { ... } })` call for the component.
3. For each `ClassDelta`, resolve each logical-property entry to a utility (preferred, if a clean Tailwind utility exists) or to raw CSS appended in the theme/registry layer.
4. Apply `removeUtilities`, then merge `set`. De-duplicate and order classes deterministically (a fixed ordering function — e.g. by property group — so the same delta always yields the same string).
5. Print the AST and run it through Prettier/Biome.

```ts
// before
buttonVariants = cva("inline-flex items-center justify-center rounded-md ...", {
  variants: { size: { default: "h-9 px-4 py-2", sm: "h-8 px-3" } }
});

// after a delta on size.sm: { 'padding-inline': '1rem' }  →  px-3 swapped for px-4
buttonVariants = cva("inline-flex items-center justify-center rounded-md ...", {
  variants: { size: { default: "h-9 px-4 py-2", sm: "h-8 px-4" } }
});
```

If a delta can't be expressed as a clean utility, emit a small scoped rule into the theme layer (or the registry item's `css`) targeting the component's `data-slot`, rather than inventing an arbitrary class or an inline style. Keep the source readable: a strong engineer should look at the result and not be able to tell a machine wrote it.

---

## 5. Diff / patch (`emit-diff`)

For each target file, render *original* and *emitted* and produce a unified diff (`diff` / `jsdiff`), git-applyable. This powers the diff view and lets a user copy a patch instead of full files.

```diff
--- a/app/globals.css
+++ b/app/globals.css
@@ :root {
-  --primary: oklch(0.205 0 0);
+  --primary: oklch(0.21 0.04 264);
-  --radius: 0.5rem;
+  --radius: 0.625rem;
```

The diff must be **minimal and honest** — it should show only what truly changed. That's only possible if emit is deterministic and the round-trip is faithful (see below). A noisy diff means an ordering or formatting bug upstream, not a diff-tool problem.

---

## Determinism & round-trip (non-negotiable)

These two properties are what separate a tool whose output you trust from one you have to babysit:

1. **Deterministic.** Same document → byte-identical output, every run, every machine. Enforce by: canonical token ordering (driven by the `SemanticColorToken` list, never alphabetized), fixed class-ordering function, fixed numeric precision for color/length values, a single formatter pass on every file, and zero timestamps/paths baked into content.

2. **Faithful round-trip.** Ingesting an unedited shadcn project and immediately re-emitting must produce a **zero diff**. Add this as a CI test over a fixture project. If round-trip is dirty, every real diff a user sees will be polluted with noise — fix that before shipping anything else.

A practical test matrix:

| Test | Asserts |
|---|---|
| round-trip fixture | ingest → emit == original (zero diff) |
| determinism | emit(doc) == emit(doc) across two runs, byte-for-byte |
| token edit isolation | changing one token only changes lines for that token |
| cva rewrite | a class delta changes only the targeted variant option |
| derived emit | `color-mix()` output recomputes when base token changes |
