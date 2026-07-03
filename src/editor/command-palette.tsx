import { useEffect, useMemo, useRef, useState } from 'react';
import { type CommandEntry, type CommandGroup, filterCommands } from './commands';

interface CommandPaletteProps {
  commands: CommandEntry[];
  open: boolean;
  onClose: () => void;
}

const GROUP_ORDER: CommandGroup[] = ['Palette', 'Theme', 'Workflow', 'Export', 'Navigate'];

/**
 * ⌘K command palette. Substring + keyword fuzzy filter over a flat command
 * list; arrow keys cycle the active row, Enter invokes, Escape closes. The
 * filter is delegated to `filterCommands` so it can be unit-tested without
 * mounting the component.
 */
export function CommandPalette({ commands, open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state every time the palette opens so the next invocation feels fresh.
  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      // Focus on next paint so the input is mounted.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const filtered = useMemo(() => filterCommands(commands, query), [commands, query]);

  // Clamp the active index when filtered shrinks.
  useEffect(() => {
    if (active >= filtered.length) setActive(Math.max(0, filtered.length - 1));
  }, [active, filtered.length]);

  if (!open) return null;

  const invoke = (entry: CommandEntry | undefined) => {
    if (!entry) return;
    entry.action();
    onClose();
  };

  const handleKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      invoke(filtered[active]);
    }
  };

  // Group filtered list by category, preserving GROUP_ORDER.
  const groups = new Map<CommandGroup, { entry: CommandEntry; flatIndex: number }[]>();
  filtered.forEach((entry, flatIndex) => {
    const list = groups.get(entry.group) ?? [];
    list.push({ entry, flatIndex });
    groups.set(entry.group, list);
  });

  return (
    <div
      role="dialog"
      aria-label="Command palette"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center bg-background/70 pt-[15vh] backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={handleKey}
    >
      <div
        className="flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-lg border border-border bg-background text-foreground shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="document"
      >
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Search commands…  (↑↓ to navigate, ↵ to invoke, esc to close)"
          aria-label="Search commands"
          className="border-b border-border bg-transparent px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
        />
        <div className="flex flex-1 flex-col overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <p className="px-4 py-2 text-xs text-muted-foreground">No matching commands.</p>
          ) : null}
          {GROUP_ORDER.flatMap((group) => {
            const entries = groups.get(group);
            if (!entries || entries.length === 0) return [];
            return [
              <div
                key={`heading-${group}`}
                className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {group}
              </div>,
              ...entries.map(({ entry, flatIndex }) => (
                <button
                  key={entry.id}
                  type="button"
                  data-command-id={entry.id}
                  onMouseEnter={() => setActive(flatIndex)}
                  onClick={() => invoke(entry)}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-1.5 text-left text-sm transition-colors ${
                    flatIndex === active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  <span>{entry.label}</span>
                  {entry.hint ? (
                    <kbd
                      className={`rounded border px-1.5 text-[10px] ${
                        flatIndex === active
                          ? 'border-primary-foreground/40 text-primary-foreground/70'
                          : 'border-border text-muted-foreground'
                      }`}
                    >
                      {entry.hint}
                    </kbd>
                  ) : null}
                </button>
              )),
            ];
          })}
        </div>
      </div>
    </div>
  );
}
