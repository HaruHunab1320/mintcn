import { describe, expect, it } from 'vitest';
import { ProjectDocumentSchema, validateProjectDocument } from '@/schema';
import { buildValidDocument } from '@/test/fixtures/valid-document';

describe('ProjectDocument validation', () => {
  it('accepts a hand-built valid document', () => {
    const doc = buildValidDocument();
    expect(() => validateProjectDocument(doc)).not.toThrow();
  });

  it('rejects a document missing a semantic color token in tokens.colors.light', () => {
    const doc = buildValidDocument();
    delete (doc.tokens.colors.light as Record<string, unknown>).primary;
    const result = ProjectDocumentSchema.safeParse(doc);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.join('.').includes('colors.light'))).toBe(true);
    }
  });

  it('rejects an unknown baseColor', () => {
    const doc = buildValidDocument();
    (doc.meta as { baseColor: string }).baseColor = 'mauve';
    const result = ProjectDocumentSchema.safeParse(doc);
    expect(result.success).toBe(false);
  });

  it('rejects a literal color with an unknown space', () => {
    const doc = buildValidDocument();
    (doc.tokens.colors.light.primary as { space: string }).space = 'lab';
    const result = ProjectDocumentSchema.safeParse(doc);
    expect(result.success).toBe(false);
  });

  it('rejects a derived color pointing at a non-semantic token', () => {
    const doc = buildValidDocument();
    doc.tokens.colors.light.primary = {
      kind: 'derived',
      from: 'not-a-real-token' as never,
      mix: { space: 'oklch', toward: 'oklch(1 0 0)', amount: 0.5 },
    };
    const result = ProjectDocumentSchema.safeParse(doc);
    expect(result.success).toBe(false);
  });

  it('rejects an override referencing an unknown component', () => {
    const doc = buildValidDocument();
    doc.overrides.push({ componentId: 'no-such-component' });
    const result = ProjectDocumentSchema.safeParse(doc);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes('unknown componentId'))).toBe(true);
    }
  });

  it('rejects a VariantAxis whose default is not an option', () => {
    const doc = buildValidDocument();
    doc.components[0].variants[0] = {
      name: 'variant',
      options: ['default'],
      default: 'destructive',
    };
    const result = ProjectDocumentSchema.safeParse(doc);
    expect(result.success).toBe(false);
  });

  it('rejects version other than 1', () => {
    const doc = buildValidDocument();
    (doc as { version: number }).version = 2;
    const result = ProjectDocumentSchema.safeParse(doc);
    expect(result.success).toBe(false);
  });
});
