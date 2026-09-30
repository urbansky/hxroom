import { describe, expect, it } from 'vitest';
// Die Sperrliste liegt in @hxroom/shared (das Paket hat keine eigenen Tests), wirkt aber an
// den Slug-Pfaden der API – deshalb steht der Test hier.
import { bookingPageSchema, isReservedSlug, isValidSlugFormat } from '@hxroom/shared';

describe('bookingPageSchema.subdomain', () => {
  // PATCH /booking-page und das Formular der Coach-App prüfen beide mit diesem Schema.
  it('weist gesperrte Subdomains ab', () => {
    const r = bookingPageSchema.safeParse({ subdomain: 'app' });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe('This subdomain is reserved');
  });

  it('lässt freie Subdomains durch', () => {
    expect(bookingPageSchema.safeParse({ subdomain: 'anna-bergmann' }).success).toBe(true);
    expect(bookingPageSchema.safeParse({}).success).toBe(true);
  });
});

describe('isReservedSlug', () => {
  it('sperrt die heute belegten Hosts', () => {
    for (const slug of ['www', 'api', 'admin-api', 'app', 'admin', 'livekit', 'autodiscover']) {
      expect(isReservedSlug(slug)).toBe(true);
    }
  });

  // demo.hxroom.de ist die Vorführ-Buchungsseite des Betreibers, ein normales Coach-Konto.
  it('lässt demo frei', () => {
    expect(isReservedSlug('demo')).toBe(false);
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
