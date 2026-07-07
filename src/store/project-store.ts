import { type TemporalState, temporal } from 'zundo';
import type { StoreApi } from 'zustand';
import { create } from 'zustand';
import {
  type AnimationTokens,
  type ColorValue,
  type ComponentOverride,
  type KeyframeDefinition,
  type Preset,
  type ProjectDocument,
  type SemanticColorToken,
  type StateTokens,
  type TokenState,
  validateProjectDocument,
} from '@/schema';

export type Theme = 'light' | 'dark';
export type FontFamilyKey = 'sans' | 'serif' | 'mono';

const DEFAULT_STATE_TOKENS: StateTokens = {
  hoverOpacity: 0.9,
  focusRingWidth: '3px',
  focusRingOpacity: 0.5,
  activeScale: 0.97,
  disabledOpacity: 0.5,
};

const DEFAULT_ANIMATION_TOKENS: AnimationTokens = { durations: {}, easings: {} };

interface ProjectState {
  document: ProjectDocument | null;
  /**
   * Raw source bytes of every file the emitters might rewrite, keyed by
   * project-root-relative path. Used by the DiffView + emit-project to
   * compare emitter output against the on-disk source. Populated at load
   * time (from the fixture, from a GitHub fetch, etc.).
   */
  originals: Record<string, string>;
  /**
   * JSON-serialized snapshot of the document taken at `load` time. Used by
   * `resetToInitial` to restore the baseline without needing to re-parse the
   * originals. Not consumed by any other action.
   */
  _initialSnapshot: string | null;

  load: (input: unknown, originals?: Record<string, string>) => void;
  unload: () => void;
  /**
   * Discards every edit made since the last load() and restores the document
   * to the snapshot taken at load time — the fixture's baseline, or the
   * originals of whatever project was connected. Originals are unchanged, so
   * emit + diff still produce the same "on-disk vs edited" comparison.
   */
  resetToInitial: () => void;

  setTokenColor: (theme: Theme, token: SemanticColorToken, value: ColorValue) => void;
  /**
   * Replace both light and dark color maps in a single update so subscribers
   * repaint once. Used by the palette bar's Generate action.
   */
  applyPalette: (input: {
    light: Record<SemanticColorToken, ColorValue>;
    dark: Record<SemanticColorToken, ColorValue>;
  }) => void;
  /**
   * Apply a curated palette-plus-vibe bundle: light/dark color maps, a
   * radius, the sans/serif/mono font stacks, and (optionally) a full shadow
   * scale that replaces the doc's shadow map. Other tokens (scale, spacing,
   * borders, states, animations) stay from the current document. Merges as
   * a single history step so undo restores everything at once.
   */
  applyTheme: (spec: {
    colors: TokenState['colors'];
    radius: string;
    fontFamily: TokenState['typography']['fontFamily'];
    shadows?: TokenState['shadows'];
  }) => void;
  setRadius: (value: string) => void;
  setFontFamily: (family: FontFamilyKey, value: string) => void;
  setShadow: (name: string, value: string) => void;
  removeShadow: (name: string) => void;

  setStateToken: <K extends keyof StateTokens>(key: K, value: StateTokens[K]) => void;
  setDuration: (name: string, value: string) => void;
  removeDuration: (name: string) => void;
  setEasing: (name: string, value: string) => void;
  removeEasing: (name: string) => void;

  setKeyframe: (name: string, definition: KeyframeDefinition) => void;
  removeKeyframe: (name: string) => void;
  setKeyframeStop: (
    keyframeName: string,
    stopIndex: number,
    stop: KeyframeDefinition['stops'][number],
  ) => void;
  removeKeyframeStop: (keyframeName: string, stopIndex: number) => void;

  /**
   * Set a full-string replacement on a single variant option. Passing the
   * original class string clears the override; passing undefined clears the
   * variant entirely. Empty override objects (no variants left) are pruned.
   */
  setVariantClass: (
    componentId: string,
    axis: string,
    option: string,
    newString: string | undefined,
    originalString: string,
  ) => void;

  upsertOverride: (override: ComponentOverride) => void;
  removeOverride: (componentId: string) => void;

  savePreset: (name: string) => Preset;
  loadPreset: (id: string) => void;
  removePreset: (id: string) => void;
}

