import type { ReactNode } from 'react';

export type PanelId =
  | 'presets'
  | 'colors'
  | 'radius'
  | 'typography'
  | 'shadows'
  | 'states'
  | 'durations'
  | 'easings'
  | 'keyframes'
  | 'overrides'
  | 'component';

interface PanelSectionProps {
  /** Stable id used by the command palette to scroll the section into view. */
  panelId?: PanelId;
  title: string;
  description?: string;
  children: ReactNode;
}

/** A titled, bordered card for one panel category. Pure presentational. */
export function PanelSection({ panelId, title, description, children }: PanelSectionProps) {
  return (
    <section
      data-panel-id={panelId}
      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm"
    >
      <header className="flex flex-col gap-0.5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground/90">{title}</h3>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </header>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}
