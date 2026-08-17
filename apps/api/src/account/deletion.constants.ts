// Fristen der Kontolöschung. Die 30 Tage stammen aus doc/legal.md ("30 Tage Aufbewahrung
// nach Kündigung dann Löschung") – der Coach behält damit ein Zeitfenster, in dem er die
// Löschung zurücknehmen und seine Daten noch sichern kann.
export const DELETION_GRACE_DAYS = 30;

// Vorlauf der Erinnerungsmail. Ohne sie wäre die Frist eine Falle: wer den Antrag stellt und
// ihn vergisst, hätte keinen Anlass mehr, sich vor dem Datenverlust neu zu entscheiden.
export const DELETION_REMINDER_DAYS_BEFORE = 7;

/**
 * Zeitpunkt der endgültigen Löschung für einen Antrag von `requestedAt`.
 *
 * Wird genau einmal berechnet und dann in `organization.deletionScheduledFor` gespeichert;
 * Cron, Mailtext und Banner lesen ab dann denselben Wert. Bewusst als reine Funktion, damit
 * die Grenzfälle ohne Datenbank testbar sind.
 */
export function deletionDueAt(requestedAt: Date, graceDays = DELETION_GRACE_DAYS): Date {
  return new Date(requestedAt.getTime() + graceDays * 24 * 60 * 60 * 1000);
}

/** Ist eine für `scheduledFor` vorgemerkte Löschung jetzt fällig? */
export function isDeletionDue(scheduledFor: Date, now: Date): boolean {
  return now.getTime() >= scheduledFor.getTime();
}

/**
 * Ist die Erinnerung fällig, also der Löschzeitpunkt näher als der Vorlauf?
 *
 * Bereits fällige Löschungen ergeben hier `true`, das ist gewollt: sollte der Ausführungslauf
 * einmal ausfallen, ist eine späte Erinnerung besser als keine. Ein zweites Mal geht sie
 * trotzdem nicht raus, dafür sorgt `coach_deletions.reminderSentAt`.
 */
export function isReminderDue(
  scheduledFor: Date,
  now: Date,
  daysBefore = DELETION_REMINDER_DAYS_BEFORE,
): boolean {
  return scheduledFor.getTime() - now.getTime() <= daysBefore * 24 * 60 * 60 * 1000;
}

/** Ganze Tage bis zur Löschung, aufgerundet – für den Text der Erinnerungsmail. */
export function daysUntilDeletion(scheduledFor: Date, now: Date): number {
  const remaining = scheduledFor.getTime() - now.getTime();
  return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
}

// Feste Zeitzone Europe/Berlin, gleiche Begründung wie in bookings/booking-formatting.ts:
// der Timestamp ist ein absoluter Zeitpunkt, der Coach erwartet aber sein Datum.
const deletionDateFormatter = new Intl.DateTimeFormat('de-DE', {
  timeZone: 'Europe/Berlin',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** "16. September 2026" – für Mailtexte und Betreffzeilen. */
export function formatDeletionDate(scheduledFor: Date): string {
  return deletionDateFormatter.format(scheduledFor);
}
