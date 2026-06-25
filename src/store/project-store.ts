import { create } from 'zustand';
import {
  type AnimationTokens,
  type ColorValue,
  type ComponentOverride,
  type Preset,
  type ProjectDocument,
  type SemanticColorToken,
  type StateTokens,
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

  load: (input: unknown) => void;
  unload: () => void;

  setTokenColor: (theme: Theme, token: SemanticColorToken, value: ColorValue) => void;
  setRadius: (value: string) => void;
  setFontFamily: (family: FontFamilyKey, value: string) => void;
  setShadow: (name: string, value: string) => void;
  removeShadow: (name: string) => void;

  setStateToken: <K extends keyof StateTokens>(key: K, value: StateTokens[K]) => void;
  setDuration: (name: string, value: string) => void;
  removeDuration: (name: string) => void;
  setEasing: (name: string, value: string) => void;
  removeEasing: (name: string) => void;

  upsertOverride: (override: ComponentOverride) => void;
  removeOverride: (componentId: string) => void;

  savePreset: (name: string) => Preset;
  loadPreset: (id: string) => void;
}

function requireDocument(doc: ProjectDocument | null): ProjectDocument {
  if (!doc) throw new Error('project-store: no document loaded');
  return doc;
}

function uniqueId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  document: null,

  load: (input) => {
    const document = validateProjectDocument(input);
    set({ document });
  },

  unload: () => set({ document: null }),

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

  upsertOverride: (override) =>
    set((state) => {
      const document = requireDocument(state.document);
      const componentExists = document.components.some((c) => c.id === override.componentId);
      if (!componentExists) {
        throw new Error(
          `project-store: cannot add override for unknown componentId "${override.componentId}"`,
        );
      }
      const existing = document.overrides.findIndex((o) => o.componentId === override.componentId);
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
}));
