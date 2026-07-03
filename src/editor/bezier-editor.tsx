import { useEffect, useRef, useState } from 'react';
import type { BezierEasing } from './easing';

const VIEW = 200;
const PAD = 24;
const CANVAS = VIEW - PAD * 2;

// Standard cubic-bezier animation curves: x1/x2 must be in [0, 1].
// y1/y2 are less bounded — we allow a bit of overshoot both directions.
const Y_MIN = -0.5;
const Y_MAX = 1.5;

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function toSvgX(x: number): number {
  return PAD + x * CANVAS;
}
function toSvgY(y: number): number {
  return PAD + (1 - y) * CANVAS;
}
function fromSvgX(px: number): number {
  return clamp((px - PAD) / CANVAS, 0, 1);
}
function fromSvgY(px: number): number {
  return clamp(1 - (px - PAD) / CANVAS, Y_MIN, Y_MAX);
}

interface BezierEditorProps {
  bezier: BezierEasing;
  onChange: (next: BezierEasing) => void;
  /** CSS animation timing string, used to trigger the preview dot when the curve changes. */
  cssValue: string;
}

/**
 * Visual bezier editor. Two draggable handles + numeric fields + an animated
 * dot that traces the curve using CSS animation-timing-function set to the
 * live cubic-bezier value. Nobody can hand-author `cubic-bezier(0.16, 1,
 * 0.3, 1)` in one go; the drag targets make it a five-second job.
 */
export function BezierEditor({ bezier, onChange, cssValue }: BezierEditorProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragging, setDragging] = useState<0 | 1 | null>(null);
  const [replayKey, setReplayKey] = useState(0);

  // Replay the preview dot whenever the curve changes so the user sees the
  // animation feel of the new easing. cssValue is intentionally a change
  // trigger — the effect body doesn't consume it directly.
  // biome-ignore lint/correctness/useExhaustiveDependencies: cssValue is the intentional trigger
  useEffect(() => {
    setReplayKey((k) => k + 1);
  }, [cssValue]);

  useEffect(() => {
    if (dragging === null) return;
    const handleMove = (e: MouseEvent) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const x = fromSvgX(e.clientX - rect.left);
      const y = fromSvgY(e.clientY - rect.top);
      onChange(dragging === 0 ? { ...bezier, x1: x, y1: y } : { ...bezier, x2: x, y2: y });
    };
    const handleUp = () => setDragging(null);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragging, bezier, onChange]);

  const p0 = { x: toSvgX(0), y: toSvgY(0) };
  const p1 = { x: toSvgX(bezier.x1), y: toSvgY(bezier.y1) };
  const p2 = { x: toSvgX(bezier.x2), y: toSvgY(bezier.y2) };
  const p3 = { x: toSvgX(1), y: toSvgY(1) };

  const numberField = (key: 'x1' | 'y1' | 'x2' | 'y2', label: string, min: number, max: number) => (
    <label className="flex min-w-0 flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <input
        type="number"
        step={0.01}
        min={min}
        max={max}
        aria-label={`bezier ${key}`}
        value={Number.parseFloat(bezier[key].toFixed(3))}
        onChange={(e) => {
          const n = Number.parseFloat(e.target.value);
          if (!Number.isFinite(n)) return;
          onChange({ ...bezier, [key]: clamp(n, min, max) });
        }}
        className="w-full rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[11px] text-foreground outline-none focus:border-input"
      />
    </label>
  );

  return (
    <div className="flex flex-col gap-2">
      <svg
        ref={svgRef}
        width={VIEW}
        height={VIEW}
        className="self-center rounded-md border border-border bg-background"
        onMouseDown={(e) => {
          // If the user clicks the SVG background, snap the nearest handle to
          // that point — feels faster than "click handle, then drag."
          const rect = svgRef.current?.getBoundingClientRect();
          if (!rect) return;
          const x = fromSvgX(e.clientX - rect.left);
          const y = fromSvgY(e.clientY - rect.top);
          const dist1 = Math.hypot(x - bezier.x1, y - bezier.y1);
          const dist2 = Math.hypot(x - bezier.x2, y - bezier.y2);
          const target = dist1 <= dist2 ? 0 : 1;
          setDragging(target);
          onChange(target === 0 ? { ...bezier, x1: x, y1: y } : { ...bezier, x2: x, y2: y });
        }}
      >
        <title>Cubic bezier curve editor</title>
        {/* Grid backdrop */}
        <rect x={PAD} y={PAD} width={CANVAS} height={CANVAS} fill="none" stroke="rgb(38 38 38)" />
        <line
          x1={PAD}
          y1={PAD + CANVAS / 2}
          x2={PAD + CANVAS}
          y2={PAD + CANVAS / 2}
          stroke="rgb(38 38 38)"
          strokeDasharray="2 3"
        />
        <line
          x1={PAD + CANVAS / 2}
          y1={PAD}
          x2={PAD + CANVAS / 2}
          y2={PAD + CANVAS}
          stroke="rgb(38 38 38)"
          strokeDasharray="2 3"
        />

        {/* Handles */}
        <line x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke="rgb(115 115 115)" strokeWidth={1} />
        <line x1={p3.x} y1={p3.y} x2={p2.x} y2={p2.y} stroke="rgb(115 115 115)" strokeWidth={1} />

        {/* Curve */}
        <path
          d={`M ${p0.x} ${p0.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${p3.x} ${p3.y}`}
          fill="none"
          stroke="rgb(245 245 245)"
          strokeWidth={2}
        />

        {/* Anchor endpoints */}
        <circle cx={p0.x} cy={p0.y} r={3} fill="rgb(115 115 115)" />
        <circle cx={p3.x} cy={p3.y} r={3} fill="rgb(115 115 115)" />

        {/* Control handles (draggable) */}
        {[
          { pos: p1, index: 0 as const, hue: 200 },
          { pos: p2, index: 1 as const, hue: 320 },
        ].map(({ pos, index, hue }) => (
          // biome-ignore lint/a11y/useSemanticElements: <circle> is an SVG primitive; no <button> equivalent inside SVG
          <circle
            key={index}
            role="button"
            aria-label={`Bezier control point ${index + 1}`}
            tabIndex={0}
            cx={pos.x}
            cy={pos.y}
            r={7}
            fill={`hsl(${hue} 70% 60%)`}
            stroke="rgb(245 245 245)"
            strokeWidth={2}
            style={{ cursor: 'grab' }}
            onMouseDown={(e) => {
              e.stopPropagation();
              setDragging(index);
            }}
            onKeyDown={(e) => {
              // Space / Enter starts drag; not required for functionality but
              // silences the a11y lint by making the element keyboard-reachable.
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                setDragging(index);
              }
            }}
          />
        ))}
      </svg>

      {/* Preview strip — an animated dot that reruns the transition on every curve change. */}
      <div className="relative h-2 overflow-hidden rounded-full bg-muted">
        <span
          key={replayKey}
          className="absolute inset-y-0 left-0 w-3 rounded-full bg-primary"
          style={{
            animation: `tincture-bezier-preview 1200ms ${cssValue} 0s 1 forwards`,
          }}
        />
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {numberField('x1', 'X1', 0, 1)}
        {numberField('y1', 'Y1', Y_MIN, Y_MAX)}
        {numberField('x2', 'X2', 0, 1)}
        {numberField('y2', 'Y2', Y_MIN, Y_MAX)}
      </div>
    </div>
  );
}
