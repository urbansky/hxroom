import { describe, expect, it } from 'vitest';
import { normalizeEmail } from './normalize-email';

describe('normalizeEmail', () => {
  it('lowercases the address', () => {
    expect(normalizeEmail('Anna@Firma.de')).toBe('anna@firma.de');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeEmail('  anna@firma.de  ')).toBe('anna@firma.de');
  });

  it('maps differently written variants of the same address to one key', () => {
    const variants = ['anna@firma.de', 'ANNA@FIRMA.DE', ' Anna@Firma.De '];
    const normalized = new Set(variants.map(normalizeEmail));
    expect(normalized.size).toBe(1);
  });

  it('leaves an already normalized address untouched', () => {
    expect(normalizeEmail('anna@firma.de')).toBe('anna@firma.de');
  });
});
