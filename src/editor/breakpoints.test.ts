import { describe, expect, it } from 'vitest';
import { joinByBreakpoint, splitByBreakpoint } from './breakpoints';

describe('splitByBreakpoint', () => {
  it('sorts unprefixed classes into base', () => {
    const buckets = splitByBreakpoint('flex items-center gap-2');
    expect(buckets.base).toBe('flex items-center gap-2');
    expect(buckets.md).toBe('');
  });

  it('routes each breakpoint prefix into the right bucket', () => {
    const buckets = splitByBreakpoint('flex sm:hidden md:flex lg:gap-4 xl:px-8 2xl:px-12');
    expect(buckets.base).toBe('flex');
    expect(buckets.sm).toBe('hidden');
    expect(buckets.md).toBe('flex');
    expect(buckets.lg).toBe('gap-4');
    expect(buckets.xl).toBe('px-8');
    expect(buckets['2xl']).toBe('px-12');
  });

  it('preserves compound prefixes (only strips the leading breakpoint)', () => {
    const buckets = splitByBreakpoint('md:hover:bg-primary dark:bg-slate-900');
    expect(buckets.md).toBe('hover:bg-primary');
    expect(buckets.base).toBe('dark:bg-slate-900');
  });

  it('handles empty input', () => {
    expect(splitByBreakpoint('').base).toBe('');
  });
});

describe('joinByBreakpoint', () => {
  it('re-prefixes every token in a non-base bucket', () => {
    const joined = joinByBreakpoint({
      base: 'flex items-center',
      sm: 'hidden',
      md: 'flex gap-4',
      lg: '',
      xl: '',
      '2xl': '',
    });
    expect(joined).toBe('flex items-center sm:hidden md:flex md:gap-4');
  });

  it('does not double-prefix a token that already has the breakpoint', () => {
    const joined = joinByBreakpoint({
      base: '',
      sm: '',
      md: 'md:text-sm',
      lg: '',
      xl: '',
      '2xl': '',
    });
    expect(joined).toBe('md:text-sm');
  });

  it('round-trips well-formed inputs (canonical base-then-breakpoint ordering)', () => {
    // Split → join always canonicalizes to "base classes first, then sm, md,
    // lg, xl, 2xl in order". Round-trip = split → join → split → join stays
    // the same shape even if the very first round moves things around.
    const originals = [
      'flex items-center gap-2',
      'flex md:hidden lg:flex',
      'flex sm:hidden md:flex lg:gap-4 xl:px-8 2xl:px-12',
      'dark:bg-slate-900 md:hover:bg-primary',
    ];
    for (const original of originals) {
      const once = joinByBreakpoint(splitByBreakpoint(original));
      const twice = joinByBreakpoint(splitByBreakpoint(once));
      expect(twice).toBe(once);
    }
  });
});
