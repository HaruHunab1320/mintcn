import { useState } from 'react';
import type { ProjectDocument } from '@/schema';
import { type FontFamilyKey, useProjectStore } from '@/store/project-store';
import { FontPicker } from '../font-picker';
import {
  buildFontStack,
  type FontCategory,
  loadFontFamily,
  parsePrimaryFamily,
} from '../google-fonts';
import { PanelSection } from '../panel-section';

interface TypographyPanelProps {
  document: ProjectDocument;
}

const FAMILIES: {
  key: FontFamilyKey;
  label: string;
  defaultCategory: FontCategory;
}[] = [
  { key: 'sans', label: '--font-sans', defaultCategory: 'sans-serif' },
  { key: 'serif', label: '--font-serif', defaultCategory: 'serif' },
  { key: 'mono', label: '--font-mono', defaultCategory: 'monospace' },
];

export function TypographyPanel({ document }: TypographyPanelProps) {
  const setFontFamily = useProjectStore((s) => s.setFontFamily);
  const fam = document.tokens.typography.fontFamily;
  const [pickerOpen, setPickerOpen] = useState<FontFamilyKey | null>(null);

  const active = pickerOpen ? (FAMILIES.find((f) => f.key === pickerOpen) ?? null) : null;
  const activePrimary = active ? (parsePrimaryFamily(fam[active.key]) ?? undefined) : undefined;

  return (
    <PanelSection panelId="typography" title="Typography" description="Font-family stacks">
      {FAMILIES.map(({ key, label, defaultCategory }) => {
        const stack = fam[key];
        const primary = parsePrimaryFamily(stack) ?? '';
        return (
          <div key={key} className="flex flex-col gap-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] text-muted-foreground">{label}</span>
              <button
                type="button"
                onClick={() => setPickerOpen(key)}
                aria-label={`Change ${label} font`}
                className="text-[11px] text-muted-foreground hover:text-foreground"
              >
                pick font ↗
              </button>
            </div>
            <button
              type="button"
              onClick={() => setPickerOpen(key)}
              className="flex items-center justify-between rounded border border-border bg-background px-2 py-1.5 text-left transition-colors hover:border-ring"
              style={{ fontFamily: stack }}
            >
              <span className="truncate text-sm text-foreground">{primary || 'Pick a font…'}</span>
              <span className="ml-2 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                {defaultCategory}
              </span>
            </button>
            <input
              type="text"
              value={stack}
              onChange={(e) => setFontFamily(key, e.target.value)}
              aria-label={label}
              spellCheck={false}
              className="rounded border border-border bg-background px-2 py-1 font-mono text-[11px] text-foreground/90 outline-none focus:border-input"
              placeholder='"Inter", sans-serif'
            />
          </div>
        );
      })}

      <FontPicker
        open={pickerOpen !== null}
        currentFamily={activePrimary}
        defaultCategory={active?.defaultCategory}
        onPick={(family, category) => {
          if (!pickerOpen) return;
          const next = buildFontStack(family, category);
          setFontFamily(pickerOpen, next);
          loadFontFamily(family);
          setPickerOpen(null);
        }}
        onClose={() => setPickerOpen(null)}
      />
    </PanelSection>
  );
}
