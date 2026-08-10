// Zeitfenster, in dem eine 'pending'-Buchung bestätigt werden muss, bevor sie verfällt
// (siehe doc/idee-klienten-matching.md). Wird an drei Stellen gebraucht und muss dort
// zwingend derselbe Wert sein: beim Lazy-Check in BookingsService.confirm, im
// Verfall-Cron (BookingExpiryService) und im Hinweistext der Bestätigungsmail.
//
// Offene Frage in der Doku (TTL bei sehr kurzfristigen Buchungen kappen) ist noch nicht
// umgesetzt – aktuell gilt der Wert unabhängig vom Terminzeitpunkt.
export const CONFIRMATION_TTL_MINUTES = 30;

// Ist eine Buchung mit diesem Erstellungszeitpunkt abgelaufen? Bewusst als reine
// Funktion, damit die Grenzfälle ohne Datenbank testbar sind.
export function isExpiredPending(createdAt: Date, now: Date, ttlMinutes = CONFIRMATION_TTL_MINUTES): boolean {
  return now.getTime() - createdAt.getTime() > ttlMinutes * 60_000;
}
