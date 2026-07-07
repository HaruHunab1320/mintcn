declare module 'virtual:mintcn-fixture' {
  import type { ProjectDocument } from '@/schema';
  export const fixtureProject: ProjectDocument;
  /**
   * Raw bytes of every file the emitters might rewrite, keyed by
   * fixture-root–relative path. Used by the DiffView to compare emitter
   * output against the on-disk source.
   */
  export const fixtureOriginals: Record<string, string>;
}
