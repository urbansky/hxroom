import { describe, expect, it } from 'vitest';
import { deriveCoachStatus, type CoachStatusSource } from './coach-status';

const NOW = new Date('2026-08-17T12:00:00Z');

function source(overrides: Partial<CoachStatusSource> = {}): CoachStatusSource {
  return { banned: false, banExpires: null, emailVerified: true, ...overrides };
}

describe('deriveCoachStatus', () => {
  it('meldet einen bestätigten, ungesperrten Coach als aktiv', () => {
    expect(deriveCoachStatus(source(), NOW)).toBe('active');
  });

  it('meldet eine unbefristete Sperre als gesperrt', () => {
    expect(deriveCoachStatus(source({ banned: true }), NOW)).toBe('suspended');
  });

  it('meldet eine noch laufende befristete Sperre als gesperrt', () => {
    const banExpires = new Date('2026-08-18T12:00:00Z');
    expect(deriveCoachStatus(source({ banned: true, banExpires }), NOW)).toBe('suspended');
  });

  // Der Fall, den man ohne Test garantiert falsch baut: Das admin-Plugin lässt den Login
  // nach Ablauf wieder zu, setzt `banned` aber nicht zurück. Ein Blick nur auf `banned`
  // zeigte den Coach dauerhaft als gesperrt, obwohl er längst wieder arbeiten kann.
  it('meldet eine abgelaufene Sperre nicht mehr als gesperrt', () => {
    const banExpires = new Date('2026-08-16T12:00:00Z');
    expect(deriveCoachStatus(source({ banned: true, banExpires }), NOW)).toBe('active');
  });

  // user.banned ist nullable (default(false) ohne notNull) – Bestandsaccounts aus der Zeit
  // vor dem admin-Plugin haben dort NULL. Die dürfen nicht als gesperrt gelten.
  it('behandelt banned = null als nicht gesperrt', () => {
    expect(deriveCoachStatus(source({ banned: null }), NOW)).toBe('active');
  });

  it('meldet eine nicht bestätigte E-Mail-Adresse als unbestätigt', () => {
    expect(deriveCoachStatus(source({ emailVerified: false }), NOW)).toBe('pending');
  });

  // Vorrangregel: Die Sperre ist die Aussage, die der Betreiber sehen will.
  it('lässt die Sperre Vorrang vor der fehlenden Bestätigung haben', () => {
    expect(deriveCoachStatus(source({ banned: true, emailVerified: false }), NOW)).toBe('suspended');
  });

  // Nach Ablauf der Sperre greift wieder die zweite Regel – nicht 'active'.
  it('fällt nach abgelaufener Sperre auf den Bestätigungsstatus zurück', () => {
    const banExpires = new Date('2026-08-16T12:00:00Z');
    expect(deriveCoachStatus(source({ banned: true, banExpires, emailVerified: false }), NOW)).toBe('pending');
  });
});
