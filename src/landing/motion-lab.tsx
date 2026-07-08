import { EASING_PRESETS, matchPreset } from '@/editor/easing';
import { useProjectStore } from '@/store/project-store';

/**
 * Editable motion panel shown on the /learn preview during the timing-tokens
 * chapter. Reads `--duration-*` / `--ease-*` straight from the store and lets
 * the visitor drag durations and pick easing curves — every edit dispatches
 * `setDuration` / `setEasing`, so the animated strip below (and every real
 * component in the preview) retimes as they play. Same idea as the override
 * callout: make the invisible token edit tangible and hand the tool over.
 */

const DURATION_ROWS = [
  { name: 'normal', label: '--duration-normal', min: 100, max: 3000, fallback: 400 },
  { name: 'slow', label: '--duration-slow', min: 200, max: 4000, fallback: 800 },
] as const;

const EASING_ROWS = [
  { name: 'out', label: '--ease-out', fallback: 'cubic-bezier(0.16, 1, 0.3, 1)' },
  { name: 'in-out', label: '--ease-in-out', fallback: 'cubic-bezier(0.87, 0, 0.13, 1)' },
] as const;

function parseMs(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

interface MotionLabProps {
  /** Only render on the timing chapter — mirrors OverrideCallout's gating. */
  visible: boolean;
}

export function MotionLab({ visible }: MotionLabProps) {
  const document = useProjectStore((s) => s.document);
  const setDuration = useProjectStore((s) => s.setDuration);
  const setEasing = useProjectStore((s) => s.setEasing);
  if (!visible || !document) return null;

  const animations = document.tokens.animations ?? { durations: {}, easings: {} };

  return (
    <aside
      aria-label="Motion tokens"
      className="flex flex-col gap-4 rounded-md border border-border bg-card/60 p-4 text-[11px] shadow-sm backdrop-blur"
    >
      <header className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
        editable motion — drag &amp; pick to retime
      </header>

      <div className="flex flex-col gap-3">
        {DURATION_ROWS.map((row) => {
          const ms = parseMs(animations.durations[row.name], row.fallback);
          return (
            <label key={row.name} className="flex flex-col gap-1">
              <span className="flex items-center justify-between font-mono text-[10px] text-muted-foreground">
                <span>{row.label}</span>
                <span className="text-foreground/90">{ms}ms</span>
              </span>
              <input
                type="range"
                min={row.min}
                max={row.max}
                step={50}
                value={ms}
                aria-label={`${row.label} duration`}
                onChange={(e) => setDuration(row.name, `${e.target.value}ms`)}
                className="w-full accent-primary"
              />
            </label>
          );
        })}

        {EASING_ROWS.map((row) => {
          const value = animations.easings[row.name] ?? row.fallback;
          const preset = matchPreset(value);
          return (
            <label key={row.name} className="flex flex-col gap-1">
              <span className="flex items-center justify-between font-mono text-[10px] text-muted-foreground">
                <span>{row.label}</span>
                <span className="truncate pl-2 text-foreground/70">{value}</span>
              </span>
              <select
                value={preset?.id ?? '__custom__'}
                aria-label={`${row.label} easing`}
                onChange={(e) => {
                  const next = EASING_PRESETS.find((p) => p.id === e.target.value);
                  if (next) setEasing(row.name, next.value);
                }}
                className="rounded border border-border bg-background px-2 py-1 text-[11px] text-foreground outline-none focus:border-ring"
              >
                <option value="__custom__" disabled hidden>
                  Custom
                </option>
                {(['CSS', 'Material', 'Apple', 'Utility'] as const).map((family) => (
                  <optgroup key={family} label={family}>
                    {EASING_PRESETS.filter((p) => p.family === family).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
          );
        })}
      </div>

      {/* Live strip: bound to the same CSS vars the sliders write, so it
          retimes on the next iteration as the visitor drags. */}
      <div className="flex flex-col gap-3 border-t border-border pt-3">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="w-12">Pulse</span>
          <span
            className="inline-block h-4 w-4 rounded-full bg-primary"
            style={{
              animation:
                'mintcn-demo-pulse var(--duration-normal, 400ms) var(--ease-out, ease-out) infinite alternate',
            }}
          />
          <span className="font-mono text-[10px] text-muted-foreground/70">normal · out</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="w-12">Slide</span>
          <div className="relative h-4 flex-1 rounded-full bg-muted">
            <span
              className="absolute inset-y-0 h-4 w-4 rounded-full bg-primary"
              style={{
                animation:
                  'mintcn-demo-slide var(--duration-slow, 800ms) var(--ease-in-out, ease-in-out) infinite alternate',
              }}
            />
          </div>
          <span className="font-mono text-[10px] text-muted-foreground/70">slow · in-out</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="w-12">Rotate</span>
          <span
            className="inline-block h-6 w-6 rounded bg-primary"
            style={{
              animation: 'mintcn-demo-rotate var(--duration-slow, 1200ms) linear infinite',
            }}
          />
          <span className="font-mono text-[10px] text-muted-foreground/70">slow · linear</span>
        </div>
      </div>
    </aside>
  );
}
