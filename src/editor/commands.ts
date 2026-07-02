import type { ExportShape } from './export-zip';
import type { PanelId } from './panel-section';

export type CommandGroup = 'Navigate' | 'Palette' | 'Theme' | 'Workflow' | 'Export';

export interface CommandEntry {
  id: string;
  label: string;
  /** Optional hint shown to the right of the label (e.g. shortcut). */
  hint?: string;
  group: CommandGroup;
  keywords: string[];
  /** Invoked when the user activates the entry. */
  action: () => void | Promise<void>;
}

/**
 * Context passed to the command builder so each entry can call back into the
 * store or any host-provided actions (open diff, change export shape, etc.).
 */
export interface CommandContext {
  scrollToPanel: (id: PanelId) => void;
  generatePalette: () => void;
  toggleTheme: () => void;
  toggleForceState: () => void;
  openDiff: () => void;
  exportShape: (shape: ExportShape) => void;
  savePresetPrompt: () => void;
  undo: () => void;
  redo: () => void;
  openConnect: () => void;
  resetToFixture: () => void;
}

const PANEL_LABELS: { id: PanelId; label: string }[] = [
  { id: 'presets', label: 'Presets' },
  { id: 'colors', label: 'Colors' },
  { id: 'radius', label: 'Radius' },
  { id: 'typography', label: 'Typography' },
  { id: 'shadows', label: 'Shadows' },
  { id: 'states', label: 'States' },
  { id: 'durations', label: 'Durations' },
  { id: 'easings', label: 'Easings' },
  { id: 'keyframes', label: 'Keyframes' },
  { id: 'overrides', label: 'Overrides' },
  { id: 'component', label: 'Component inspector' },
];

/**
 * Build the full command list. Pure: same context → same commands, suitable
 * for `useMemo` in the host. The order here is also the default ordering
 * shown when the search input is empty.
 */
export function buildCommands(ctx: CommandContext): CommandEntry[] {
  const commands: CommandEntry[] = [];

  commands.push({
    id: 'project.connect',
    label: 'Connect a GitHub project…',
    group: 'Workflow',
    keywords: ['connect', 'project', 'github', 'repo', 'import', 'load'],
    action: ctx.openConnect,
  });

  commands.push({
    id: 'project.reset',
    label: 'Reset to fixture',
    group: 'Workflow',
    keywords: ['reset', 'fixture', 'demo', 'default'],
    action: ctx.resetToFixture,
  });

  commands.push({
    id: 'history.undo',
    label: 'Undo',
    hint: '⌘Z',
    group: 'Workflow',
    keywords: ['undo', 'back', 'revert', 'history'],
    action: ctx.undo,
  });

  commands.push({
    id: 'history.redo',
    label: 'Redo',
    hint: '⌘⇧Z',
    group: 'Workflow',
    keywords: ['redo', 'forward', 'history'],
    action: ctx.redo,
  });

  commands.push({
    id: 'palette.generate',
    label: 'Generate palette',
    hint: 'Space',
    group: 'Palette',
    keywords: ['random', 'roll', 'colors', 'palette', 'generate'],
    action: ctx.generatePalette,
  });

  commands.push({
    id: 'theme.toggle',
    label: 'Toggle light / dark theme',
    group: 'Theme',
    keywords: ['theme', 'dark', 'light', 'mode'],
    action: ctx.toggleTheme,
  });

  commands.push({
    id: 'force-state.cycle',
    label: 'Cycle force-state preview',
    group: 'Theme',
    keywords: ['hover', 'focus', 'active', 'disabled', 'state', 'preview', 'force'],
    action: ctx.toggleForceState,
  });

  commands.push({
    id: 'diff.open',
    label: 'Show diff',
    group: 'Workflow',
    keywords: ['diff', 'changes', 'patch', 'review'],
    action: ctx.openDiff,
  });

  commands.push({
    id: 'preset.save',
    label: 'Save current as preset…',
    group: 'Workflow',
    keywords: ['preset', 'snapshot', 'save'],
    action: ctx.savePresetPrompt,
  });

  for (const shape of [
    'theme-files',
    'registry-item',
    'component-overrides',
    'everything',
  ] as const) {
    const label = {
      'theme-files': 'Export theme files (globals.css + components.json)',
      'registry-item': 'Export registry theme item (.json)',
      'component-overrides': 'Export component overrides (.tsx)',
      everything: 'Export everything',
    }[shape];
    commands.push({
      id: `export.${shape}`,
      label,
      group: 'Export',
      keywords: ['export', 'download', 'zip', shape.replace('-', ' ')],
      action: () => ctx.exportShape(shape),
    });
  }

  for (const { id, label } of PANEL_LABELS) {
    commands.push({
      id: `nav.${id}`,
      label: `Jump to ${label}`,
      group: 'Navigate',
      keywords: ['jump', 'go', 'panel', 'section', label.toLowerCase(), id],
      action: () => ctx.scrollToPanel(id),
    });
  }

  return commands;
}

/** Substring + keyword fuzzy filter. Stable, predictable, no third-party lib. */
export function filterCommands(commands: CommandEntry[], query: string): CommandEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return commands;
  return commands
    .map((c) => ({ command: c, score: scoreCommand(c, q) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.command);
}

function scoreCommand(command: CommandEntry, query: string): number {
  const label = command.label.toLowerCase();
  if (label === query) return 100;
  if (label.startsWith(query)) return 60;
  if (label.includes(query)) return 30;
  for (const keyword of command.keywords) {
    const k = keyword.toLowerCase();
    if (k === query) return 20;
    if (k.startsWith(query)) return 10;
    if (k.includes(query)) return 5;
  }
  return 0;
}
