# Modern CSS Strategy

The brief calls for "the most modern CSS that's safe and practical for production, especially where it reduces JavaScript." This doc sets the policy for **both** the code Tincture emits and the editor's own UI.

The governing principle: **if a behavior can be expressed natively in CSS, prefer that over JavaScript.** Native CSS is more maintainable, more accessible by default, and produces output that's easier to diff and own — exactly what shadcn-style codebases want.

---

## Support tiers

Browser support has moved a lot. As of 2025 most of the features below crossed into "widely available" (Baseline) across current Chrome, Edge, Safari, and Firefox. Treat them in three tiers:

### Tier 1 — Ship freely (Baseline / widely available)

Use these in emitted code without guards.

| Feature | Use in Tincture |
|---|---|
| **CSS custom properties** | The entire theme. Tokens are variables; the live preview restyles by setting them on a root. |
| **Cascade layers (`@layer`)** | Emit the theme into `@layer base`; emit component overrides into `@layer components` so generated rules never win specificity wars against user code. |
| **Nesting** | Cleaner emitted component CSS and editor styles, fewer flattened selectors. |
| **`:has()`** | Stateful styling without JS — e.g. a field group that restyles when it contains an invalid input. Lets the panel express "state" edits natively. |
| **Container queries** | Component-level responsiveness in the preview canvas and in emitted blocks: components respond to *their container*, not the viewport — essential for a tool whose preview lives in a resizable pane. |
| **`color-mix()`** | Derived tokens (hover/active/muted states) as live expressions, so a theme recomputes when its base color changes. |
| **OKLCH / OKLAB color** | Default color space for emitted tokens (matches shadcn v4's direction); perceptually even palettes and predictable mixing. |
| **Logical properties** | Emit `padding-inline` / `margin-block` / `inset-*` instead of physical sides, so output is RTL-correct (shadcn ships RTL support — match it). |
| **Subgrid** | Aligned multi-column blocks (forms, card grids) without wrapper hacks, in both preview and emitted layout blocks. |
| **`@property`** | Register custom properties that need to animate or have a typed syntax (e.g. a smoothly transitionable angle or color token). |

### Tier 2 — Use with an `@supports` guard (progressive enhancement)

Emit these as enhancements layered over a working baseline, never as the only path to functioning content.

| Feature | Why guard |
|---|---|
| **`@scope`** | Great for isolating preview styles from editor styles, but support is still settling — wrap in `@supports` and fall back to a scoping class. |
| **Anchor positioning (`anchor()`)** | Useful for popovers/tooltips in the editor, but provide a positioning fallback. |
| **Scroll-driven animations** | Pure-CSS reveal/scroll effects — degrade to static when unsupported. |
| **`field-sizing`** | Auto-growing inputs in the panel — fall back to a fixed size. |

### Tier 3 — Watch, don't ship yet

Things like `sibling-index()` / `sibling-count()` — interesting for generated layouts but support is too new. Keep them out of emitted code for now.

---

## Policy for emitted code

1. **Baseline first, enhance after.** Every generated block must work without Tier 2/3 features; those are additive. Concretely: a card lays out fine without subgrid, then subgrid tightens alignment where supported.

   ```css
   .card-grid { display: grid; gap: 1rem; }                 /* baseline */
   @supports (grid-template-columns: subgrid) {              /* enhancement */
     .card { grid-template-columns: subgrid; grid-column: 1 / -1; }
   }
   ```

2. **Prefer native over JS.** Don't emit (or write) a JS handler for something CSS does: parent/sibling state → `:has()`; component responsiveness → container queries; theming → custom properties; derived colors → `color-mix()`. The output should read like a strong frontend engineer chose the native tool on purpose.

3. **Use cascade layers to stay polite.** Generated overrides go in a named layer below the user's unlayered styles, so Tincture never silently out-specifies hand-written code. This is a correctness property, not a style preference.

4. **Logical properties always.** Emit logical, not physical, directions. It's free RTL correctness and matches shadcn's current direction.

5. **`@supports`, not user-agent sniffing.** Feature-detect Tier 2 features in the CSS itself. No JS browser detection in emitted output.

---

## Policy for the editor UI

The editor is a great place to dogfood the same features it emits:

- The resizable preview canvas uses **container queries** so previewed components react to the canvas width — which is the entire point of a component editor.
- Interactive-state previews (`hover` / `focus-visible` / `disabled`) are driven by **`:has()`** and real pseudo-classes where possible, so the preview shows true browser behavior rather than a faked class.
- Theme switching is just toggling a `data-theme` attribute and swapping the variable set — no re-render of component trees.
- Isolate preview styling from chrome with **`@scope`** (Tier 2, guarded) or a container boundary, so the tool's own CSS can't contaminate what the user is editing.

---

## One caution

Modern CSS is the default, not a mandate to be clever. If a feature makes the **emitted output** harder to read or harder to diff, skip it — readability and clean diffs outrank using the newest selector. The goal is code a developer commits without cleanup, and sometimes that's the boring, obviously-correct rule.
