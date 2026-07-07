# Architecture

The whole design follows one rule: **the schema is the source of truth, and emitted code is a pure function of it.** Everything else — the editor, the renderer, the exporters — is a view onto that schema. This is what makes "edit visually, persist structurally, generate clean code" actually hold together instead of drifting.

## The four states

The brief asks for a clean separation between visual state, token state, component metadata, and emitted code. Keep these in separate stores with one-directional flow.

### 1. Visual / editor state (transient — never exported)

Ephemeral UI: which component is selected, which variant is showing, which interactive state is being previewed (`hover`, `focus-visible`, `active`, `disabled`), current viewport width, light/dark toggle, canvas zoom. None of this is persisted into output. It exists only to drive the editor.

### 2. Token state (persisted — the global theme)

The semantic design tokens: colors (light + dark), radius, typography, spacing, shadows, borders. This is the part that maps directly onto shadcn's CSS-variable theme. Editing a token here updates **every** component that consumes it.

### 3. Component metadata + overrides (persisted)

Per-component facts discovered from the codebase: the variant axes parsed out of `cva()`, the slots, the CSS variables and utility classes the component consumes, and the source file path. **Overrides** are the per-component deviations from the global theme (e.g. *this* button gets a tighter radius). Metadata drives the property panel; overrides drive scoped codegen.

### 4. Emitted code (derived — never edited as truth)

`components.json` patches, CSS variable blocks, `registry-item.json`, modified component source, and diffs. Always regenerated from 1–3 above. A user never hand-edits emitted code inside Mintcn; they edit intent, and the code follows.

> **Invariant:** the same project document always produces byte-identical output. No timestamps, no nondeterministic ordering, no machine-specific paths. This is what keeps exports clean in git.

---

## Module boundaries

```
src/
├── schema/          # types + zod validators for the project document (DATA-MODEL.md)
│   ├── tokens.ts
│   ├── component-meta.ts
│   ├── overrides.ts
│   └── project.ts
├── store/           # single source of truth; holds the project document
│   └── project-store.ts
├── ingest/          # read an existing shadcn codebase INTO the schema
│   ├── parse-components-json.ts
│   ├── parse-theme-css.ts        # read :root / .dark CSS vars
│   └── parse-component-source.ts # ts-morph: extract cva() variant axes & slots
├── editor/          # the visual UI: canvas + property panel
│   ├── canvas/
│   └── panels/      # color, spacing, radius, typography, borders, shadows, states
├── renderer/        # live preview: applies token state to real components
│   └── preview-root.tsx
├── codegen/         # emitters: schema -> output (CODEGEN.md)
│   ├── emit-theme-css.ts
│   ├── emit-components-json.ts
│   ├── emit-registry-item.ts
│   ├── emit-component-source.ts  # ts-morph: rewrite cva() variants
│   └── emit-diff.ts
└── presets/         # save/load named themes
```

The boundaries that matter most:

- **`ingest/` and `codegen/` are mirror images.** Ingest parses a codebase into the schema; codegen serializes the schema back out. They must round-trip: ingesting an untouched project and immediately re-emitting it should produce no diff. Treat a non-empty round-trip diff as a bug.
- **`editor/` only ever mutates the store.** It never writes files and never talks to `codegen/` directly.
- **`renderer/` is read-only** with respect to the schema. It subscribes to token + override state and reflects it; it never writes back.

---

## Data flow

```
                    ┌─────────────────────────────┐
   user action ───► │  editor/  (dispatch intent) │
                    └──────────────┬──────────────┘
                                   │ mutate
                                   ▼
                    ┌─────────────────────────────┐
                    │  store/  project document   │ ◄── ingest/ (initial load)
                    └───────┬──────────────┬───────┘
                  subscribe │              │ subscribe
                            ▼              ▼
                 ┌────────────────┐  ┌────────────────┐
                 │   renderer/    │  │   codegen/     │
                 │ (live preview) │  │ (on export)    │
                 └────────────────┘  └───────┬────────┘
                                             ▼
                                  files + diff to the user
```

The renderer recomputes on every store change (it must feel instant). Codegen runs on demand (export / diff view) — though it should be cheap enough to also drive a live "inspect the change" pane.

---

## The live-preview strategy (the make-or-break detail)

The success criterion is *what you see is what you export*. The only way to guarantee that is to make the preview render the **real** components styled by the **real** emitted variables — not a hand-built simulation that can drift.

There are two kinds of edits, and the renderer handles them differently:

### Fast path — token & scoped-variable edits (the common case)

shadcn v4 components reference theme tokens through CSS variables (`var(--primary)`, `var(--radius)`, etc.). So a token change needs **no recompile**: write the current token state as inline custom properties onto a wrapping preview root, and the cascade restyles every component beneath it instantly.

```tsx
// renderer/preview-root.tsx — conceptual
function PreviewRoot({ tokens, theme, children }) {
  const vars = tokensToCssVars(tokens, theme); // { '--primary': 'oklch(...)', ... }
  return (
    <div data-theme={theme} style={vars} className="mintcn-preview">
      {children}
    </div>
  );
}
```

Isolate it so editor styles don't leak into the preview and vice versa — a `@scope` block or a container with `container-type` works well, and is itself a nice dogfood of modern CSS.

### Structural path — class/variant edits

Some edits change the *classes* on a variant (e.g. switching a button's padding utilities), which can't be expressed purely as a variable. For these, regenerate a **scoped stylesheet** for the affected component and inject it as a `<style>` into the preview root, or run a lightweight Tailwind pass in a worker. Keyed by component + variant so only the touched component re-renders.

Either way, the bytes the preview uses are produced by the **same emitter** that produces the export. Never maintain two styling code paths — that's how previews start lying.

---

## Why this separation pays off later

Because intent lives in the schema and outputs are pure functions, you can add a new export target (say, a Style Dictionary export, or a Figma token sync) by writing one more emitter — no editor changes. And because component metadata is decoupled from any specific primitive library, you can later point codegen at a different headless foundation (Radix vs Base UI vs something newer) by swapping the component-adapter, without touching the token model. That audit is [Phase 2](MVP-PLAN.md#phase-2--foundation-audit).
