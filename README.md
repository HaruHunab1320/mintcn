# Mintcn

> Working codename — rename freely. A visual customization layer and code generator for shadcn-style component systems.

**Mintcn** is a design-time editor for shadcn/ui codebases. You select a component, change its styling and behavior visually, watch a live preview update instantly, inspect exactly which tokens and classes changed, and then export the result as **clean, commit-ready code** that drops straight into a real project.

It is deliberately **not another component library**. shadcn/ui already solved component distribution by shipping source code you own. Mintcn extends that model with the missing piece: a visual editor and deterministic code generator that sits *on top of* the components you already have.

```
edit visually  →  persist structurally  →  generate clean code
```

---

## What it is

- A **component playground** with a live, accurate preview.
- A **design-token editor** for the semantic theme (colors, radius, typography, spacing, shadows, borders, states).
- A **code generator** that serializes your edits into the formats a shadcn codebase actually uses.

## What it is not

- Not a runtime wrapper. Mintcn emits no opaque abstraction that wraps your components at runtime — it edits the source.
- Not a replacement for shadcn/ui. It targets shadcn's existing output formats (`components.json`, CSS variable themes, `registry-item.json`, component source).
- Not a competitor on component count. The value is in **accelerating customization and standardizing a design system**, not in shipping more buttons.

---

## Core capabilities (MVP)

| Capability | Description |
|---|---|
| **Component canvas** | Live preview of real shadcn components with the current theme applied. |
| **Property panel** | Visual editing of spacing, radius, typography, color, borders, shadows, layout, and interactive states. |
| **Token/config model** | A single structured source of truth that all edits write to. |
| **Export engine** | Emits `components.json` patches, CSS variable themes, `registry-item.json`, and modified component source. |
| **Diff view** | A git-applyable unified diff showing exactly what changed. |
| **Presets / themes** | Save, load, and switch between named theme presets. |

---

## Why it works on a modern stack

Mintcn targets the current shadcn model: **Tailwind CSS v4** with CSS-first configuration, semantic CSS variables defined in cascade layers, and the registry distribution system. Where the brief calls for "the most modern CSS that's safe in production," the project leans on **CSS variables, `:has()`, container queries, cascade layers, subgrid, `color-mix()`, and logical properties** — all of which are widely available across current browsers — and treats anything still settling (e.g. `@scope`, anchor positioning) as progressive enhancement behind `@supports`. The principle throughout: **if a behavior can be expressed natively in CSS, prefer that over JavaScript.**

See [`docs/CSS-STRATEGY.md`](docs/CSS-STRATEGY.md) for the full feature matrix and fallback policy.

---

## Architecture at a glance

Four cleanly separated concerns, with code generation as a pure function of state:

```
┌──────────────┐   intent    ┌──────────────┐   serialize   ┌──────────────┐
│  UI Editor   │ ──────────► │   Schema     │ ────────────► │   Codegen    │
│ (user intent)│             │ (source of   │               │  (emitters)  │
└──────────────┘             │   truth)     │               └──────────────┘
       ▲                     └──────┬───────┘                       │
       │ live preview               │ apply tokens                  │ files
       └─────────────────────  Renderer  ◄──────────────────────────┘
```

- **Visual state** — transient editor UI (selection, viewport, previewed state). Never exported.
- **Token state** — the global theme. Maps to CSS variables.
- **Component metadata** — what each component exposes (variants, slots, consumed tokens). Drives the panel and codegen.
- **Emitted code** — always *derived*, never hand-edited as a source of truth.

Full breakdown in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## Repository docs

| Doc | Purpose |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System model, module boundaries, data flow, live-preview strategy. |
| [`docs/DATA-MODEL.md`](docs/DATA-MODEL.md) | The schema: token state, component metadata, overrides, the project document. Source of truth for everything. |
| [`docs/CODEGEN.md`](docs/CODEGEN.md) | Export engine. How schema maps deterministically to each output format, plus the diff/patch model. |
| [`docs/CSS-STRATEGY.md`](docs/CSS-STRATEGY.md) | Modern CSS feature matrix, support tiers, and the native-over-JS policy. |
| [`docs/MVP-PLAN.md`](docs/MVP-PLAN.md) | Ordered, agent-executable build plan, plus the Phase 2 foundation audit (Radix vs Base UI vs newer headless). |

---

## Success criterion

A developer can open the editor, tweak a component, immediately see the result, export the code, and **drop it into a real project with zero cleanup**. If the output needs hand-fixing before commit, the tool has failed.

---

## Suggested stack (starting point, not a mandate)

- **App:** React 19 + Vite (or Next.js 16 if SSR/registry hosting is wanted later).
- **Styling:** Tailwind CSS v4, shadcn/ui components as the editing target.
- **Source manipulation:** `ts-morph` (TypeScript AST) for editing `cva()` variants and component source.
- **Formatting:** Prettier or Biome, run on every emitted file so output is deterministic and diff-clean.
- **State:** a single store (Zustand/Redux/signals) holding the project document; emitters subscribe.

Rationale and alternatives live in [`docs/MVP-PLAN.md`](docs/MVP-PLAN.md).
