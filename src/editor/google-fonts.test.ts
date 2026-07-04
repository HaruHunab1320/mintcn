import { describe, expect, it } from 'vitest';
import { buildFontStack, parsePrimaryFamily } from './google-fonts';

describe('parsePrimaryFamily', () => {
  it('strips double quotes', () => {
    expect(parsePrimaryFamily('"Inter", sans-serif')).toBe('Inter');
  });

  it('strips single quotes', () => {
    expect(parsePrimaryFamily("'Playfair Display', serif")).toBe('Playfair Display');
  });

  it('handles a bare (unquoted) primary', () => {
    expect(parsePrimaryFamily('Roboto, sans-serif')).toBe('Roboto');
  });

  it('returns null for empty input', () => {
    expect(parsePrimaryFamily('')).toBeNull();
    expect(parsePrimaryFamily('  ')).toBeNull();
  });

  it('preserves the primary even when there is no fallback', () => {
    expect(parsePrimaryFamily('"Inter"')).toBe('Inter');
  });
});

describe('buildFontStack', () => {
  it('quotes multi-word families', () => {
    expect(buildFontStack('Plus Jakarta Sans', 'sans-serif')).toBe(
      '"Plus Jakarta Sans", sans-serif',
    );
  });

  it('leaves single-word families unquoted', () => {
    expect(buildFontStack('Inter', 'sans-serif')).toBe('Inter, sans-serif');
  });

  it('round-trips: buildFontStack then parsePrimaryFamily returns the original', () => {
    const families = ['Inter', 'Plus Jakarta Sans', 'JetBrains Mono'];
    for (const f of families) {
      expect(parsePrimaryFamily(buildFontStack(f, 'sans-serif'))).toBe(f);
    }
  });
});
