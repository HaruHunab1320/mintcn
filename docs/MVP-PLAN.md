# Build Plan

An ordered, agent-executable plan. Each milestone is shippable and testable on its own. Build in this order — later milestones depend on the schema and round-trip guarantees established early. Don't skip the round-trip test; everything downstream relies on it.

## Guiding constraints (apply to every task)

- The schema is the source of truth; emitted code is a pure function of it (see [`ARCHITECTURE.md`](ARCHITECTURE.md)).
- Emitters are pure and deterministic; ingest ↔ emit must round-trip to a zero diff (see [`CODEGEN.md`](CODEGEN.md)).
- Prefer native CSS over JS (see [`CSS-STRATEGY.md`](CSS-STRATEGY.md)).
- Output must be commit-ready with no cleanup. This is the acceptance bar for the whole project.

---

## Milestone 0 — Scaffold & fixtures

- [ ] Scaffold the app (React 19 + Vite, or Next.js 16 if registry hosting is wanted soon). Tailwind v4, shadcn/ui initialized.
- [ ] Add a **fixture shadcn project** under `fixtures/` — a real `components.json`, a `globals.css` theme, and a handful of components (`button`, `card`, `input`, `badge`). This is the test target for round-trip from day one.
- [ ] Set up the formatter (Prettier or Biome) and wire it into the emit pipeline.
- [ ] Set up the test runner (Vitest) and a Playwright harness for later visual checks.

**Done when:** the fixture renders and the test runner is green on an empty suite.

---

## Milestone 1 — Schema + store

- [ ] Implement the types and `zod` validators from [`DATA-MODEL.md`](DATA-MODEL.md): `TokenState`, `ComponentMeta`, `ComponentOverride`, `Preset`, `ProjectDocument`, `ComponentsJsonShape`.
- [ ] Implement the project store (single source of truth) with typed mutations.
- [ ] Add the canonical `SemanticColorToken` ordering as a shared constant used by both validation and emit.

**Done when:** a hand-written `ProjectDocument` validates, and invalid ones are rejected with useful errors.

---

## Milestone 2 — Ingest (codebase → schema)

- [ ] `parse-components-json.ts` — read the fixture's config into `meta.config`.
- [ ] `parse-theme-css.ts` — read `:root` / `.dark` CSS variables into `TokenState`.
- [ ] `parse-component-source.ts` — use `ts-morph` to extract `cva()` variant axes, options, slots, and consumed tokens into `ComponentMeta[]`.

**Done when:** ingesting the fixture produces a complete, valid `ProjectDocument`.

---

## Milestone 3 — Codegen + the round-trip gate

Build emitters before the UI, so the UI always has a trustworthy target.

- [ ] `emit-theme-css.ts` — `@layer base` (`:root` + `.dark`) and `@theme inline`, canonical order, `color-mix()` for derived values.
- [ ] `emit-components-json.ts` — config patch with stable key order.
- [ ] `emit-registry-item.ts` — `registry-item.json` with `cssVars.{theme,light,dark}` and `css`.
- [ ] `emit-component-source.ts` — `ts-morph` rewrite of `cva()` variants from `ClassDelta`s.
- [ ] `emit-diff.ts` — unified, git-applyable diffs.
- [ ] **Round-trip test:** ingest fixture → emit → assert zero diff. **Determinism test:** emit twice → assert byte-identical.

**Done when:** both gate tests pass. Treat them as blocking for all later work.

---

## Milestone 4 — Live preview / renderer

- [ ] `preview-root.tsx` — render real fixture components inside a root that receives the current token state as inline CSS variables (fast path).
- [ ] Structural path: regenerate a scoped stylesheet for class/variant edits and inject it into the preview root.
- [ ] Light/dark toggle via `data-theme`; resizable canvas using container queries.
- [ ] State preview (`hover` / `focus-visible` / `active` / `disabled`).

**Done when:** changing a token in the store visibly restyles the preview instantly, and the preview uses the *same* emitter output as export (no second styling path).

---

## Milestone 5 — Property panel (the visual editor)

Build panel sections against the schema. Each writes deltas into the store, which flow to both preview and codegen.

- [ ] Color (semantic tokens, light/dark, OKLCH picker, derived/`color-mix` editor).
- [ ] Radius, borders, shadows.
- [ ] Typography (family, scale).
- [ ] Spacing / layout.
- [ ] States (per-state token overrides).
- [ ] Component selector + variant switcher (driven by `ComponentMeta`).

**Done when:** every panel edit is reflected live and shows up correctly in the diff view.

---

## Milestone 6 — Diff view, presets, export

- [ ] Diff view: per-file diffs for all targets, copy-as-patch.
- [ ] Export: write/download the chosen file set.
- [ ] Presets: save/load named themes; switch between them.

**Done when:** a user can edit → inspect the diff → export → drop the files into the fixture project with **zero cleanup**, and the project builds.

---

## MVP acceptance test (the real bar)

Script it end to end against the fixture:

1. Ingest the fixture project.
2. Change `--primary`, tighten `--radius`, and edit the `button` `size.sm` padding.
3. Confirm the live preview reflects all three.
4. Export theme CSS + the rewritten `button.tsx`.
5. Apply the output to the fixture and run its build/lint.
6. Assert: build passes, lint passes, and the diff contains **only** the three intended changes — no formatting noise.

If step 6 shows noise, fix determinism/round-trip before calling the MVP done.

---

## Phase 2 — Foundation audit

After the MVP, decide whether to stay targeted on the shadcn ecosystem or generalize. The brief frames this as: lean on shadcn-generated code, Radix primitives, or a newer unstyled foundation. The landscape now has three real options:

| Option | What it is | Pros | Cons |
|---|---|---|---|
| **shadcn-generated (Radix-based)** | The current default: components you own, built on Radix, distributed via the registry. | Largest ecosystem, RSC support, registry/`apply` distribution, exactly what most users already have. | Tied to Radix's primitive set and conventions. |
| **Radix primitives directly** | Target the unified `radix-ui` package under the generated source. | Mature, accessible, battle-tested. | Lower-level; you'd reproduce styling shadcn already standardizes. |
| **Base UI** | The newer headless foundation (shadcn now ships blocks for both Radix and Base UI). | Modern, lean, strong native-CSS fit — the "newer unstyled foundation" the brief hints at. | Younger ecosystem; fewer existing components in the wild. |

**Recommendation to validate, not assume:** keep the MVP targeting shadcn's `registry-item.json` output — that's where the existing users are and where the standardization win is largest. But isolate a **component-adapter layer** between `ComponentMeta` and the emitters so the token model never hard-codes a primitive library. If Phase 2 finds Base UI's native-CSS fit and maintenance story compelling, you swap the adapter — not the schema, not the editor, not the token model.

The decision rubric for the audit:
- Does the foundation let the emitted code stay closer to plain CSS (less JS, cleaner diffs)?
- Does it preserve accessible semantics out of the box?
- Is its component coverage enough that users can actually adopt it without falling back to hand-writing primitives?
- Does targeting it widen or narrow the set of real codebases Tincture can edit today?

Answer those against real components — not vibes — before committing to a direction.
