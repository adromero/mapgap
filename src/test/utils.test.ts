import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn utility', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    const isHidden = false;
    expect(cn('base', isHidden && 'hidden', 'extra')).toBe('base extra');
  });

  it('deduplicates Tailwind classes', () => {
    const result = cn('p-4', 'p-2');
    expect(result).toBe('p-2');
  });

  it('handles empty input', () => {
    expect(cn()).toBe('');
  });
});
