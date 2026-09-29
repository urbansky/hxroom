import { describe, expect, it } from 'vitest';
import { isReservedSlug, isValidSlugFormat } from './reserved-slugs';

describe('isReservedSlug', () => {
  it('sperrt die heute belegten Hosts', () => {
    for (const slug of ['www', 'api', 'admin-api', 'app', 'admin', 'livekit', 'autodiscover']) {
      expect(isReservedSlug(slug)).toBe(true);
    }
  });

  it('lässt gewöhnliche Coach-Namen durch', () => {
    expect(isReservedSlug('anna')).toBe(false);
    expect(isReservedSlug('anna-bergmann')).toBe(false);
    expect(isReservedSlug('app-2')).toBe(false);
  });
});

describe('isValidSlugFormat', () => {
  it('nimmt Kleinbuchstaben, Ziffern und innere Bindestriche', () => {
    expect(isValidSlugFormat('anna')).toBe(true);
    expect(isValidSlugFormat('anna-bergmann-2')).toBe(true);
    expect(isValidSlugFormat('a')).toBe(true);
  });

  // Der Browser macht aus `API` und `api.` denselben Host wie aus `api` –
  // ohne Formatprüfung liefe die Sperrliste ins Leere.
  it('weist Großbuchstaben, Punkte und Leerzeichen ab', () => {
    expect(isValidSlugFormat('API')).toBe(false);
    expect(isValidSlugFormat('api.')).toBe(false);
    expect(isValidSlugFormat('anna.bergmann')).toBe(false);
    expect(isValidSlugFormat('anna bergmann')).toBe(false);
  });

  it('weist Bindestriche am Rand ab', () => {
    expect(isValidSlugFormat('-anna')).toBe(false);
    expect(isValidSlugFormat('anna-')).toBe(false);
  });

  it('hält die Länge eines DNS-Labels ein', () => {
    expect(isValidSlugFormat('a'.repeat(63))).toBe(true);
    expect(isValidSlugFormat('a'.repeat(64))).toBe(false);
  });

  it('weist Umlaute und Punycode ab', () => {
    expect(isValidSlugFormat('jürgen')).toBe(false);
    expect(isValidSlugFormat('xn--jrgen-kva')).toBe(false);
  });
});
