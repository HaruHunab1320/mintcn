# Roadmap

Post-MVP iteration plan. The MVP loop (edit → diff → export) is shipped; this doc captures the next wave of work that makes Tincture friendlier and more powerful for the first-time visitor.

Live status:
- ✅ MVP (M0–M6, presets, export shapes, acceptance script)
- ✅ Post-MVP wave: palette, ⌘K, shadow editor, undo/redo, easing editor, image→palette, connect-your-own-project
- ✅ Responsive: device preview toggle + per-breakpoint override tabs
- ✅ Live override preview (Button + Badge), dot-grid chrome
- ⏳ Queued: everything else below

---

## 1. Palette system (Coolers-style)

The single biggest "oh nice" moment for a first-time visitor. Picking colors is the hardest first task — opening Tincture today drops you in front of 32 swatches with no obvious starting point.

### UX
A bar across the top of the canvas with five swatches for the key tokens:

```
[ primary 🔒 ]  [ secondary ]  [ accent ]  [ destructive 🔒 ]  [ background ]    strategy ▾    [ Generate ↻ ]
```

- Click a swatch to lock/unlock it. Locked swatches stay across regenerations.
- Strategy picker chooses the generation rule (default: monochromatic for safety; spacebar always re-rolls)
- Pressing `Space` regenerates anywhere on the page (when not in a text input).
- Save the current palette as a preset via the existing PresetPanel.

### Generation strategies

All strategies operate in OKLCH and respect locks.

| Strategy | Behaviour |
|---|---|
| **Random** | Each unlocked swatch picks a random hue with bounded L/C |
| **Monochromatic** | All unlocked swatches share a hue with a locked base; vary L/C |
| **Analogous** | Hues within ±30° of a locked base |
| **Complementary** | Unlocked swatches alternate ±180° from a locked base |
| **Triadic** | Three-way split: base, +120°, +240° |
| **From image** *(later)* | Drop an image, sample dominant colors with k-means |

### Cascading derives

When the five key swatches change, paired tokens auto-derive — preserving the design system's coherence:

- `*-foreground` snaps to readable contrast (`oklch(0.985 ...)` or `oklch(0.145 ...)`, picked by L of the background)
- `muted` = `background` mixed 8% toward `foreground`
- `muted-foreground` = `foreground` mixed 50% toward `background`
- `border`, `input` = mixed at low chroma from background
- `card`, `popover` = mirror `background`
- Dark theme: same hue/chroma, inverted L

These can be expressed as `kind: 'derived'` ColorValues so the relationships round-trip through the schema.

### Implementation outline

```
src/palette/
  harmony.ts       # pure OKLCH math: random/analogous/complementary/triadic/monochromatic
  contrast.ts      # WCAG-aware foreground picker
  generate.ts      # generatePalette(strategy, locks, currentDoc) -> color updates
src/editor/palette-bar.tsx   # the top-of-canvas component
```

Store adds one mutation: `applyPalette(updates)` that batches a multi-token write so the preview repaints once.

---

## 2. UI/UX rough edges

Inventoried by pain-per-edit. Each row is a discrete piece of follow-up work.

| Today | Rough because | What would help |
|---|---|---|
| **Shadow strings** (`0 1px 2px 0 rgb(0 0 0 / 0.05)`) | One typo silently breaks the shadow | Split into x/y/blur/spread/color/inset fields with a preview swatch + multi-layer stacking |
| **Font stacks** as raw text | Typos in fallback syntax; no preview of the actual font | Google Fonts picker (search + live preview) + chip-based stack builder |
| **Easing curves** as `cubic-bezier(...)` | No one can hand-author these | Bezier curve editor (drag handles) + preset library (Material, Apple, etc.) + animation preview button |
| **Override class strings** as raw textareas | Tailwind is a lot to remember | Chip-based editor with autocomplete; per-state tabs (Base / Hover / Focus / Active / Disabled) |
| **No undo/redo** | One miss-drag on a slider and you've lost the previous value | Time-travel history (Zustand has temporal middleware) |
| **No discoverability** | 11 panel sections + 46 components is a lot | `⌘K` command palette: search tokens, jump to a panel, run "randomize palette" |
| **Hex / HSL get no visual help** | Only OKLCH has sliders today; other formats fall back to typing | Add an "any color" picker (HSL wheel, hex eyedropper) |
| **No image → palette** | Common designer workflow not supported | Drag-drop image → extract dominant colors → assign to tokens |
| **Diff hunks all open** | Long diffs are unwieldy | Collapse unchanged context, jump-to-file sidebar |
| **Fixture-only** | Demo works, but real users want to edit their own project | URL upload / GitHub import / local folder picker |

---

## 3. Sequencing

By time-to-delight for a first-time visitor:

1. **Palette bar + randomize** *(in flight)* — single biggest user-visible win; existing infra. ~half a day.
2. **`⌘K` command palette** — solves discoverability across the 11 panel sections in one shot. ~2-3 hours.
3. **Shadow visual editor** — biggest pain-per-edit reduction. Structured form. ~2-3 hours.
4. **Undo/redo** — table-stakes for an editor. Zustand temporal middleware exists. ~1-2 hours.
5. **Easing curve editor** — fun + necessary for the animation story to feel complete. ~half a day.
6. **Image → palette** — pairs with #1 once it's live.
7. **Connect-your-own-project** — turns Tincture from a demo into a real tool. Own milestone.

---

## 4. Deferred / open questions

- **Live preview of overrides** — shipped for `Button` + `Badge` via a `withOverride` HOC that appends the delta to `className` and lets shadcn's own `tailwind-merge` resolve conflicts. Two follow-ups: (a) extend the wrapper to Input/Card/Alert/other cva-heavy components; (b) structural rewrites (element type / wrapper changes) still only surface on export — needs a genuinely different mechanism.
- **Tincture-flavored shadcn registry** (Path B from M6 design) — alongside vanilla shadcn, ship parameterized component versions that consume state tokens for live retroactive propagation. Phase 2 territory; only justified once we have real user demand.
- **Theme gallery + URL-shareable themes** — once palette + presets are stable, a shared link should rehydrate the document directly. Cheap to build, big distribution upside.
