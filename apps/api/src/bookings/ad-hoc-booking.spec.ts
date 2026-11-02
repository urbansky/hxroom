import { describe, expect, it } from 'vitest';
// Das Schema liegt in @hxroom/shared (das Paket hat keine eigenen Tests), prüft aber den
// Body von POST /bookings/ad-hoc – deshalb steht der Test hier.
import { createAdHocBookingSchema } from '@hxroom/shared';
import { greetingName } from './booking-formatting';

describe('createAdHocBookingSchema', () => {
  it('nimmt einen bestehenden Klienten, mit und ohne Angebot', () => {
    expect(createAdHocBookingSchema.safeParse({ clientId: 'c-1' }).success).toBe(true);
    expect(createAdHocBookingSchema.safeParse({ clientId: 'c-1', offerId: 'o-1' }).success).toBe(true);
  });

  it('nimmt eine E-Mail-Adresse ohne Namen, solange kein Klient entstehen soll', () => {
    const r = createAdHocBookingSchema.safeParse({ email: ' anna@example.com ', createClient: false });
    expect(r.success).toBe(true);
    expect(r.data).toEqual({ email: 'anna@example.com', createClient: false });
  });

  it('verlangt den Namen, wenn ein Klient entstehen soll', () => {
    const ohne = createAdHocBookingSchema.safeParse({ email: 'anna@example.com', createClient: true });
    expect(ohne.success).toBe(false);

    const leer = createAdHocBookingSchema.safeParse({ email: 'anna@example.com', name: '  ', createClient: true });
    expect(leer.success).toBe(false);

    const mit = createAdHocBookingSchema.safeParse({ email: 'anna@example.com', name: 'Anna', createClient: true });
    expect(mit.success).toBe(true);
  });

  it('weist ungültige Adressen und gemischte Formen ab', () => {
    expect(createAdHocBookingSchema.safeParse({ email: 'anna', createClient: false }).success).toBe(false);
    expect(createAdHocBookingSchema.safeParse({ clientId: 'c-1', email: 'anna@example.com', createClient: false }).success).toBe(false);
    expect(createAdHocBookingSchema.safeParse({}).success).toBe(false);
  });
});

describe('greetingName', () => {
  it('liefert den Namen am Termin', () => {
    expect(greetingName({ clientName: 'Anna Müller', clientEmail: 'anna@example.com' })).toBe('Anna Müller');
  });

  // Ohne Namen steht die Adresse als client_name am Termin – sie taugt nicht zur Anrede.
  it('liefert null, wenn statt des Namens die Adresse am Termin steht', () => {
    expect(greetingName({ clientName: 'anna@example.com', clientEmail: 'anna@example.com' })).toBeNull();
  });
});
