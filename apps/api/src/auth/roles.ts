/**
 * Plattformweite Rollen (better-auth admin-Plugin, Spalte `user.role`).
 *
 * Nicht zu verwechseln mit `member.role`: das ist die Rolle *innerhalb* einer
 * Organisation ('owner'), während es hier um die Rolle auf der Plattform geht.
 * Ein Betreiber trägt 'admin' und ist Mitglied keiner Organisation – siehe
 * doc/technisches-konzept.md §7, Abschnitt „Betreiber-Zugang".
 */
export const DEFAULT_ROLE = 'user';

/** Rollen, die Zugang zum Betreiber-Backoffice haben. Später z.B. um 'support' erweiterbar. */
export const ADMIN_ROLES = ['admin'] as const;

/**
 * Das Plugin erlaubt mehrere Rollen pro User und legt sie dann kommasepariert in einem
 * einzigen Feld ab – deshalb wird hier gesplittet statt verglichen. NULL bedeutet
 * `DEFAULT_ROLE`: Accounts aus der Zeit vor dem Plugin haben kein gesetztes Feld.
 */
export function isAdminRole(role: string | null | undefined): boolean {
  if (!role) return false;
  return role
    .split(',')
    .map((r) => r.trim())
    .some((r) => (ADMIN_ROLES as readonly string[]).includes(r));
}
