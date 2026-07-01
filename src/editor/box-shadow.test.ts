import { describe, expect, it } from 'vitest';
import { parseBoxShadow, serializeBoxShadow } from './box-shadow';

describe('parseBoxShadow', () => {
  it('parses the fixture --shadow-sm (single layer, 4 lengths + rgb color)', () => {
    const layers = parseBoxShadow('0 1px 2px 0 rgb(0 0 0 / 0.05)');
    expect(layers).toEqual([
      {
        inset: false,
        x: '0',
        y: '1px',
        blur: '2px',
        spread: '0',
        color: 'rgb(0 0 0 / 0.05)',
      },
    ]);
  });

  it('parses multi-layer shadows (--shadow-md style)', () => {
    const layers = parseBoxShadow(
      '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    );
    expect(layers).toHaveLength(2);
    expect(layers[0].spread).toBe('-1px');
    expect(layers[1].spread).toBe('-2px');
  });

  it('respects parens when splitting (commas inside rgb() do not break layers)', () => {
    const layers = parseBoxShadow('0 0 4px rgb(0, 0, 0)');
    expect(layers).toHaveLength(1);
    expect(layers[0].color).toBe('rgb(0, 0, 0)');
  });

  it('recognises the inset keyword regardless of position', () => {
    expect(parseBoxShadow('inset 0 0 2px red')[0].inset).toBe(true);
    expect(parseBoxShadow('0 0 2px inset #000')[0].inset).toBe(true);
  });

  it('defaults blur + spread to "0" when omitted', () => {
    const [layer] = parseBoxShadow('1px 2px red');
    expect(layer).toMatchObject({ x: '1px', y: '2px', blur: '0', spread: '0' });
  });

  it('handles hex + named colors', () => {
    expect(parseBoxShadow('0 0 4px #abc')[0].color).toBe('#abc');
    expect(parseBoxShadow('0 0 4px red')[0].color).toBe('red');
  });
});

describe('round-trip', () => {
  const fixtureShadows = [
    '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  ];

  it.each(fixtureShadows)('survives parse → serialize: %s', (raw) => {
    expect(serializeBoxShadow(parseBoxShadow(raw))).toBe(raw);
  });

  it('inset + custom color also round-trip', () => {
    const raw = 'inset 0 1px 0 0 oklch(0.985 0.003 247.858)';
    expect(serializeBoxShadow(parseBoxShadow(raw))).toBe(raw);
  });
});
