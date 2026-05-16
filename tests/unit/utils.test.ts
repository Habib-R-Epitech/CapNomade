import { describe, expect, it } from 'vitest';
import { slugify, formatCurrency, formatDateRange } from '@/lib/utils';

describe('slugify', () => {
  it('handles accents and special chars', () => {
    expect(slugify('Échappée à Bali — édition spéciale!')).toBe('echappee-a-bali-edition-speciale');
  });
  it('returns empty string for fully invalid input', () => {
    expect(slugify('— —')).toBe('');
  });
});

describe('formatCurrency', () => {
  it('formats integer amounts without decimals', () => {
    const out = formatCurrency(120000, 'EUR');
    expect(out.replace(/ /g, ' ')).toContain('1 200');
  });
});

describe('formatDateRange', () => {
  it('returns a single date when start equals end', () => {
    const out = formatDateRange('2026-04-02', '2026-04-02');
    expect(out).toMatch(/2\s*avr/i);
  });
  it('returns an ISO range when across months', () => {
    const out = formatDateRange('2026-04-02', '2026-05-12');
    expect(out).toContain('avr');
    expect(out).toContain('mai');
  });
});
