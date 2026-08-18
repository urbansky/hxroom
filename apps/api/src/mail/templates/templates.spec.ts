import { describe, expect, it } from 'vitest';
import { renderBookingCancelledEmail } from './client/booking-cancelled';
import { renderBookingConfirmedEmail } from './client/booking-confirmed';
import { renderBookingNotificationEmail } from './coach/booking-notification';
import { renderBookingCancelledByClientEmail } from './coach/booking-cancelled-by-client';
import { renderEmailVerificationEmail } from './coach/email-verification';
import { renderEmailChangeApprovalEmail } from './coach/email-change-approval';
import { renderEmailChangeVerificationEmail } from './coach/email-change-verification';
import { renderPasswordResetEmail } from './coach/password-reset';
import { renderDeletionRequestedEmail } from './coach/deletion-requested';
import { renderDeletionReminderEmail } from './coach/deletion-reminder';
import { renderDeletionExecutedEmail } from './coach/deletion-executed';

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
      cancelUrl: 'https://anna.hxroom.de/cancel/b-123?token=abc',
    };

    it('rendert alle Termindaten', async () => {
      const html = await renderBookingConfirmedEmail(props);

      expect(html).toContain('Max Mustermann');
      expect(html).toContain('Anna Bergmann');
      expect(html).toContain('Coaching-Sitzung');
      expect(html).toContain('09:00');
      expect(html).toContain('60 Minuten');
    });

    // Diese Mail ist der einzige Ort, an dem der Klient den Absage-Link bekommt – fehlt
    // er, bleibt ihm nur die Antwortmail und der Coach muss die Absage von Hand nachziehen.
    it('enthält den Absage-Link', async () => {
      const html = await renderBookingConfirmedEmail(props);

      expect(html).toContain('https://anna.hxroom.de/cancel/b-123?token=abc');
      expect(html).toContain('Termin absagen');
    });

    it('fällt ohne Buchungsseite auf den Hinweis zur Antwortmail zurück', async () => {
      const html = await renderBookingConfirmedEmail({ ...props, cancelUrl: null });

      expect(html).not.toContain('/cancel/');
      expect(html).toContain('Antworte einfach auf diese E-Mail');
    });
  });

  describe('Klient: Absage', () => {
    const props = {
      clientName: 'Max Mustermann',
      coachName: 'Anna Bergmann',
      offerName: 'Coaching-Sitzung',
      dayTimeLabel: 'Montag, 3. August, 09:00–10:00 Uhr',
      cancelledBy: 'coach' as const,
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

    // Dieselbe Mail dient als Quittung auf die Selbstabsage. Stünde dort "musste leider
    // abgesagt werden", läse der Klient seine eigene Absage als Absage des Coachs.
    it('spricht bei der Selbstabsage von der eigenen Absage', async () => {
      const html = await renderBookingCancelledEmail({ ...props, cancelledBy: 'client', reason: 'Bin krank.' });

      expect(html).toContain('deine Absage ist eingegangen');
      expect(html).not.toContain('musste leider abgesagt werden');
      // Der Grund geht an den Coach, nicht zurück an den Klienten.
      expect(html).not.toContain('Bin krank.');
    });
  });

  describe('Coach: Absage durch den Klienten', () => {
    const props = {
      coachName: 'Anna Bergmann',
      clientName: 'Max Mustermann',
      clientEmail: 'max@example.com',
      offerName: 'Coaching-Sitzung',
      dayTimeLabel: 'Montag, 3. August, 09:00–10:00 Uhr',
      bookingsUrl: 'https://app.hxroom.de/bookings',
    };

    it('rendert Termin, Klient und Kalenderlink', async () => {
      const html = await renderBookingCancelledByClientEmail({ ...props, reason: 'Bin an dem Tag krank.' });

      expect(html).toContain('Max Mustermann');
      expect(html).toContain('Coaching-Sitzung');
      expect(html).toContain('Bin an dem Tag krank.');
      expect(html).toContain('mailto:max@example.com');
      expect(html).toContain('https://app.hxroom.de/bookings');
    });

    it('sagt ausdrücklich, wenn kein Grund angegeben wurde', async () => {
      const html = await renderBookingCancelledByClientEmail({ ...props, reason: null });

      expect(html).toContain('Einen Grund hat');
      expect(html).toContain('nicht angegeben.');
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

// Diese Mails sind der einzige Weg, auf dem ein Coach eine E-Mail-Änderung freigibt, sein
// Passwort zurücksetzt oder eine laufende Kontolöschung noch stoppt. Bleibt der Link im
// Markup aus, hat er keinen Ausweg mehr – deshalb wird hier jeweils genau darauf geprüft.
describe('Account-Mail-Templates', () => {
  describe('Registrierung: E-Mail-Verifizierung', () => {
    it('rendert Name und Bestätigungslink', async () => {
      const html = await renderEmailVerificationEmail({
        name: 'Anna Bergmann',
        verifyUrl: 'https://api.hxroom.de/api/auth/verify-email?token=abc',
      });

      expect(html).toContain('Anna Bergmann');
      expect(html).toContain('https://api.hxroom.de/api/auth/verify-email?token=abc');
    });
  });

  describe('Passwort zurücksetzen', () => {
    it('rendert den Reset-Link', async () => {
      const html = await renderPasswordResetEmail({
        name: 'Anna Bergmann',
        resetUrl: 'https://api.hxroom.de/api/auth/reset-password/tok123',
      });

      expect(html).toContain('Anna Bergmann');
      expect(html).toContain('https://api.hxroom.de/api/auth/reset-password/tok123');
    });
  });

  describe('E-Mail-Wechsel: Freigabe durch die alte Adresse', () => {
    it('nennt die neue Adresse und den Freigabelink', async () => {
      const html = await renderEmailChangeApprovalEmail({
        name: 'Anna Bergmann',
        newEmail: 'anna@neue-praxis.de',
        approveUrl: 'https://api.hxroom.de/api/auth/verify-email?token=approve',
      });

      expect(html).toContain('anna@neue-praxis.de');
      expect(html).toContain('https://api.hxroom.de/api/auth/verify-email?token=approve');
    });
  });

  describe('E-Mail-Wechsel: Bestätigung durch die neue Adresse', () => {
    it('rendert den Bestätigungslink und begrüßt nicht als Neukunde', async () => {
      const html = await renderEmailChangeVerificationEmail({
        name: 'Anna Bergmann',
        verifyUrl: 'https://api.hxroom.de/api/auth/verify-email?token=confirm',
      });

      expect(html).toContain('https://api.hxroom.de/api/auth/verify-email?token=confirm');
      // Die Unterscheidung zur Registrierungsmail ist der Sinn dieses Templates.
      expect(html).not.toContain('Willkommen');
    });
  });

  describe('Löschung beantragt', () => {
    it('nennt Löschdatum und Weg zum Widerruf', async () => {
      const html = await renderDeletionRequestedEmail({
        name: 'Anna Bergmann',
        deletionDateLabel: '16. September 2026',
        accountUrl: 'https://app.hxroom.de/settings/account',
      });

      expect(html).toContain('16. September 2026');
      expect(html).toContain('https://app.hxroom.de/settings/account');
      expect(html).toContain('zurücknehmen');
    });
  });

  describe('Löschung: Erinnerung', () => {
    it('nennt Restlaufzeit, Löschdatum und Widerrufslink', async () => {
      const html = await renderDeletionReminderEmail({
        name: 'Anna Bergmann',
        deletionDateLabel: '16. September 2026',
        daysLeft: 7,
        accountUrl: 'https://app.hxroom.de/settings/account',
      });

      expect(html).toContain('7 Tage');
      expect(html).toContain('16. September 2026');
      expect(html).toContain('https://app.hxroom.de/settings/account');
    });
  });

  describe('Löschung ausgeführt', () => {
    it('rendert die Anzahl der gelöschten Datensätze', async () => {
      const html = await renderDeletionExecutedEmail({
        name: 'Anna Bergmann',
        clientCount: 24,
        bookingCount: 118,
      });

      expect(html).toContain('24');
      expect(html).toContain('118');
    });
  });
});
