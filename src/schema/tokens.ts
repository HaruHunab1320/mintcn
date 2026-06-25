import { z } from 'zod';
import { SEMANTIC_COLOR_TOKENS, type SemanticColorToken } from './semantic-tokens';

const ColorSpaceLiteralSchema = z.enum(['oklch', 'hsl', 'srgb']);
const ColorSpaceMixSchema = z.enum(['oklch', 'srgb']);

export const ColorValueSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('literal'),
    space: ColorSpaceLiteralSchema,
    value: z.string().min(1),
  }),
  z.object({
    kind: z.literal('derived'),
    from: z.enum(SEMANTIC_COLOR_TOKENS),
    mix: z.object({
      space: ColorSpaceMixSchema,
      toward: z.string().min(1),
      amount: z.number().min(0).max(1),
    }),
  }),
]);

export type ColorValue = z.infer<typeof ColorValueSchema>;

const ColorMapShape = Object.fromEntries(
  SEMANTIC_COLOR_TOKENS.map((token) => [token, ColorValueSchema] as const),
) as Record<SemanticColorToken, typeof ColorValueSchema>;

export const ColorMapSchema = z.object(ColorMapShape);
export type ColorMap = z.infer<typeof ColorMapSchema>;

export const TypeScaleEntrySchema = z.object({
  name: z.string().min(1),
  size: z.string().min(1),
  lineHeight: z.string().min(1),
  weight: z.number().int().positive().optional(),
});
export type TypeScaleEntry = z.infer<typeof TypeScaleEntrySchema>;

export const ScaleEntrySchema = z.object({
  name: z.string().min(1),
  value: z.string().min(1),
});
export type ScaleEntry = z.infer<typeof ScaleEntrySchema>;

/**
 * Default values + bounds for the interactive-state tokens. These are *defaults
 * the override editor reads from* — they do not retroactively change canonical
 * shadcn class strings like `hover:bg-primary/90`. See Path A in the design
 * notes: globals guide bulk edits; per-component overrides do the surgery.
 */
export const StateTokensSchema = z.object({
  hoverOpacity: z.number().min(0).max(1),
  focusRingWidth: z.string().min(1),
  focusRingOpacity: z.number().min(0).max(1),
  activeScale: z.number().min(0).max(2),
  disabledOpacity: z.number().min(0).max(1),
});
export type StateTokens = z.infer<typeof StateTokensSchema>;

/**
 * Animation tokens. Tailwind v4 reads `--duration-*` and `--ease-*` from
 * `@theme` natively, so any utility named `duration-fast` / `ease-out` etc.
 * resolves through these. Keyframes are addressed in a later milestone.
 */
export const AnimationTokensSchema = z.object({
  durations: z.record(z.string(), z.string()),
  easings: z.record(z.string(), z.string()),
});
export type AnimationTokens = z.infer<typeof AnimationTokensSchema>;

export const TokenStateSchema = z.object({
  colors: z.object({
    light: ColorMapSchema,
    dark: ColorMapSchema,
  }),
  radius: z.object({
    base: z.string().min(1),
  }),
  typography: z.object({
    fontFamily: z.object({
      sans: z.string().min(1),
      serif: z.string().min(1),
      mono: z.string().min(1),
    }),
    scale: z.array(TypeScaleEntrySchema),
  }),
  spacing: z.array(ScaleEntrySchema),
  shadows: z.record(z.string(), z.string()),
  borders: z.object({
    width: z.record(z.string(), z.string()),
  }),
  states: StateTokensSchema.optional(),
  animations: AnimationTokensSchema.optional(),
});
export type TokenState = z.infer<typeof TokenStateSchema>;
