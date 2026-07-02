import { oklchDistance, rgbToOklch } from './color-space';
import { type GeneratedPalette, generatePalette, type KeyPaletteToken } from './generate';
import { DEFAULT_RNG, type OklchTriplet, type RandomSource } from './harmony';

const DEFAULT_SAMPLE_DIMENSION = 100;
const DEFAULT_KMEANS_ITERATIONS = 20;
const DEFAULT_KMEANS_CONVERGENCE = 0.001;

export interface Cluster {
  centroid: OklchTriplet;
  /** Number of pixels assigned to this cluster. */
  size: number;
}

/**
 * Sample dominant colors from an image. Downsizes to a small canvas to keep
 * pixel counts manageable, drops fully-transparent pixels, converts each to
 * OKLCH, then hands the result to `kmeansCluster` for grouping.
 */
export async function sampleImagePalette(
  source: HTMLImageElement | ImageBitmap | string | Blob,
  opts: { k?: number; sampleSize?: number; rng?: RandomSource } = {},
): Promise<Cluster[]> {
  const image = await asImageBitmap(source);
  const pixels = drawAndReadPixels(image, opts.sampleSize ?? DEFAULT_SAMPLE_DIMENSION);
  return kmeansCluster(pixels, opts.k ?? 5, opts.rng);
}

async function asImageBitmap(
  source: HTMLImageElement | ImageBitmap | string | Blob,
): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof source === 'string') {
    const res = await fetch(source);
    const blob = await res.blob();
    return createImageBitmap(blob);
  }
  if (source instanceof Blob) return createImageBitmap(source);
  return source;
}

function drawAndReadPixels(image: HTMLImageElement | ImageBitmap, maxDim: number): OklchTriplet[] {
  const w = image.width;
  const h = image.height;
  const scale = Math.min(1, maxDim / Math.max(w, h));
  const dw = Math.max(1, Math.round(w * scale));
  const dh = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement('canvas');
  canvas.width = dw;
  canvas.height = dh;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('image-sample: 2d canvas context unavailable');
  ctx.drawImage(image, 0, 0, dw, dh);
  const { data } = ctx.getImageData(0, 0, dw, dh);
  const out: OklchTriplet[] = [];
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha < 128) continue; // skip mostly-transparent pixels
    out.push(rgbToOklch(data[i], data[i + 1], data[i + 2]));
  }
  return out;
}

/**
 * K-means clustering with k-means++ seeding.
 *
 * Returns clusters sorted by size (descending) so palette-assignment code
 * can treat the first entries as "most common". Empty clusters (which can
 * happen if a centroid captures no pixels) are dropped from the output.
 */
export function kmeansCluster(
  points: OklchTriplet[],
  k: number,
  rng: RandomSource = DEFAULT_RNG,
): Cluster[] {
  if (points.length === 0) return [];
  const targetK = Math.min(k, points.length);
  let centroids = seedKmeansPlusPlus(points, targetK, rng);

  for (let iter = 0; iter < DEFAULT_KMEANS_ITERATIONS; iter++) {
    const buckets: OklchTriplet[][] = centroids.map(() => []);
    for (const p of points) {
      const idx = nearestIndex(p, centroids);
      buckets[idx].push(p);
    }
    let maxShift = 0;
    const next: OklchTriplet[] = centroids.map((c, i) => {
      const bucket = buckets[i];
      if (bucket.length === 0) return c;
      const centroid = meanOklch(bucket);
      maxShift = Math.max(maxShift, oklchDistance(c, centroid));
      return centroid;
    });
    centroids = next;
    if (maxShift < DEFAULT_KMEANS_CONVERGENCE) break;
  }

  // Compute final sizes for sorting.
  const sizes = new Array(centroids.length).fill(0) as number[];
  for (const p of points) sizes[nearestIndex(p, centroids)] += 1;
  return centroids
    .map((centroid, i) => ({ centroid, size: sizes[i] }))
    .filter((c) => c.size > 0)
    .sort((a, b) => b.size - a.size);
}

function nearestIndex(p: OklchTriplet, centroids: OklchTriplet[]): number {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < centroids.length; i++) {
    const d = oklchDistance(p, centroids[i]);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

function meanOklch(points: OklchTriplet[]): OklchTriplet {
  // Averaging in Lab space avoids hue wraparound issues.
  let ax = 0;
  let ay = 0;
  let al = 0;
  for (const p of points) {
    al += p.l;
    ax += p.c * Math.cos((p.h * Math.PI) / 180);
    ay += p.c * Math.sin((p.h * Math.PI) / 180);
  }
  const n = points.length;
  const l = al / n;
  const a = ax / n;
  const b = ay / n;
  const c = Math.hypot(a, b);
  const h = c < 1e-6 ? 0 : ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
  return { l, c, h };
}

function seedKmeansPlusPlus(points: OklchTriplet[], k: number, rng: RandomSource): OklchTriplet[] {
  const centroids: OklchTriplet[] = [points[Math.floor(rng.next() * points.length)]];
  while (centroids.length < k) {
    const distances = points.map((p) => {
      const nearest = centroids.reduce((best, c) => Math.min(best, oklchDistance(p, c)), Infinity);
      return nearest * nearest;
    });
    const total = distances.reduce((s, d) => s + d, 0);
    if (total === 0) break;
    let threshold = rng.next() * total;
    let picked = 0;
    for (let i = 0; i < distances.length; i++) {
      threshold -= distances[i];
      if (threshold <= 0) {
        picked = i;
        break;
      }
    }
    centroids.push(points[picked]);
  }
  return centroids;
}

export interface AssignmentInput {
  clusters: Cluster[];
  /**
   * Current destructive value — kept as-is because red carries semantic
   * meaning we shouldn't override from an arbitrary image.
   */
  currentDestructive?: OklchTriplet;
}

/**
 * Turn image-derived clusters into a palette by assigning them to the four
 * user-facing slots (primary/secondary/accent/background), then cascading
 * out to the full semantic-token set via `generatePalette`.
 *
 * Assignment logic:
 *  - background: the lightest cluster we found (l >= 0.85 preferred). If
 *    none qualifies, fall back to a bright near-white derived from primary.
 *  - primary: the most vibrant of the remaining clusters (highest chroma).
 *  - secondary: next most vibrant.
 *  - accent: next most vibrant.
 *  - destructive: locked to the caller-provided current value.
 */
export function assignPaletteFromImage(input: AssignmentInput): GeneratedPalette {
  const remaining = [...input.clusters];

  // Background: pick the lightest cluster that's plausibly a background
  // (light and low-chroma-ish). Otherwise leave a bright default.
  let background: OklchTriplet | undefined;
  const bgCandidates = remaining
    .map((c, i) => ({ c, i }))
    .filter((r) => r.c.centroid.l >= 0.85)
    .sort((a, b) => b.c.centroid.l - a.c.centroid.l);
  if (bgCandidates.length > 0) {
    background = bgCandidates[0].c.centroid;
    remaining.splice(bgCandidates[0].i, 1);
  }

  // Sort remaining by chroma descending — the most vivid becomes primary.
  remaining.sort((a, b) => b.centroid.c - a.centroid.c);

  const locks: Partial<Record<KeyPaletteToken, OklchTriplet>> = {};
  if (background) locks.background = background;
  if (remaining[0]) locks.primary = remaining[0].centroid;
  if (remaining[1]) locks.secondary = remaining[1].centroid;
  if (remaining[2]) locks.accent = remaining[2].centroid;
  if (input.currentDestructive) locks.destructive = input.currentDestructive;

  return generatePalette({ strategy: 'monochromatic', locks });
}
