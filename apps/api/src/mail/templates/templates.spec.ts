import { describe, expect, it } from 'vitest';
import { renderBookingCancelledEmail } from './client/booking-cancelled';
import { renderBookingConfirmedEmail } from './client/booking-confirmed';
import { renderBookingNotificationEmail } from './coach/booking-notification';

// Der Mailversand in BookingsService läuft bewusst in try/catch – ein kaputtes Template
// würde dort still geschluckt und der Empfänger bekäme kommentarlos keine Mail.
// Diese Smoke-Tests stellen sicher, dass die Templates überhaupt rendern und die
// dynamischen Werte im HTML landen.
describe('Buchungs-Mail-Templates', () => {
  describe('Klient: Terminbestätigung', () => {
    const props = {
      clientName: 'Max Mustermann',
      coachName: 'Anna Bergmann',
      offerName: 'Coaching-Sitzung',
      dayTimeLabel: 'Montag, 3. August, 09:00–10:00 Uhr',
      durationMinutes: 60,
    };

    it('rendert alle Termindaten', async () => {
      const html = await renderBookingConfirmedEmail(props);

      expect(html).toContain('Max Mustermann');
      expect(html).toContain('Anna Bergmann');
      expect(html).toContain('Coaching-Sitzung');
      expect(html).toContain('09:00');
      expect(html).toContain('60 Minuten');
    });
  });

  describe('Klient: Absage', () => {
    const props = {
      clientName: 'Max Mustermann',
      coachName: 'Anna Bergmann',
      offerName: 'Coaching-Sitzung',
      dayTimeLabel: 'Montag, 3. August, 09:00–10:00 Uhr',
      bookingPageUrl: 'https://anna.hxroom.de',
    }

    it('rendert Termindaten und Link zur Buchungsseite', async () => {
      const html = await renderBookingCancelledEmail(props);

      expect(html).toContain('Max Mustermann');
      expect(html).toContain('Coaching-Sitzung');
      expect(html).toContain('https://anna.hxroom.de');
    });

    it('zeigt den Grund nur, wenn der Coach einen angegeben hat', async () => {
      const ohne = await renderBookingCancelledEmail({ ...props, reason: null });
      expect(ohne).not.toContain('Grund');

      const mit = await renderBookingCancelledEmail({ ...props, reason: 'Bin an dem Tag verhindert.' });
      expect(mit).toContain('Bin an dem Tag verhindert.');
    });
  });

  describe('Coach: Buchungsbenachrichtigung', () => {
    const props = {
      coachName: 'Anna Bergmann',
      clientName: 'Max Mustermann',
      clientEmail: 'max@example.com',
      offerName: 'Coaching-Sitzung',
      dayTimeLabel: 'Montag, 3. August, 09:00–10:00 Uhr',
      bookingsUrl: 'https://app.hxroom.de/bookings',
    };

    it('rendert Termin- und Klientendaten inkl. mailto-Link', async () => {
      const html = await renderBookingNotificationEmail(props);

      expect(html).toContain('Max Mustermann');
      expect(html).toContain('mailto:max@example.com');
      expect(html).toContain('https://app.hxroom.de/bookings');
    });

    it('zeigt Telefon und Notiz nur, wenn vorhanden', async () => {
      const ohne = await renderBookingNotificationEmail({ ...props, clientPhone: null, clientNote: null });
      expect(ohne).not.toContain('Telefon');
      expect(ohne).not.toContain('Nachricht');

      const mit = await renderBookingNotificationEmail({
        ...props,
        clientPhone: '+49 170 1234567',
        clientNote: 'Ich würde gern über meine neue Rolle sprechen.',
      });
      expect(mit).toContain('+49 170 1234567');
      expect(mit).toContain('neue Rolle');
    });
  });
});
