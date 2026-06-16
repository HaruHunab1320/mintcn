import { z } from 'zod';

export const InteractiveStateSchema = z.enum(['hover', 'focus-visible', 'active', 'disabled']);
export type InteractiveState = z.infer<typeof InteractiveStateSchema>;

export const VariantAxisSchema = z
  .object({
    name: z.string().min(1),
    options: z.array(z.string().min(1)).min(1),
    default: z.string().min(1),
  })
  .refine((axis) => axis.options.includes(axis.default), {
    message: 'VariantAxis.default must be one of options',
    path: ['default'],
  });
export type VariantAxis = z.infer<typeof VariantAxisSchema>;

export const SlotSchema = z.object({
  name: z.string().min(1),
  selector: z.string().min(1),
});
export type Slot = z.infer<typeof SlotSchema>;

export const ComponentMetaSchema = z.object({
  id: z.string().min(1),
  registryName: z.string().min(1),
  source: z.object({
    path: z.string().min(1),
  }),
  variants: z.array(VariantAxisSchema),
  slots: z.array(SlotSchema),
  states: z.array(InteractiveStateSchema),
  consumes: z.object({
    cssVars: z.array(z.string().min(1)),
    utilities: z.array(z.string()),
  }),
});
export type ComponentMeta = z.infer<typeof ComponentMetaSchema>;
