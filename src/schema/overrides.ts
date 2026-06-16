import { z } from 'zod';
import { ColorValueSchema } from './tokens';

export const ClassDeltaSchema = z.object({
  set: z.record(z.string(), z.string()),
  removeUtilities: z.array(z.string()).optional(),
});
export type ClassDelta = z.infer<typeof ClassDeltaSchema>;

const ScopedVarValueSchema = z.union([ColorValueSchema, z.string()]);

export const ComponentOverrideSchema = z.object({
  componentId: z.string().min(1),
  scopedVars: z.record(z.string(), ScopedVarValueSchema).optional(),
  variants: z.record(z.string(), z.record(z.string(), ClassDeltaSchema)).optional(),
});
export type ComponentOverride = z.infer<typeof ComponentOverrideSchema>;
