import type { DevicePreset, ForceState, PreviewTheme } from '@/renderer';

/**
 * "Test it like it ships" panel for the /learn QA chapter. Drives the same
 * three preview controls the editor's canvas header exposes — responsive width,
 * forced pseudo-state, and light/dark — but as big labeled rows in the reading
 * flow, so the visitor discovers they can check every breakpoint and state
 * before opening the diff.
 */

interface PreviewControlsProps {
  device: DevicePreset;
  onDevice: (device: DevicePreset) => void;
  forceState: ForceState;
  onForceState: (state: ForceState) => void;
  theme: PreviewTheme;
  onTheme: (theme: PreviewTheme) => void;
}

const WIDTHS: { id: DevicePreset; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'mobile', label: 'Mobile' },
  { id: 'tablet', label: 'Tablet' },
  { id: 'desktop', label: 'Desktop' },
];
const STATES: { id: ForceState; label: string }[] = [
  { id: 'off', label: 'Rest' },
  { id: 'hover', label: 'Hover' },
  { id: 'focus-visible', label: 'Focus' },
  { id: 'active', label: 'Active' },
  { id: 'disabled', label: 'Disabled' },
];
const THEMES: { id: PreviewTheme; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

function Row<T extends string>({
  label,
  options,
  active,
  onSelect,
}: {
  label: string;
  options: { id: T; label: string }[];
  active: T;
  onSelect: (id: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onSelect(o.id)}
            data-active={o.id === active ? '' : undefined}
            className="rounded-md border border-border px-2.5 py-1 text-xs text-foreground transition-colors hover:border-ring data-[active]:border-primary data-[active]:bg-primary data-[active]:text-primary-foreground"
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function PreviewControls({
  device,
  onDevice,
  forceState,
  onForceState,
  theme,
  onTheme,
}: PreviewControlsProps) {
  return (
    <aside
      aria-label="Preview controls"
      className="flex flex-col gap-3 rounded-md border border-border bg-card/60 p-4 shadow-sm backdrop-blur"
    >
      <header className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
        test it like it ships
      </header>
      <Row label="Width" options={WIDTHS} active={device} onSelect={onDevice} />
      <Row label="Force state" options={STATES} active={forceState} onSelect={onForceState} />
      <Row label="Mode" options={THEMES} active={theme} onSelect={onTheme} />
    </aside>
  );
}