function requireDocument(doc: ProjectDocument | null): ProjectDocument {
  if (!doc) throw new Error('project-store: no document loaded');
  return doc;
}

function uniqueId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Store wrapped in zundo's `temporal` middleware — undo/redo history over the
 * document slice. Rapid updates (slider drags) are coalesced by the 250ms
 * throttle so a single drag becomes one history step, not fifty.
 *
 * `partialize` limits history to the document itself; the action functions
 * are stable references so they don't clutter the past/future stacks.
 */
export const useProjectStore = create<ProjectState>()(
  temporal(
    (set, get) => ({
      document: null,
      originals: {},
      _initialSnapshot: null,

      load: (input, originals) => {
        const document = validateProjectDocument(input);
        set({
          document,
          _initialSnapshot: JSON.stringify(document),
          ...(originals !== undefined ? { originals } : {}),
        });
      },

      unload: () => set({ document: null, originals: {}, _initialSnapshot: null }),

      resetToInitial: () => {
        const snapshot = get()._initialSnapshot;
        if (!snapshot) return;
        set({ document: JSON.parse(snapshot) as ProjectDocument });
      },

      setTokenColor: (theme, token, value) =>
        set((state) => {
          const document = requireDocument(state.document);
          return {
            document: {
              ...document,
              tokens: {
                ...document.tokens,
                colors: {
                  ...document.tokens.colors,
                  [theme]: {
                    ...document.tokens.colors[theme],
                    [token]: value,
                  },
                },
              },
            },
          };
        }),

      applyPalette: (input) =>
        set((state) => {
          const document = requireDocument(state.document);
          return {
            document: {
              ...document,
              tokens: {
                ...document.tokens,
                colors: { light: input.light, dark: input.dark },
              },
            },
          };
        }),

      applyTheme: (spec) =>
        set((state) => {
          const document = requireDocument(state.document);
          return {
            document: {
              ...document,
              tokens: {
                ...document.tokens,
                colors: spec.colors,
                radius: { base: spec.radius },
                typography: {
                  ...document.tokens.typography,
                  fontFamily: spec.fontFamily,
                },
                // Optional: when a curated theme ships its own shadow scale
                // (crisp / soft / dramatic), we replace the doc's map
                // wholesale so the vibe reads clearly. Missing → keep the
                // current shadows so an ad-hoc palette change doesn't wipe
                // the user's shadow tokens.
                ...(spec.shadows ? { shadows: spec.shadows } : {}),
              },
            },
          };
        }),

      setRadius: (value) =>
        set((state) => {
          const document = requireDocument(state.document);
          return {
            document: {
              ...document,
              tokens: { ...document.tokens, radius: { base: value } },
            },
          };
        }),

      setFontFamily: (family, value) =>
        set((state) => {
          const document = requireDocument(state.document);
          return {
            document: {
              ...document,
              tokens: {
                ...document.tokens,
                typography: {
                  ...document.tokens.typography,
                  fontFamily: { ...document.tokens.typography.fontFamily, [family]: value },
                },
              },
            },
          };
        }),

      setShadow: (name, value) =>
        set((state) => {
          const document = requireDocument(state.document);
          return {
            document: {
              ...document,
              tokens: {
                ...document.tokens,
                shadows: { ...document.tokens.shadows, [name]: value },
              },
            },
          };
        }),

      removeShadow: (name) =>
        set((state) => {
          const document = requireDocument(state.document);
          const { [name]: _removed, ...rest } = document.tokens.shadows;
          return {
            document: {
              ...document,
              tokens: { ...document.tokens, shadows: rest },
            },
          };
        }),

      setStateToken: (key, value) =>
        set((state) => {
          const document = requireDocument(state.document);
          const current = document.tokens.states ?? DEFAULT_STATE_TOKENS;
          return {
            document: {
              ...document,
              tokens: { ...document.tokens, states: { ...current, [key]: value } },
            },
          };
        }),

      setDuration: (name, value) =>
        set((state) => {
          const document = requireDocument(state.document);
          const current = document.tokens.animations ?? DEFAULT_ANIMATION_TOKENS;
          return {
            document: {
              ...document,
              tokens: {
                ...document.tokens,
                animations: { ...current, durations: { ...current.durations, [name]: value } },
              },
            },
          };
        }),

      removeDuration: (name) =>
        set((state) => {
          const document = requireDocument(state.document);
          const current = document.tokens.animations ?? DEFAULT_ANIMATION_TOKENS;
          const { [name]: _removed, ...rest } = current.durations;
          return {
            document: {
              ...document,
              tokens: { ...document.tokens, animations: { ...current, durations: rest } },
            },
          };
        }),

      setEasing: (name, value) =>
        set((state) => {
          const document = requireDocument(state.document);
          const current = document.tokens.animations ?? DEFAULT_ANIMATION_TOKENS;
          return {
            document: {
              ...document,
              tokens: {
                ...document.tokens,
                animations: { ...current, easings: { ...current.easings, [name]: value } },
              },
            },
          };
        }),

      removeEasing: (name) =>
        set((state) => {
          const document = requireDocument(state.document);
          const current = document.tokens.animations ?? DEFAULT_ANIMATION_TOKENS;
          const { [name]: _removed, ...rest } = current.easings;
          return {
            document: {
              ...document,
              tokens: { ...document.tokens, animations: { ...current, easings: rest } },
            },
          };
        }),

      setKeyframe: (name, definition) =>
        set((state) => {
          const document = requireDocument(state.document);
          const current = document.tokens.animations ?? DEFAULT_ANIMATION_TOKENS;
          const keyframes = { ...(current.keyframes ?? {}), [name]: definition };
          return {
            document: {
              ...document,
              tokens: { ...document.tokens, animations: { ...current, keyframes } },
            },
          };
        }),

      removeKeyframe: (name) =>
        set((state) => {
          const document = requireDocument(state.document);
          const current = document.tokens.animations ?? DEFAULT_ANIMATION_TOKENS;
          const { [name]: _removed, ...rest } = current.keyframes ?? {};
          const nextKeyframes = Object.keys(rest).length > 0 ? rest : undefined;
          return {
            document: {
              ...document,
              tokens: {
                ...document.tokens,
                animations: { ...current, keyframes: nextKeyframes },
              },
            },
          };
        }),

      setKeyframeStop: (keyframeName, stopIndex, stop) =>
        set((state) => {
          const document = requireDocument(state.document);
          const current = document.tokens.animations ?? DEFAULT_ANIMATION_TOKENS;
          const def = current.keyframes?.[keyframeName];
          if (!def) {
            throw new Error(`project-store: unknown keyframe "${keyframeName}"`);
          }
          const stops = def.stops.slice();
          if (stopIndex >= 0 && stopIndex < stops.length) {
            stops[stopIndex] = stop;
          } else {
            stops.push(stop);
          }
          return {
            document: {
              ...document,
              tokens: {
                ...document.tokens,
                animations: {
                  ...current,
                  keyframes: { ...current.keyframes, [keyframeName]: { stops } },
                },
              },
            },
          };
        }),

      removeKeyframeStop: (keyframeName, stopIndex) =>
        set((state) => {
          const document = requireDocument(state.document);
          const current = document.tokens.animations ?? DEFAULT_ANIMATION_TOKENS;
          const def = current.keyframes?.[keyframeName];
          if (!def) {
            throw new Error(`project-store: unknown keyframe "${keyframeName}"`);
          }
          const stops = def.stops.filter((_, i) => i !== stopIndex);
          return {
            document: {
              ...document,
              tokens: {
                ...document.tokens,
                animations: {
                  ...current,
                  keyframes: { ...current.keyframes, [keyframeName]: { stops } },
                },
              },
            },
          };
        }),

      setVariantClass: (componentId, axis, option, newString, originalString) =>
        set((state) => {
          const document = requireDocument(state.document);
          const componentExists = document.components.some((c) => c.id === componentId);
          if (!componentExists) {
            throw new Error(`project-store: unknown componentId "${componentId}"`);
          }

          const existingIndex = document.overrides.findIndex((o) => o.componentId === componentId);
          const existing = existingIndex >= 0 ? document.overrides[existingIndex] : undefined;

          // Clearing the option: either passed undefined or matches the original.
          const shouldClear = newString === undefined || newString === originalString;

          // Build the next variants map for this component.
          const nextVariants: NonNullable<ComponentOverride['variants']> = {
            ...(existing?.variants ?? {}),
          };
          const axisMap = { ...(nextVariants[axis] ?? {}) };
          if (shouldClear) {
            delete axisMap[option];
          } else {
            axisMap[option] = { replaceWith: newString };
          }
          if (Object.keys(axisMap).length === 0) {
            delete nextVariants[axis];
          } else {
            nextVariants[axis] = axisMap;
          }

          const variantsEmpty = Object.keys(nextVariants).length === 0;
          const next: ComponentOverride = {
            ...existing,
            componentId,
            variants: variantsEmpty ? undefined : nextVariants,
          };

          // Drop the whole override if nothing remains (no variants, no scopedVars).
          const overrideIsEmpty = variantsEmpty && !next.scopedVars;
          const overrides = (() => {
            if (overrideIsEmpty) {
              return existingIndex >= 0
                ? document.overrides.filter((_, i) => i !== existingIndex)
                : document.overrides;
            }
            if (existingIndex >= 0) {
              return document.overrides.map((o, i) => (i === existingIndex ? next : o));
            }
            return [...document.overrides, next];
          })();

          return { document: { ...document, overrides } };
        }),

      upsertOverride: (override) =>
        set((state) => {
          const document = requireDocument(state.document);
          const componentExists = document.components.some((c) => c.id === override.componentId);
          if (!componentExists) {
            throw new Error(
              `project-store: cannot add override for unknown componentId "${override.componentId}"`,
            );
          }
          const existing = document.overrides.findIndex(
            (o) => o.componentId === override.componentId,
          );
          const overrides =
            existing >= 0
              ? document.overrides.map((o, i) => (i === existing ? override : o))
              : [...document.overrides, override];
          return { document: { ...document, overrides } };
        }),

      removeOverride: (componentId) =>
        set((state) => {
          const document = requireDocument(state.document);
          return {
            document: {
              ...document,
              overrides: document.overrides.filter((o) => o.componentId !== componentId),
            },
          };
        }),

      savePreset: (name) => {
        const document = requireDocument(get().document);
        const preset: Preset = {
          id: uniqueId('preset'),
          name,
          tokens: document.tokens,
          overrides: document.overrides.length > 0 ? document.overrides : undefined,
        };
        set({ document: { ...document, presets: [...document.presets, preset] } });
        return preset;
      },

      loadPreset: (id) =>
        set((state) => {
          const document = requireDocument(state.document);
          const preset = document.presets.find((p) => p.id === id);
          if (!preset) throw new Error(`project-store: preset "${id}" not found`);
          return {
            document: {
              ...document,
              tokens: preset.tokens,
              overrides: preset.overrides ?? [],
            },
          };
        }),

      removePreset: (id) =>
        set((state) => {
          const document = requireDocument(state.document);
          return {
            document: {
              ...document,
              presets: document.presets.filter((p) => p.id !== id),
            },
          };
        }),
    }),
    {
      // Only track document changes — action closures aren't state and would
      // otherwise fill the history stack with identical references.
      partialize: (state) => ({ document: state.document }),
      limit: 100,
      // Coalesce rapid updates within 250ms into a single history entry so a
      // slider drag becomes one undo step, not one per frame.
      handleSet: (handleSet) => {
        let timeout: ReturnType<typeof setTimeout> | null = null;
        return (pastState) => {
          if (timeout) clearTimeout(timeout);
          timeout = setTimeout(() => {
            handleSet(pastState);
            timeout = null;
          }, 250);
        };
      },
      // Skip pushing the initial `load()` onto the history stack — it's the
      // baseline, not something users should be able to undo.
      equality: (a, b) => a.document === b.document,
    },
  ),
);

/**
 * Convenience accessor for the temporal API. Use inside components via a
 * selector, e.g. `useProjectStore.temporal((s) => s.undo)`.
 */
export const useTemporalStore = useProjectStore.temporal as unknown as StoreApi<
  TemporalState<{ document: ProjectDocument | null }>
> &
  (<T>(selector: (state: TemporalState<{ document: ProjectDocument | null }>) => T) => T);
