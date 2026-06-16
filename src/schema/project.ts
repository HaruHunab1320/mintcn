import { z } from 'zod';
import { ComponentMetaSchema } from './component-meta';
import { ComponentsJsonShapeSchema } from './components-json';
import { ComponentOverrideSchema } from './overrides';
import { PresetSchema } from './presets';
import { TokenStateSchema } from './tokens';

export const BASE_COLORS = ['neutral', 'stone', 'zinc', 'slate', 'gray'] as const;
export type BaseColor = (typeof BASE_COLORS)[number];

export const COLOR_SPACES = ['oklch', 'hsl'] as const;
export type ProjectColorSpace = (typeof COLOR_SPACES)[number];

export const ProjectDocumentSchema = z
  .object({
    version: z.literal(1),
    meta: z.object({
      name: z.string().min(1),
      baseColor: z.enum(BASE_COLORS),
      colorSpace: z.enum(COLOR_SPACES),
      config: ComponentsJsonShapeSchema,
    }),
    tokens: TokenStateSchema,
    components: z.array(ComponentMetaSchema),
    overrides: z.array(ComponentOverrideSchema),
    presets: z.array(PresetSchema),
  })
  .superRefine((doc, ctx) => {
    const componentIds = new Set(doc.components.map((c) => c.id));
    for (const [i, override] of doc.overrides.entries()) {
      if (!componentIds.has(override.componentId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['overrides', i, 'componentId'],
          message: `override references unknown componentId "${override.componentId}"`,
        });
      }
    }
  });

export type ProjectDocument = z.infer<typeof ProjectDocumentSchema>;

export function validateProjectDocument(value: unknown): ProjectDocument {
  return ProjectDocumentSchema.parse(value);
}
