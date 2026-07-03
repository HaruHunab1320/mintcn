import { type ComponentType, createContext, type ReactNode, useContext, useMemo } from 'react';
import type { ClassDelta, ProjectDocument } from '@/schema';

/**
 * Runtime override layer for the live preview.
 *
 * At export time the emitter rewrites the cva source so `size.sm` (etc.) has
 * the user's new class string. Doing that in the running app would require
 * unloading/reloading the fixture module. Instead the preview wraps shadcn
 * components in a thin HOC that reads the current document, resolves the
 * override delta for the (variant, size) being rendered, and passes it as
 * `className`.
 *
 * The shadcn component's own `cn(...)` uses tailwind-merge internally, so
 * utilities in the override that conflict with the cva variant defaults win
 * (later wins). Utilities the override doesn't mention stay from the original
 * variant — this is the "overlay via twMerge" semantic the user chose.
 *
 * Non-goal: structural rewrites (removing elements, changing tags). Those
 * still only surface after export.
 */

const OverrideContext = createContext<ProjectDocument | null>(null);

export function OverrideProvider({
  document,
  children,
}: {
  document: ProjectDocument;
  children: ReactNode;
}) {
  return <OverrideContext.Provider value={document}>{children}</OverrideContext.Provider>;
}

function resolveDeltaClass(delta: ClassDelta): string {
  if (delta.replaceWith !== undefined) return delta.replaceWith;
  // The override editor only writes `replaceWith` today; addUtilities is here
  // so runtime + emit stay aligned if the panel ever grows structured edits.
  return (delta.addUtilities ?? []).join(' ');
}

interface OverrideLookupOptions {
  variant?: string;
  size?: string;
}

/**
 * Returns the class string to append when rendering a component instance.
 * Empty string when no override applies.
 */
export function useOverrideClass(
  componentId: string,
  options: OverrideLookupOptions = {},
): string {
  const document = useContext(OverrideContext);
  return useMemo(() => {
    if (!document) return '';
    const override = document.overrides.find((o) => o.componentId === componentId);
    if (!override?.variants) return '';
    const parts: string[] = [];
    if (options.variant) {
      const delta = override.variants.variant?.[options.variant];
      if (delta) parts.push(resolveDeltaClass(delta));
    }
    if (options.size) {
      const delta = override.variants.size?.[options.size];
      if (delta) parts.push(resolveDeltaClass(delta));
    }
    return parts.filter(Boolean).join(' ');
  }, [document, componentId, options.variant, options.size]);
}

interface OverridableProps {
  className?: string;
  variant?: string;
  size?: string;
}

/**
 * Wrap a shadcn component so its rendered className reflects the current
 * override delta. The wrapper is transparent — same props, same behavior,
 * just with the override string appended to className before the underlying
 * cn/tailwind-merge call runs.
 */
export function withOverride<P extends OverridableProps>(
  Component: ComponentType<P>,
  componentId: string,
) {
  const Wrapped = (props: P) => {
    const override = useOverrideClass(componentId, {
      variant: props.variant,
      size: props.size,
    });
    const merged = [props.className, override].filter(Boolean).join(' ');
    return <Component {...props} className={merged || undefined} />;
  };
  Wrapped.displayName = `Overridable(${componentId})`;
  return Wrapped;
}
