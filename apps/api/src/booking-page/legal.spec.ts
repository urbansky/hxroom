import { describe, expect, it } from 'vitest';
// Die Regeln liegen in @hxroom/shared (das Paket hat keine eigenen Tests), entscheiden aber
// über die Buchungssperre in BookingsService.create – deshalb steht der Test hier.
import { bookingPageLegalSchema, isBusinessId, isImprintComplete, type Imprint } from '@hxroom/shared';

const imprint: Imprint = {
  name: 'Anna Bergmann',
  street: 'Musterstraße 1',
  postalCode: '01067',
  city: 'Dresden',
  country: 'Deutschland',
  email: 'anna@example.com',
  phone: '+49 351 123456',
};

describe('bookingPageLegalSchema', () => {
  it('nimmt vollständige Angaben mit Bestätigung an', () => {
    expect(bookingPageLegalSchema.safeParse({ imprintMode: 'form', imprint, confirmed: true }).success).toBe(true);
  });

  it('verlangt die Bestätigung', () => {
    const r = bookingPageLegalSchema.safeParse({ imprintMode: 'form', imprint, confirmed: false });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.path).toEqual(['confirmed']);
  });

  // Neben der E-Mail verlangt § 5 DDG einen zweiten schnellen Kontaktweg; ein Kontaktformular
  // gibt es auf der Buchungsseite nicht.
  it('verlangt eine Telefonnummer', () => {
    const { phone: _, ...withoutPhone } = imprint;
    expect(bookingPageLegalSchema.safeParse({ imprintMode: 'form', imprint: withoutPhone, confirmed: true }).success).toBe(false);
    expect(bookingPageLegalSchema.safeParse({ imprintMode: 'form', imprint: { ...imprint, phone: 'ruf mich an' }, confirmed: true }).success).toBe(false);
  });

  it('verlangt bei Gesellschaften die Vertretungsberechtigten', () => {
    const gbr = { ...imprint, legalForm: 'gbr' as const };
    expect(bookingPageLegalSchema.safeParse({ imprintMode: 'form', imprint: gbr, confirmed: true }).success).toBe(false);
    expect(bookingPageLegalSchema.safeParse({ imprintMode: 'form', imprint: { ...gbr, representative: 'Anna und Ben Bergmann' }, confirmed: true }).success).toBe(true);
  });

  // UG, GmbH und PartG stehen immer in einem Register, die GbR nur freiwillig.
  it('verlangt den Registereintrag nur bei eingetragenen Rechtsformen', () => {
    const gmbh = { ...imprint, legalForm: 'gmbh' as const, representative: 'Anna Bergmann' };
    const r = bookingPageLegalSchema.safeParse({ imprintMode: 'form', imprint: gmbh, confirmed: true });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.path).toEqual(['imprint', 'register']);
    expect(bookingPageLegalSchema.safeParse({ imprintMode: 'form', imprint: { ...gmbh, register: 'Amtsgericht Dresden, HRB 1' }, confirmed: true }).success).toBe(true);
    expect(bookingPageLegalSchema.safeParse({ imprintMode: 'form', imprint: { ...imprint, legalForm: 'gbr', representative: 'Anna und Ben' }, confirmed: true }).success).toBe(true);
  });

  it('nimmt die Wirtschafts-ID im Feld der USt-IdNr. an', () => {
    expect(bookingPageLegalSchema.safeParse({ imprintMode: 'form', imprint: { ...imprint, vatId: 'DE123456789-00001' }, confirmed: true }).success).toBe(true);
    expect(isBusinessId('DE123456789-00001')).toBe(true);
    expect(isBusinessId('DE123456789')).toBe(false);
  });

  it('verlangt je nach Form die Angaben oder den Link', () => {
    expect(bookingPageLegalSchema.safeParse({ imprintMode: 'form', confirmed: true }).success).toBe(false);
    expect(bookingPageLegalSchema.safeParse({ imprintMode: 'link', confirmed: true }).success).toBe(false);
    expect(bookingPageLegalSchema.safeParse({ imprintMode: 'link', imprintUrl: 'https://anna.example/impressum', confirmed: true }).success).toBe(true);
  });

  it('nimmt nur http(s)-Links an', () => {
    expect(bookingPageLegalSchema.safeParse({ imprintMode: 'link', imprintUrl: 'javascript:alert(1)', confirmed: true }).success).toBe(false);
    expect(bookingPageLegalSchema.safeParse({ imprintMode: 'form', imprint, termsUrl: 'ftp://anna.example/agb', confirmed: true }).success).toBe(false);
  });
});

describe('isImprintComplete', () => {
  const confirmedAt = new Date('2026-10-15T10:00:00Z');

  it('ist ohne gespeicherte Angaben unvollständig', () => {
    expect(isImprintComplete(null)).toBe(false);
    expect(isImprintComplete({ imprintMode: null, imprint: null, imprintUrl: null, imprintConfirmedAt: null })).toBe(false);
  });

  it('ist erst mit Bestätigung vollständig', () => {
    expect(isImprintComplete({ imprintMode: 'form', imprint, imprintUrl: null, imprintConfirmedAt: null })).toBe(false);
    expect(isImprintComplete({ imprintMode: 'form', imprint, imprintUrl: null, imprintConfirmedAt: confirmedAt })).toBe(true);
  });

  it('prüft die Form, die gerade gilt', () => {
    // Der Link bleibt beim Wechsel zum Formular gespeichert, zählt dann aber nicht.
    expect(isImprintComplete({ imprintMode: 'form', imprint: null, imprintUrl: 'https://anna.example/impressum', imprintConfirmedAt: confirmedAt })).toBe(false);
    expect(isImprintComplete({ imprintMode: 'link', imprint, imprintUrl: null, imprintConfirmedAt: confirmedAt })).toBe(false);
    expect(isImprintComplete({ imprintMode: 'link', imprint: null, imprintUrl: 'https://anna.example/impressum', imprintConfirmedAt: confirmedAt })).toBe(true);
  });

  // Gespeicherte Angaben werden bei jeder Prüfung neu gegen das Schema gehalten – ein später
  // verschärftes Schema soll alte, nicht mehr gültige Angaben nicht durchwinken.
  it('prüft gespeicherte Angaben erneut gegen das Schema', () => {
    expect(isImprintComplete({ imprintMode: 'form', imprint: { ...imprint, phone: '' }, imprintUrl: null, imprintConfirmedAt: confirmedAt })).toBe(false);
  });
});
