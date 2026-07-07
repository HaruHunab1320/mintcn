import { type PointerEvent as ReactPointerEvent, useEffect, useRef } from 'react';
import { oklchToRgb } from '@/palette';

const SIZE = 168;
const RADIUS = SIZE / 2 - 4;
const MAX_CHROMA = 0.4;

interface ColorWheelProps {
  /** Current lightness (0..1). The wheel is redrawn when L changes. */
  l: number;
  /** Current chroma (0..MAX_CHROMA). Drives the crosshair position. */
  c: number;
  /** Current hue (0..360). Drives the crosshair position. */
  h: number;
  onChange: (next: { c: number; h: number }) => void;
}

/**
 * OKLCH color wheel. Angle around the origin = hue (0° at right, going CCW like
 * standard math convention). Radial distance = chroma normalized to MAX_CHROMA
 * (matches the C slider's cap). Pixels outside the sRGB gamut for the current
 * L are hatched by desaturating toward gray — makes it obvious where the
 * reachable colors end.
 */
export function ColorWheel({ l, c, h, onChange }: ColorWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const draggingRef = useRef(false);

  // Repaint whenever lightness changes. Hue/chroma changes only move the
  // crosshair, so they don't invalidate the pixel data.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const image = ctx.createImageData(SIZE, SIZE);
    const data = image.data;
    const cx = SIZE / 2;
    const cy = SIZE / 2;
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const r = Math.hypot(dx, dy);
        const i = (y * SIZE + x) * 4;
        if (r > RADIUS) {
          data[i + 3] = 0;
          continue;
        }
        const chroma = (r / RADIUS) * MAX_CHROMA;
        // Screen y grows downward; flip so 0° is right and hues go
        // counter-clockwise (matches HSL wheels people are used to).
        const hue = (Math.atan2(-dy, dx) * 180) / Math.PI;
        const positive = hue < 0 ? hue + 360 : hue;
        const rgb = oklchToRgb(l, chroma, positive);
        // Fade out-of-gamut pixels toward the neutral-at-this-L color so
        // the reachable region is visually clear.
        if (rgb.outOfGamut) {
          const fade = oklchToRgb(l, 0, 0);
          data[i] = Math.round((rgb.r + fade.r * 3) / 4);
          data[i + 1] = Math.round((rgb.g + fade.g * 3) / 4);
          data[i + 2] = Math.round((rgb.b + fade.b * 3) / 4);
          data[i + 3] = 180;
        } else {
          data[i] = rgb.r;
          data[i + 1] = rgb.g;
          data[i + 2] = rgb.b;
          data[i + 3] = 255;
        }
      }
    }
    ctx.putImageData(image, 0, 0);
  }, [l]);

  const pointerToOklch = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    // Rect is CSS pixels; canvas is fixed logical size. Scale accordingly.
    const scaleX = SIZE / rect.width;
    const scaleY = SIZE / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const dx = x - SIZE / 2;
    const dy = y - SIZE / 2;
    const r = Math.min(RADIUS, Math.hypot(dx, dy));
    const chroma = (r / RADIUS) * MAX_CHROMA;
    const rawHue = (Math.atan2(-dy, dx) * 180) / Math.PI;
    const hue = rawHue < 0 ? rawHue + 360 : rawHue;
    return { c: chroma, h: hue };
  };

  const handleDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    draggingRef.current = true;
    canvasRef.current?.setPointerCapture(e.pointerId);
    const next = pointerToOklch(e);
    if (next) onChange(next);
  };
  const handleMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!draggingRef.current) return;
    const next = pointerToOklch(e);
    if (next) onChange(next);
  };
  const handleUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    draggingRef.current = false;
    canvasRef.current?.releasePointerCapture(e.pointerId);
  };

  // Crosshair position for the current (c, h). Mirrors the pointer-to-OKLCH
  // math in reverse.
  const rNorm = Math.min(1, c / MAX_CHROMA);
  const crosshairX = SIZE / 2 + rNorm * RADIUS * Math.cos((h * Math.PI) / 180);
  const crosshairY = SIZE / 2 - rNorm * RADIUS * Math.sin((h * Math.PI) / 180);

  return (
    <div
      className="relative mx-auto"
      style={{ width: SIZE, height: SIZE }}
      aria-label="OKLCH color wheel"
      role="application"
    >
      <canvas
        ref={canvasRef}
        width={SIZE}
        height={SIZE}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerCancel={handleUp}
        className="h-full w-full cursor-crosshair touch-none rounded-full"
        data-mintcn-color-wheel
      />
      {/* Crosshair — a small ring so it's visible over both bright and dark
          areas of the wheel. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.6)]"
        style={{ left: crosshairX, top: crosshairY }}
      />
    </div>
  );
}
