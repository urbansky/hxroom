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

// Eine Sitzung zählt als gehalten, wenn sie bestätigt (oder abgeschlossen) ist. Abgesagte
// und nie bestätigte Termine haben nicht stattgefunden und würden jede Kennzahl
// verfälschen – in der Klientenliste des Coachs (ClientsService) genauso wie in der
// Coach-Liste des Betreibers (AdminCoachesService). Deshalb hier einmal definiert: liefen
// die beiden Listen auseinander, wäre nicht mehr klar, welche Zahl stimmt.
//
// Als reines Array statt als Drizzle-Bedingung, damit diese Datei frei von ORM-Importen
// bleibt; die Aufrufer bauen ihr `inArray` selbst.
export const HELD_SESSION_STATUSES = ['confirmed', 'completed'] as const;
