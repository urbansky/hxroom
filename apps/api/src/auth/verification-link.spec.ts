import { describe, expect, it } from 'vitest';
import { withLoginCallback } from './verification-link';

const API = 'https://api.hxroom.de/api/auth/verify-email?token=abc';
const COACH_APP = 'https://app.hxroom.de/';

describe('withLoginCallback', () => {
  it('lässt die Rücksprung-Adresse der Registrierung unverändert', () => {
    const url = `${API}&callbackURL=${encodeURIComponent('https://app.hxroom.de/auth/login?verified=true')}`;
    expect(withLoginCallback(url, COACH_APP)).toBe(url);
  });

  // Erneuter Versand bei der Anmeldung: better-auth setzt dann `/`, also den API-Host.
  it('ersetzt die relative Adresse durch die Anmeldeseite der Coach-App', () => {
    const result = new URL(withLoginCallback(`${API}&callbackURL=%2F`, COACH_APP));

    expect(result.searchParams.get('token')).toBe('abc');
    expect(result.searchParams.get('callbackURL')).toBe('https://app.hxroom.de/auth/login?verified=true');
  });

  it('ergänzt eine fehlende Rücksprung-Adresse', () => {
    const result = new URL(withLoginCallback(API, COACH_APP));
    expect(result.searchParams.get('callbackURL')).toBe('https://app.hxroom.de/auth/login?verified=true');
  });

  it('lässt einen unlesbaren Link unverändert', () => {
    expect(withLoginCallback('kein link', COACH_APP)).toBe('kein link');
  });
});
