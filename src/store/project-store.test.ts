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

  it('removePreset drops a preset by id', () => {
    useProjectStore.getState().load(buildValidDocument());
    const a = useProjectStore.getState().savePreset('a');
    useProjectStore.getState().savePreset('b');
    expect(useProjectStore.getState().document?.presets).toHaveLength(2);
    useProjectStore.getState().removePreset(a.id);
    const remaining = useProjectStore.getState().document?.presets ?? [];
    expect(remaining.map((p) => p.name)).toEqual(['b']);
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

  it('setKeyframe adds a keyframe; removeKeyframe drops it', () => {
    useProjectStore.getState().load(buildValidDocument());
    useProjectStore.getState().setKeyframe('spin', {
      stops: [
        { key: 'from', declarations: { transform: 'rotate(0deg)' } },
        { key: 'to', declarations: { transform: 'rotate(360deg)' } },
      ],
    });
    const after = useProjectStore.getState().document?.tokens.animations?.keyframes;
    expect(after?.spin.stops).toHaveLength(2);
    useProjectStore.getState().removeKeyframe('spin');
    expect(useProjectStore.getState().document?.tokens.animations?.keyframes).toBeUndefined();
  });

  it('setKeyframeStop replaces a stop in place', () => {
    useProjectStore.getState().load(buildValidDocument());
    useProjectStore.getState().setKeyframe('fade', {
      stops: [
        { key: 'from', declarations: { opacity: '0' } },
        { key: 'to', declarations: { opacity: '1' } },
      ],
    });
    useProjectStore.getState().setKeyframeStop('fade', 1, {
      key: 'to',
      declarations: { opacity: '0.9' },
    });
    const stops = useProjectStore.getState().document?.tokens.animations?.keyframes?.fade.stops;
    expect(stops?.[1].declarations.opacity).toBe('0.9');
  });

  it('setVariantClass adds an override for a single variant option', () => {
    useProjectStore.getState().load(buildValidDocument());
    useProjectStore
      .getState()
      .setVariantClass('button', 'size', 'sm', 'h-8 px-5 rounded-lg', 'h-8 px-3 rounded-md');
    const overrides = useProjectStore.getState().document?.overrides ?? [];
    expect(overrides).toHaveLength(1);
    expect(overrides[0].componentId).toBe('button');
    expect(overrides[0].variants?.size?.sm.replaceWith).toBe('h-8 px-5 rounded-lg');
  });

  it('setVariantClass clears the override when the new value matches the original', () => {
    useProjectStore.getState().load(buildValidDocument());
    useProjectStore.getState().setVariantClass('button', 'size', 'sm', 'h-8 px-5', 'h-8 px-3');
    useProjectStore.getState().setVariantClass('button', 'size', 'sm', 'h-8 px-3', 'h-8 px-3');
    expect(useProjectStore.getState().document?.overrides).toEqual([]);
  });

  it('setVariantClass with undefined clears the option-level override', () => {
    useProjectStore.getState().load(buildValidDocument());
    useProjectStore.getState().setVariantClass('button', 'size', 'sm', 'h-8 px-5', 'h-8 px-3');
    useProjectStore.getState().setVariantClass('button', 'size', 'sm', undefined, 'h-8 px-3');
    expect(useProjectStore.getState().document?.overrides).toEqual([]);
  });

  it('setVariantClass keeps unrelated variants on the same component', () => {
    useProjectStore.getState().load(buildValidDocument());
    useProjectStore.getState().setVariantClass('button', 'size', 'sm', 'A', 'orig-sm');
    useProjectStore.getState().setVariantClass('button', 'variant', 'default', 'B', 'orig-def');
    const v = useProjectStore.getState().document?.overrides[0].variants;
    expect(v?.size?.sm.replaceWith).toBe('A');
    expect(v?.variant?.default.replaceWith).toBe('B');
  });

  it('setVariantClass rejects unknown componentId', () => {
    useProjectStore.getState().load(buildValidDocument());
    expect(() =>
      useProjectStore.getState().setVariantClass('no-such', 'size', 'sm', 'x', 'y'),
    ).toThrow();
  });

  it('removeKeyframeStop deletes a stop by index', () => {
    useProjectStore.getState().load(buildValidDocument());
    useProjectStore.getState().setKeyframe('pulse', {
      stops: [
        { key: '0%', declarations: { opacity: '1' } },
        { key: '50%', declarations: { opacity: '0.5' } },
        { key: '100%', declarations: { opacity: '1' } },
      ],
    });
    useProjectStore.getState().removeKeyframeStop('pulse', 1);
    const stops = useProjectStore.getState().document?.tokens.animations?.keyframes?.pulse.stops;
    expect(stops?.map((s) => s.key)).toEqual(['0%', '100%']);
  });
});

describe('temporal / undo-redo', () => {
  beforeEach(() => {
    useProjectStore.getState().unload();
    useProjectStore.temporal.getState().clear();
  });

  // Small helper: run the temporal-only synchronous flush via clear-and-record
  // isn't sufficient because the middleware throttles. We instead poke the
  // temporal API directly by pushing pastStates.
  const captureStep = () => {
    // Manually push the current state onto the past stack so subsequent
    // undo() has something to restore to. This mirrors what the throttled
    // handleSet would eventually do after 250ms.
    // biome-ignore lint/suspicious/noExplicitAny: TemporalState internals are typed loosely
    const temporal: any = useProjectStore.temporal.getState();
    temporal.pastStates.push({ document: useProjectStore.getState().document });
  };

  it('undo restores the previous document state', () => {
    useProjectStore.getState().load(buildValidDocument());
    const originalRadius = useProjectStore.getState().document?.tokens.radius.base;

    captureStep();
    useProjectStore.getState().setRadius('2rem');
    expect(useProjectStore.getState().document?.tokens.radius.base).toBe('2rem');

    useProjectStore.temporal.getState().undo();
    expect(useProjectStore.getState().document?.tokens.radius.base).toBe(originalRadius);
  });

  it('redo re-applies a previously undone change', () => {
    useProjectStore.getState().load(buildValidDocument());
    captureStep();
    useProjectStore.getState().setRadius('2rem');
    useProjectStore.temporal.getState().undo();
    expect(useProjectStore.getState().document?.tokens.radius.base).not.toBe('2rem');

    useProjectStore.temporal.getState().redo();
    expect(useProjectStore.getState().document?.tokens.radius.base).toBe('2rem');
  });

  it('undo bails when there is no history to replay', () => {
    useProjectStore.getState().load(buildValidDocument());
    useProjectStore.temporal.getState().clear();
    const before = useProjectStore.getState().document?.tokens.radius.base;
    useProjectStore.temporal.getState().undo();
    expect(useProjectStore.getState().document?.tokens.radius.base).toBe(before);
  });
});
