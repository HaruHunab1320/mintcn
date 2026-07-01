import { describe, expect, it } from 'vitest';
import { EASING_PRESETS, matchPreset, parseEasing, serializeEasing } from './easing';

describe('parseEasing', () => {
  it('recognises CSS keyword easings', () => {
    expect(parseEasing('linear')).toEqual({ kind: 'keyword', value: 'linear' });
    expect(parseEasing('  Ease-In-Out  ')).toEqual({ kind: 'keyword', value: 'ease-in-out' });
  });

  it('parses cubic-bezier tuples with decimals and negatives', () => {
    expect(parseEasing('cubic-bezier(0.16, 1, 0.3, 1)')).toEqual({
      kind: 'cubic-bezier',
      x1: 0.16,
      y1: 1,
      x2: 0.3,
      y2: 1,
    });
    expect(parseEasing('cubic-bezier(0.7, -0.4, 0.4, 1.2)')).toMatchObject({
      x1: 0.7,
      y1: -0.4,
      x2: 0.4,
      y2: 1.2,
    });
  });

  it('falls through to unknown for anything else', () => {
    const result = parseEasing('steps(4, end)');
    expect(result.kind).toBe('unknown');
    if (result.kind === 'unknown') expect(result.raw).toBe('steps(4, end)');
  });
});

describe('serializeEasing', () => {
  it('round-trips keywords', () => {
    expect(serializeEasing(parseEasing('ease-out'))).toBe('ease-out');
  });

  it('round-trips cubic-bezier tuples in the standard shape', () => {
    const raw = 'cubic-bezier(0.16, 1, 0.3, 1)';
    expect(serializeEasing(parseEasing(raw))).toBe(raw);
  });

  it('trims trailing zeros so 0.5 stays 0.5, not 0.500', () => {
    expect(serializeEasing({ kind: 'cubic-bezier', x1: 0.5, y1: 0, x2: 0.5, y2: 1 })).toBe(
      'cubic-bezier(0.5, 0, 0.5, 1)',
    );
  });
});

describe('preset library', () => {
  it('ships at least one preset per family', () => {
    const families = new Set(EASING_PRESETS.map((p) => p.family));
    expect(families).toEqual(new Set(['CSS', 'Material', 'Apple', 'Utility']));
  });

  it('every preset value re-parses cleanly', () => {
    for (const preset of EASING_PRESETS) {
      const parsed = parseEasing(preset.value);
      expect(parsed.kind).not.toBe('unknown');
    }
  });

  it('matchPreset resolves a stored value back to its preset', () => {
    const preset = matchPreset('cubic-bezier(0.4, 0, 0.2, 1)');
    expect(preset?.id).toBe('material-standard');
  });

  it('matchPreset returns null when nothing matches', () => {
    expect(matchPreset('cubic-bezier(0.11, 0.22, 0.33, 0.44)')).toBeNull();
  });
});
