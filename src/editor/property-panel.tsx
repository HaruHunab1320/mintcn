import type { ProjectDocument } from '@/schema';
import { AnimationPanel } from './panels/animation-panel';
import { ColorPanel } from './panels/color-panel';
import { ComponentPanel } from './panels/component-panel';
import { KeyframePanel } from './panels/keyframe-panel';
import { OverridePanel } from './panels/override-panel';
import { PresetPanel } from './panels/preset-panel';
import { RadiusPanel } from './panels/radius-panel';
import { ShadowPanel } from './panels/shadow-panel';
import { StatePanel } from './panels/state-panel';
import { TypographyPanel } from './panels/typography-panel';

interface PropertyPanelProps {
  document: ProjectDocument;
}

export function PropertyPanel({ document }: PropertyPanelProps) {
  return (
    <aside className="flex w-[340px] shrink-0 flex-col gap-3 overflow-y-auto p-4 text-foreground">
      <PresetPanel document={document} />
      <ColorPanel document={document} />
      <RadiusPanel document={document} />
      <TypographyPanel document={document} />
      <ShadowPanel document={document} />
      <StatePanel document={document} />
      <AnimationPanel document={document} />
      <KeyframePanel document={document} />
      <OverridePanel document={document} />
      <ComponentPanel document={document} />
    </aside>
  );
}
