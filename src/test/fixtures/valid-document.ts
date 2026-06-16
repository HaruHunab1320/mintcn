import { type ColorMap, type ProjectDocument, SEMANTIC_COLOR_TOKENS } from '@/schema';

function literalColorMap(value: string): ColorMap {
  return Object.fromEntries(
    SEMANTIC_COLOR_TOKENS.map((token) => [token, { kind: 'literal', space: 'oklch', value }]),
  ) as ColorMap;
}

export function buildValidDocument(): ProjectDocument {
  return {
    version: 1,
    meta: {
      name: 'test-project',
      baseColor: 'slate',
      colorSpace: 'oklch',
      config: {
        $schema: 'https://ui.shadcn.com/schema.json',
        style: 'new-york',
        rsc: false,
        tsx: true,
        tailwind: {
          config: '',
          css: 'app/globals.css',
          baseColor: 'slate',
          cssVariables: true,
          prefix: '',
        },
        iconLibrary: 'lucide',
        aliases: {
          components: '@/components',
          ui: '@/components/ui',
          utils: '@/lib/utils',
          lib: '@/lib',
          hooks: '@/hooks',
        },
      },
    },
    tokens: {
      colors: {
        light: literalColorMap('oklch(1 0 0)'),
        dark: literalColorMap('oklch(0 0 0)'),
      },
      radius: { base: '0.625rem' },
      typography: {
        fontFamily: {
          sans: 'ui-sans-serif, system-ui, sans-serif',
          serif: 'ui-serif, Georgia, serif',
          mono: 'ui-monospace, SFMono-Regular, monospace',
        },
        scale: [],
      },
      spacing: [],
      shadows: {},
      borders: { width: {} },
    },
    components: [
      {
        id: 'button',
        registryName: 'button',
        source: { path: 'components/ui/button.tsx' },
        variants: [
          {
            name: 'variant',
            options: ['default', 'destructive'],
            default: 'default',
          },
          { name: 'size', options: ['default', 'sm', 'lg'], default: 'default' },
        ],
        slots: [],
        states: ['hover', 'focus-visible', 'disabled'],
        consumes: {
          cssVars: ['--primary', '--primary-foreground'],
          utilities: [],
        },
      },
    ],
    overrides: [],
    presets: [],
  };
}
