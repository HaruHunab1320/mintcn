import type { Page } from '@playwright/test';
import type { ProjectDocument } from '@/schema';

interface DevWindow {
  __MINTCN_STORE__?: {
    getState: () => { document: ProjectDocument | null };
  };
}

/**
 * Read the live ProjectDocument out of the dev-mode Zustand store handle
 * (App.tsx pins the store on window.__MINTCN_STORE__ under import.meta.env.DEV).
 * Returns null when the store isn't wired or hasn't loaded yet — callers
 * should treat that as a test-environment failure, not an app bug.
 *
 * The document is a plain JSON tree so it marshals cleanly through
 * page.evaluate. Callers can drill into it with normal property access:
 *
 *   const doc = await getDocument(page);
 *   expect(doc?.tokens.colors.light.primary.value).toBe('oklch(...)');
 */
export async function getDocument(page: Page): Promise<ProjectDocument | null> {
  return page.evaluate(() => {
    const win = window as unknown as DevWindow;
    return win.__MINTCN_STORE__?.getState().document ?? null;
  });
}
