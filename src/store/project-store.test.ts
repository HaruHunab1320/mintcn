import { beforeEach, describe, expect, it } from 'vitest';
import { useProjectStore } from '@/store/project-store';
import { buildValidDocument } from '@/test/fixtures/valid-document';

describe('useProjectStore', () => {
  beforeEach(() => {
    useProjectStore.getState().unload();
  });

  it('loads a valid document and exposes it via state', () => {
    useProjectStore.getState().load(buildValidDocument());
    const doc = useProjectStore.getState().document;
    expect(doc?.meta.name).toBe('test-project');
    expect(doc?.tokens.colors.light.primary).toBeDefined();
  });

  it('rejects an invalid document at load time', () => {
    const bad = buildValidDocument();
    delete (bad.tokens.colors.light as Record<string, unknown>).primary;
    expect(() => useProjectStore.getState().load(bad)).toThrow();
    expect(useProjectStore.getState().document).toBeNull();
  });

  it('setTokenColor mutates only the targeted theme + token', () => {
    useProjectStore.getState().load(buildValidDocument());
    const before = useProjectStore.getState().document;
    if (!before) throw new Error('expected document');

    useProjectStore.getState().setTokenColor('dark', 'primary', {
      kind: 'literal',
      space: 'oklch',
      value: 'oklch(0.5 0.1 200)',
    });

    const after = useProjectStore.getState().document;
    if (!after) throw new Error('expected document');
    expect(after.tokens.colors.dark.primary).toEqual({
      kind: 'literal',
      space: 'oklch',
      value: 'oklch(0.5 0.1 200)',
    });
    // Light theme untouched
    expect(after.tokens.colors.light.primary).toEqual(before.tokens.colors.light.primary);
  });

  it('setRadius replaces the radius value', () => {
    useProjectStore.getState().load(buildValidDocument());
    useProjectStore.getState().setRadius('1rem');
    expect(useProjectStore.getState().document?.tokens.radius.base).toBe('1rem');
  });

  it('upsertOverride adds, then replaces in place', () => {
    useProjectStore.getState().load(buildValidDocument());
    useProjectStore.getState().upsertOverride({
      componentId: 'button',
      scopedVars: { '--primary': 'oklch(0.5 0.1 200)' },
    });
    expect(useProjectStore.getState().document?.overrides).toHaveLength(1);

    useProjectStore.getState().upsertOverride({
      componentId: 'button',
      scopedVars: { '--primary': 'oklch(0.6 0.1 200)' },
    });
    const overrides = useProjectStore.getState().document?.overrides;
    expect(overrides).toHaveLength(1);
    expect(overrides?.[0].scopedVars?.['--primary']).toBe('oklch(0.6 0.1 200)');
  });

  it('upsertOverride rejects unknown componentId', () => {
    useProjectStore.getState().load(buildValidDocument());
    expect(() =>
      useProjectStore.getState().upsertOverride({ componentId: 'no-such-component' }),
    ).toThrow();
  });

  it('removeOverride removes by componentId', () => {
    useProjectStore.getState().load(buildValidDocument());
    useProjectStore
      .getState()
      .upsertOverride({ componentId: 'button', scopedVars: { '--primary': 'x' } });
    useProjectStore.getState().removeOverride('button');
    expect(useProjectStore.getState().document?.overrides).toHaveLength(0);
  });

  it('savePreset captures current tokens; loadPreset restores them', () => {
    useProjectStore.getState().load(buildValidDocument());
    const original = useProjectStore.getState().document?.tokens.radius.base;
    const preset = useProjectStore.getState().savePreset('original');

    useProjectStore.getState().setRadius('99rem');
    expect(useProjectStore.getState().document?.tokens.radius.base).toBe('99rem');

    useProjectStore.getState().loadPreset(preset.id);
    expect(useProjectStore.getState().document?.tokens.radius.base).toBe(original);
  });

  it('mutations throw when no document is loaded', () => {
    expect(() => useProjectStore.getState().setRadius('1rem')).toThrow();
  });

  it('setFontFamily replaces only the targeted family', () => {
    useProjectStore.getState().load(buildValidDocument());
    useProjectStore.getState().setFontFamily('sans', '"Geist", sans-serif');
    const doc = useProjectStore.getState().document;
    expect(doc?.tokens.typography.fontFamily.sans).toBe('"Geist", sans-serif');
    expect(doc?.tokens.typography.fontFamily.serif).toBe('ui-serif, Georgia, serif');
  });

  it('setShadow adds a new entry; removeShadow drops it', () => {
    useProjectStore.getState().load(buildValidDocument());
    useProjectStore.getState().setShadow('xl', '0 20px 25px -5px rgb(0 0 0 / 0.1)');
    expect(useProjectStore.getState().document?.tokens.shadows.xl).toContain('20px 25px');
    useProjectStore.getState().removeShadow('xl');
    expect(useProjectStore.getState().document?.tokens.shadows.xl).toBeUndefined();
  });

  it('setStateToken seeds the states block with defaults on first write', () => {
    useProjectStore.getState().load(buildValidDocument());
    expect(useProjectStore.getState().document?.tokens.states).toBeDefined();
    useProjectStore.getState().setStateToken('hoverOpacity', 0.75);
    expect(useProjectStore.getState().document?.tokens.states?.hoverOpacity).toBe(0.75);
    // Other state tokens preserved from the previous value.
    expect(useProjectStore.getState().document?.tokens.states?.disabledOpacity).toBe(0.5);
  });

  it('setDuration / removeDuration manage animation duration entries', () => {
    useProjectStore.getState().load(buildValidDocument());
    useProjectStore.getState().setDuration('fast', '120ms');
    expect(useProjectStore.getState().document?.tokens.animations?.durations.fast).toBe('120ms');
    useProjectStore.getState().removeDuration('fast');
    expect(useProjectStore.getState().document?.tokens.animations?.durations.fast).toBeUndefined();
  });

  it('setEasing / removeEasing manage animation easing entries', () => {
    useProjectStore.getState().load(buildValidDocument());
    useProjectStore.getState().setEasing('out', 'cubic-bezier(0.16, 1, 0.3, 1)');
    expect(useProjectStore.getState().document?.tokens.animations?.easings.out).toBe(
      'cubic-bezier(0.16, 1, 0.3, 1)',
    );
    useProjectStore.getState().removeEasing('out');
    expect(useProjectStore.getState().document?.tokens.animations?.easings.out).toBeUndefined();
  });
});
