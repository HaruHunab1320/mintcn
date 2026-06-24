import { z } from 'zod';

export const ComponentsJsonShapeSchema = z.object({
  $schema: z.string().optional(),
  style: z.string().min(1),
  rsc: z.boolean(),
  tsx: z.boolean(),
  tailwind: z.object({
    config: z.literal(''),
    css: z.string().min(1),
    baseColor: z.string().min(1),
    cssVariables: z.boolean(),
    prefix: z.string(),
  }),
  iconLibrary: z.string().optional(),
  aliases: z.object({
    components: z.string().min(1),
    utils: z.string().min(1),
    ui: z.string().min(1),
    lib: z.string().min(1),
    hooks: z.string().min(1),
  }),
  registries: z.record(z.string(), z.unknown()).optional(),
});
export type ComponentsJsonShape = z.infer<typeof ComponentsJsonShapeSchema>;
