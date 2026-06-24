import { type ComponentsJsonShape, ComponentsJsonShapeSchema } from '@/schema';

/**
 * Parse a shadcn components.json (raw JSON text or already-parsed object)
 * into a validated ComponentsJsonShape. Validation is what enforces the
 * Tailwind v4 invariant (`tailwind.config` must be empty string).
 */
export function parseComponentsJson(input: string | unknown): ComponentsJsonShape {
  const raw = typeof input === 'string' ? JSON.parse(input) : input;
  return ComponentsJsonShapeSchema.parse(raw);
}
