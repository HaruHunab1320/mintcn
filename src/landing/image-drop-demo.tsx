import { useMemo } from 'react';

/**
 * Closing-chapter demo: a colorful sample image the visitor can drag straight
 * into the palette bar's "From image" drop zone (rendered just below this
 * card), which samples its dominant hues into the five key palette tokens.
 * Shows off the image-sampling feature without needing the visitor to hunt for
 * a file. The image is a canvas-generated PNG data URL, so the drag carries a
 * same-origin source the sampler can read without tainting the canvas.
 */

const BLOBS = [
  { x: 70, y: 60, r: 130, color: '#ff3b5c' },
  { x: 250, y: 48, r: 140, color: '#ffd23f' },
  { x: 120, y: 175, r: 150, color: '#3b82f6' },
  { x: 270, y: 172, r: 130, color: '#d946ef' },
  { x: 185, y: 105, r: 95, color: '#14b8a6' },
] as const;

function makeSwatchImage(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 200;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.fillStyle = '#0b1020';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (const b of BLOBS) {
    const gradient = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
    gradient.addColorStop(0, b.color);
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  return canvas.toDataURL('image/png');
}

export function ImageDropDemo() {
  const src = useMemo(makeSwatchImage, []);
  if (!src) return null;

  return (
    <aside
      aria-label="Sample image"
      className="flex items-center gap-3 rounded-md border border-dashed border-border bg-card/60 p-3"
    >
      <img
        src={src}
        draggable
        alt="Sample — drag me into the palette below"
        className="h-16 w-24 shrink-0 cursor-grab rounded border border-border object-cover active:cursor-grabbing"
      />
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-medium text-foreground">
          Drag this image into the palette below
        </span>
        <span className="text-[11px] text-muted-foreground">
          Mintcn samples its dominant hues into your five key tokens.
        </span>
      </div>
      <span
        aria-hidden="true"
        className="ml-auto self-end pb-0.5 font-mono text-lg text-primary"
        style={{ animation: 'mintcn-point-nudge-down 1s ease-in-out infinite' }}
      >
        ↓
      </span>
    </aside>
  );
}
