import type { CoachStatus } from '@hxroom/shared';

/** Die Spalten, aus denen sich der Status ergibt – so, wie Drizzle sie aus `user` liefert. */
export interface CoachStatusSource {
  // Nullable, weil die Spalte als boolean('banned').default(false) ohne notNull definiert
  // ist: Accounts aus der Zeit vor dem admin-Plugin haben dort NULL stehen.
  banned: boolean | null;
  banExpires: Date | null;
  emailVerified: boolean;
}

/**
 * Kontostatus eines Coachs, abgeleitet aus den Spalten des better-auth admin-Plugins.
 *
 * Bewusst *nur* Kontostatus, nicht Plan-Status: doc/funktionen/backoffice-betreiber.md
 * listet unter Funktion 01 „Trial / aktiv / gesperrt" in einer Spalte und vermischt damit
 * zwei Achsen. 'trial' ist eine Plan-Aussage und aus dem aktuellen Schema nicht ableitbar –
 * es gibt weder Subscription-Tabelle noch Trial-Feld. Kommt das Billing-Modell dazu, wird
 * das eine zweite, eigene Achse und nicht ein weiterer Wert hier.
 *
 * Als reine Funktion statt als SQL-CASE, damit es genau eine Definition gibt: Der
 * Statusfilter des Endpunkts wendet sie auf das Ergebnis an, statt die Regel ein zweites
 * Mal in SQL zu formulieren.
 */
export function deriveCoachStatus(row: CoachStatusSource, now: Date = new Date()): CoachStatus {
  // Reihenfolge ist bedeutungstragend: Ein gesperrter Coach bleibt gesperrt, auch wenn er
  // seine E-Mail nie bestätigt hat – die Sperre ist die Aussage, die der Betreiber sucht.
  //
  // banExpires wird mitgeprüft, weil das admin-Plugin eine abgelaufene Sperre wieder
  // zulässt, ohne `banned` zurückzusetzen. Ohne die Prüfung stünde der Coach dauerhaft als
  // gesperrt in der Liste, obwohl er sich längst wieder einloggen kann.
  if (row.banned && (!row.banExpires || row.banExpires > now)) return 'suspended';

  // Registrierung angefangen, Bestätigungslink nie geklickt. Für den Betreiber relevant,
  // weil emailAndPassword.requireEmailVerification aktiv ist: Dieser Account kann sich
  // gar nicht anmelden und ist kein stiller, sondern ein blockierter Nutzer.
  if (!row.emailVerified) return 'pending';

  return 'active';
}
