import type { ReactNode } from 'react';

export interface ChipOption<Id extends string> {
  id: Id;
  label: string;
  /** Optional trailing content — a count badge, an icon, whatever. */
  suffix?: ReactNode;
}

interface ChipFilterProps<Id extends string> {
  options: ChipOption<Id>[];
  active: Id;
  onChange: (id: Id) => void;
  /** Extra classes on the outer wrapper — usually a leading label chip. */
  className?: string;
  /** Prepended before the chips (e.g. an "uppercase width" tag). */
  leadingLabel?: string;
  /** Wrapper class override: default is a plain gap row; toggles use a bordered rail. */
  variant?: 'plain' | 'rail';
  ariaLabel?: string;
  /** Tooltip on the wrapper (native title attribute). */
  title?: string;
}

const RAIL_CLASSES = 'inline-flex items-center gap-1 rounded-md border border-border p-1 text-xs';
const PLAIN_CLASSES = 'flex flex-wrap items-center gap-1';

/**
 * A row of segmented chips used for:
 *   - font picker's category filter (All / Sans / Serif / …)
 *   - theme gallery's category + Mine filter
 *   - canvas device / force-state / theme toggles (variant='rail')
 *
 * The `active` chip renders as bg-primary + text-primary-foreground; the rest
 * pick up `text-muted-foreground` with a hover promotion to `text-foreground`.
 */
export function ChipFilter<Id extends string>({
  options,
  active,
  onChange,
  className,
  leadingLabel,
  variant = 'plain',
  ariaLabel,
  title,
}: ChipFilterProps<Id>) {
  const base = variant === 'rail' ? RAIL_CLASSES : PLAIN_CLASSES;
  return (
    <fieldset
      className={className ? `${base} ${className}` : base}
      aria-label={ariaLabel}
      title={title}
    >
      {leadingLabel ? (
        <span className="px-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
          {leadingLabel}
        </span>
      ) : null}
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] transition-colors ${
            opt.id === active
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {opt.label}
          {opt.suffix}
        </button>
      ))}
    </fieldset>
  );
}
