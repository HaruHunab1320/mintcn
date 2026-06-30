import type { ProjectDocument } from '@/schema';
import { type FontFamilyKey, useProjectStore } from '@/store/project-store';
import { PanelSection } from '../panel-section';

interface TypographyPanelProps {
  document: ProjectDocument;
}

const FAMILIES: { key: FontFamilyKey; label: string }[] = [
  { key: 'sans', label: '--font-sans' },
  { key: 'serif', label: '--font-serif' },
  { key: 'mono', label: '--font-mono' },
];

export function TypographyPanel({ document }: TypographyPanelProps) {
  const setFontFamily = useProjectStore((s) => s.setFontFamily);
  const fam = document.tokens.typography.fontFamily;
  return (
    <PanelSection panelId="typography" title="Typography" description="Font-family stacks">
      {FAMILIES.map(({ key, label }) => (
        <label key={key} className="flex flex-col gap-1 text-xs">
          <span className="font-mono text-[11px] text-neutral-400">{label}</span>
          <input
            type="text"
            value={fam[key]}
            onChange={(e) => setFontFamily(key, e.target.value)}
            className="rounded border border-neutral-800 bg-neutral-950 px-2 py-1 font-mono text-[11px] text-neutral-100 outline-none focus:border-neutral-600"
          />
        </label>
      ))}
    </PanelSection>
  );
}
