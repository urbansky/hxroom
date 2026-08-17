import { describe, expect, it } from 'vitest';
import { escapeLikePattern } from './sql-like';

describe('escapeLikePattern', () => {
  it('maskiert das Prozentzeichen', () => {
    expect(escapeLikePattern('100%')).toBe('100\\%');
  });

  it('maskiert den Unterstrich', () => {
    expect(escapeLikePattern('vor_name')).toBe('vor\\_name');
  });

  // Der Backslash muss zuerst behandelt werden. Ersetzte man ihn zuletzt, würde die
  // Maskierung von % und _ gleich wieder mitmaskiert und das Muster wäre kaputt.
  it('maskiert den Backslash, ohne die übrige Maskierung zu zerstören', () => {
    expect(escapeLikePattern('a\\b')).toBe('a\\\\b');
    expect(escapeLikePattern('50%\\')).toBe('50\\%\\\\');
  });

  it('maskiert mehrere Sonderzeichen in einer Eingabe', () => {
    expect(escapeLikePattern('%_%')).toBe('\\%\\_\\%');
  });

  it('lässt gewöhnliche Eingaben unverändert', () => {
    expect(escapeLikePattern('')).toBe('');
    expect(escapeLikePattern('Anna Müller')).toBe('Anna Müller');
    expect(escapeLikePattern('anna@example.com')).toBe('anna@example.com');
  });
});
