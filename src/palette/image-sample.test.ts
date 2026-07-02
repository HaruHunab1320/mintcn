import { describe, expect, it } from 'vitest';
import { rgbToOklch } from './color-space';
import type { RandomSource } from './harmony';
import { assignPaletteFromImage, type Cluster, kmeansCluster } from './image-sample';

function seqRng(values: number[]): RandomSource {
  let i = 0;
  return { next: () => values[i++ % values.length] };
}

describe('kmeansCluster', () => {
  const red = rgbToOklch(220, 20, 20);
  const green = rgbToOklch(20, 220, 20);
  const blue = rgbToOklch(20, 20, 220);

  it('splits three well-separated clusters correctly', () => {
    const pixels = [...Array(10).fill(red), ...Array(6).fill(green), ...Array(4).fill(blue)];
    // Deterministic RNG that picks distinct starting indices via k-means++.
    const clusters = kmeansCluster(pixels, 3, seqRng([0.05, 0.55, 0.85]));
    // Sorted by size descending → red first, then green, then blue.
    expect(clusters.map((c) => c.size)).toEqual([10, 6, 4]);
    // Centroids match the input hues within tolerance.
    expect(Math.abs(clusters[0].centroid.h - red.h)).toBeLessThan(0.1);
    expect(Math.abs(clusters[1].centroid.h - green.h)).toBeLessThan(0.1);
    expect(Math.abs(clusters[2].centroid.h - blue.h)).toBeLessThan(0.1);
  });

  it('returns fewer clusters than requested when input is too small', () => {
    const clusters = kmeansCluster([red], 5, seqRng([0.1]));
    expect(clusters).toHaveLength(1);
  });

  it('handles empty input without throwing', () => {
    expect(kmeansCluster([], 5, seqRng([0]))).toEqual([]);
  });

  it('drops empty clusters from the returned list', () => {
    // Two indistinct colors + k=3 → one centroid ends up with no points.
    const nearRed1 = rgbToOklch(220, 20, 20);
    const nearRed2 = rgbToOklch(218, 22, 24);
    const clusters = kmeansCluster([nearRed1, nearRed2], 3, seqRng([0.1, 0.9, 0.5]));
    expect(clusters.length).toBeLessThanOrEqual(2);
    for (const c of clusters) expect(c.size).toBeGreaterThan(0);
  });
});

describe('assignPaletteFromImage', () => {
  it('assigns the lightest cluster to background', () => {
    const clusters: Cluster[] = [
      { centroid: rgbToOklch(20, 40, 200), size: 100 }, // vivid blue
      { centroid: rgbToOklch(245, 245, 245), size: 60 }, // near-white
      { centroid: rgbToOklch(200, 30, 30), size: 20 }, // red
    ];
    const palette = assignPaletteFromImage({ clusters });
    // Light theme background should come from the near-white cluster (L ≈ 0.96).
    expect(palette.light.background.kind).toBe('literal');
    if (palette.light.background.kind === 'literal') {
      expect(palette.light.background.value).toMatch(/oklch\(0\.9/);
    }
  });

  it('assigns the highest-chroma non-background cluster to primary', () => {
    const clusters: Cluster[] = [
      { centroid: rgbToOklch(250, 250, 250), size: 60 }, // background (light)
      { centroid: rgbToOklch(20, 30, 220), size: 100 }, // vivid blue (should win primary)
      { centroid: rgbToOklch(150, 150, 150), size: 40 }, // grey
    ];
    const palette = assignPaletteFromImage({ clusters });
    // primary should track the blue's hue (~264°)
    if (palette.light.primary.kind === 'literal') {
      const m = palette.light.primary.value.match(/oklch\([\d.]+ [\d.]+ ([\d.]+)/);
      expect(m).not.toBeNull();
      if (m) expect(Number.parseFloat(m[1])).toBeGreaterThan(260);
    }
  });

  it('preserves the caller-provided destructive color', () => {
    const currentDestructive = { l: 0.577, c: 0.245, h: 27.325 };
    const clusters: Cluster[] = [
      { centroid: rgbToOklch(250, 250, 250), size: 40 },
      { centroid: rgbToOklch(20, 30, 220), size: 100 },
    ];
    const palette = assignPaletteFromImage({ clusters, currentDestructive });
    if (palette.light.destructive.kind === 'literal') {
      expect(palette.light.destructive.value).toBe('oklch(0.577 0.245 27.325)');
    }
  });
});
