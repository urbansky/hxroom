/**
 * Gibt die Bestätigungsmail eines Vorführ-Termins als HTML auf stdout aus – für den
 * Screenshot auf der Landingpage (apps/landing/scripts/screenshots.mjs).
 *
 * Dieselbe Vorlage und dieselbe Formatierung wie BookingsService, nur mit festen
 * Demo-Daten: Termin in drei Tagen um 10:00, Coach Stefan Urbansky, Klientin aus den
 * fiktiven Seed-Daten.
 */
import { renderBookingConfirmedEmail } from '../mail/templates/client/booking-confirmed';
import { toAppointmentInfo } from '../bookings/booking-formatting';

const origin = 'https://demo.hxroom.de';

function threeDaysAtTen(now: Date): Date {
  const day = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  // 10:00 in Berlin, unabhängig von der Zeitzone des Rechners
  const berlin = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(day);
  const probe = new Date(`${berlin}T10:00:00Z`);
  const offsetHours = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Berlin', hour: 'numeric', hourCycle: 'h23' }).format(probe)) - 10;
  return new Date(probe.getTime() - offsetHours * 60 * 60 * 1000);
}

async function main(): Promise<void> {
  const start = threeDaysAtTen(new Date());
  const end = new Date(start.getTime() + 20 * 60 * 1000);
  const html = await renderBookingConfirmedEmail({
    clientName: 'Miriam Kastner',
    coachName: 'Stefan Urbansky',
    appointment: toAppointmentInfo({
      startTime: start,
      endTime: end,
      offerId: 'demo-offer',
      offerName: 'Produktvorführung',
      durationMinutes: 20,
    }),
    cancelUrl: `${origin}/cancel/demo?token=demo`,
    callUrl: `${origin}/call/demo?token=demo`,
    callOpensMinutesBefore: 60,
    legalLinks: { imprintUrl: `${origin}/impressum`, privacyUrl: `${origin}/datenschutz` },
  });
  process.stdout.write(html);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
