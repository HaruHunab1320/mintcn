import { type KeyboardEvent as ReactKeyboardEvent, type ReactNode, useEffect } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** aria-label for the outer dialog role. Should be unique across open modals. */
  ariaLabel: string;
  children: ReactNode;
  /**
   * Classes applied to the modal surface (the inner container callers put
   * their content in). Defaults to a small modal card. Override with a
   * larger max-w for gallery-style modals.
   */
  surfaceClassName?: string;
  /**
   * Backdrop vertical alignment via top padding. Higher values move the card
   * further down so it doesn't feel sky-anchored on tall screens. Defaults
   * to `pt-[15vh]`.
   */
  backdropAlignClass?: string;
  /**
   * Backdrop background color/opacity. Defaults to `bg-background/80`.
   */
  backdropClassName?: string;
  /**
   * Optional extra keydown handler at the backdrop level. Runs after the
   * built-in Escape handler; used by the command palette for arrow-key
   * navigation without needing to own the whole event chain.
   */
  onBackdropKeyDown?: (e: ReactKeyboardEvent<HTMLDivElement>) => void;
}

/**
 * Shared modal shell for the four editor dialogs (Connect / Font picker /
 * Theme gallery / Command palette). Handles:
 *   - the backdrop (bg + blur + fixed inset)
 *   - Escape to close (via document-level listener, so it survives inner
 *     `stopPropagation` on keydown)
 *   - click-outside to close
 *   - `role="dialog"` + `aria-modal` + `aria-label` on the backdrop
 *   - `role="document"` on the surface
 *   - stopPropagation on the surface's onClick + onKeyDown so app-level
 *     shortcuts (⌘Z, etc.) don't fire while typing in the modal
 *
 * Focus management stays with each caller — a modal's "focus this input on
 * open" is content-specific and not worth encoding here.
 */
export function Modal({
  open,
  onClose,
  ariaLabel,
  children,
  surfaceClassName = 'flex w-full max-w-lg flex-col gap-3 rounded-lg border border-border bg-card p-5 text-foreground shadow-2xl',
  backdropAlignClass = 'pt-[15vh]',
  backdropClassName = 'bg-background/80',
  onBackdropKeyDown,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label={ariaLabel}
      aria-modal="true"
      className={`fixed inset-0 z-50 flex items-start justify-center ${backdropClassName} ${backdropAlignClass} backdrop-blur-sm`}
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
        onBackdropKeyDown?.(e);
      }}
    >
      <div
        role="document"
        className={surfaceClassName}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key !== 'Escape') e.stopPropagation();
        }}
      >
        {children}
      </div>
    </div>
  );
}
