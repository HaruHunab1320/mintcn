import { describe, expect, it, vi } from 'vitest';
import { buildCommands, type CommandContext, filterCommands } from './commands';

function buildCtx(): CommandContext {
  return {
    scrollToPanel: vi.fn(),
    generatePalette: vi.fn(),
    toggleTheme: vi.fn(),
    toggleForceState: vi.fn(),
    openDiff: vi.fn(),
    exportShape: vi.fn(),
    savePresetPrompt: vi.fn(),
  };
}

describe('buildCommands', () => {
  it('produces a command for every panel + the workflow actions', () => {
    const commands = buildCommands(buildCtx());
    const ids = commands.map((c) => c.id);
    expect(ids).toContain('palette.generate');
    expect(ids).toContain('theme.toggle');
    expect(ids).toContain('force-state.cycle');
    expect(ids).toContain('diff.open');
    expect(ids).toContain('preset.save');
    expect(ids).toContain('export.theme-files');
    expect(ids).toContain('export.registry-item');
    expect(ids).toContain('nav.colors');
    expect(ids).toContain('nav.keyframes');
    expect(ids).toContain('nav.overrides');
  });

  it('invokes scrollToPanel with the right id when nav action fires', () => {
    const ctx = buildCtx();
    const commands = buildCommands(ctx);
    const navColors = commands.find((c) => c.id === 'nav.colors');
    navColors?.action();
    expect(ctx.scrollToPanel).toHaveBeenCalledWith('colors');
  });
});

describe('filterCommands', () => {
  const ctx = buildCtx();
  const all = buildCommands(ctx);

  it('returns the full list when query is empty', () => {
    expect(filterCommands(all, '')).toEqual(all);
  });

  it('label-prefix beats label-contains beats keyword-contains', () => {
    const result = filterCommands(all, 'export');
    // Every "Export …" command label starts with "export" → score 60.
    // Some Workflow keywords also include "export" → score 5.
    expect(result[0].label.toLowerCase()).toContain('export');
    expect(result.every((c) => c.group === 'Export')).toBe(true);
  });

  it('matches via keyword aliases', () => {
    const result = filterCommands(all, 'roll');
    expect(result[0].id).toBe('palette.generate');
  });

  it('returns empty when nothing matches', () => {
    expect(filterCommands(all, 'definitely-no-such-thing')).toEqual([]);
  });
});
