import { describe, it, expect } from 'vitest';
import { choroplethScale, ACCENT_COLOR } from '@/data/colorScales';

describe('colorScales', () => {
  it('defines three color stops at 0, 50, and 100', () => {
    expect(choroplethScale).toHaveLength(3);
    expect(choroplethScale[0].value).toBe(0);
    expect(choroplethScale[1].value).toBe(50);
    expect(choroplethScale[2].value).toBe(100);
  });

  it('uses correct colors per architecture spec', () => {
    expect(choroplethScale[0].color).toBe('#e5e7eb'); // light gray
    expect(choroplethScale[1].color).toBe('#a5b4fc'); // light indigo
    expect(choroplethScale[2].color).toBe('#3730a3'); // deep indigo
  });

  it('exports accent color as indigo-600', () => {
    expect(ACCENT_COLOR).toBe('#4f46e5');
  });
});
