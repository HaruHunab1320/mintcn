import { z } from 'zod';
import { ComponentOverrideSchema } from './overrides';
import { TokenStateSchema } from './tokens';

export const PresetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  tokens: TokenStateSchema,
  overrides: z.array(ComponentOverrideSchema).optional(),
});
export type Preset = z.infer<typeof PresetSchema>;
