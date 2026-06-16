# Fixture: shadcn-app

A snapshot of a real shadcn-init output (style: `new-york`, base color: `slate`, Tailwind v4, RSC off, TSX on) used as the round-trip test target for Tincture's ingest and codegen pipelines.

- `components.json` — the shadcn config the editor mirrors into `meta.config`.
- `app/globals.css` — `@layer base` token block + `@theme inline` mapping. This is what `ingest/parse-theme-css.ts` reads and `codegen/emit-theme-css.ts` produces.
- `components/ui/{button,card,input,badge}.tsx` — the components `ingest/parse-component-source.ts` extracts `cva()` variants from and that `codegen/emit-component-source.ts` rewrites.
- `lib/utils.ts` — the `cn()` helper, present so the component files compile in-place.

Treat this fixture as immutable test input. Round-trip = ingest this directory then emit; the emitted file set must equal the fixture, byte-for-byte.
