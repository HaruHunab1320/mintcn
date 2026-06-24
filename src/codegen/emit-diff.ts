import { createPatch } from 'diff';

export interface EmitDiffInput {
  /** Path relative to the project root, used for the `a/<path>` and `b/<path>` headers. */
  filename: string;
  original: string;
  emitted: string;
}

/**
 * Produce a git-applyable unified diff for one file. Returns the empty string
 * when there is no change so callers can iterate per-target without filtering.
 */
export function emitDiff({ filename, original, emitted }: EmitDiffInput): string {
  if (original === emitted) return '';
  return createPatch(filename, original, emitted, undefined, undefined, { context: 3 });
}
