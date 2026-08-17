/**
 * Übersetzt better-auth-Fehler in deutsche Anzeigetexte.
 *
 * better-auth antwortet auf Englisch, die Oberfläche ist deutsch – dieselbe Trennung, die
 * CLAUDE.md für die eigene API vorschreibt. Ausgewertet wird der `code`, nicht die `message`:
 * die Codes sind Teil der API-Zusage, die Meldungstexte nicht. Login und Registrierung haben
 * das vorher über Substring-Treffer auf der Meldung gelöst und dabei unterschiedlich
 * abgebildet; mit den Codes ist es eine Entscheidung an einer Stelle.
 *
 * Der Fallback bleibt pro Aufrufstelle wählbar: "Anmeldung fehlgeschlagen" und
 * "Registrierung fehlgeschlagen" sagen dem Coach mehr als ein allgemeines "Fehler".
 */
const MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD:      'E-Mail oder Passwort ist falsch.',
  INVALID_PASSWORD:               'Das eingegebene Passwort ist falsch.',
  EMAIL_NOT_VERIFIED:             'Bitte bestätige zuerst deine E-Mail-Adresse.',
  USER_ALREADY_EXISTS:            'Diese E-Mail-Adresse ist bereits registriert.',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'Diese E-Mail-Adresse ist bereits registriert.',
  PASSWORD_TOO_SHORT:             'Das Passwort ist zu kurz – mindestens 8 Zeichen.',
  PASSWORD_TOO_LONG:              'Das Passwort ist zu lang.',
  INVALID_TOKEN:                  'Dieser Link ist ungültig oder abgelaufen. Fordere einen neuen an.',
  // Tritt auf, wenn zum Konto kein Passwort-Login gehört – bei HxRoom heute nicht möglich,
  // aber better-auth kann den Code für die Passwortprüfung zurückgeben.
  CREDENTIAL_ACCOUNT_NOT_FOUND:   'Für dieses Konto ist keine Passwort-Anmeldung eingerichtet.',
  SESSION_EXPIRED:                'Deine Sitzung ist abgelaufen. Bitte melde dich neu an.',
  FAILED_TO_UPDATE_USER:          'Die Änderung konnte nicht gespeichert werden.',
}

interface AuthErrorLike {
  code?: string
  message?: string
}

export function mapAuthError(error: AuthErrorLike | null | undefined, fallback: string): string {
  if (!error) return fallback
  if (error.code && MESSAGES[error.code]) return MESSAGES[error.code]!

  // "Email is the same" hat keinen eigenen Code, ist beim Adresswechsel aber der
  // naheliegendste Fehlgriff und verdient einen brauchbaren Hinweis.
  if (error.message?.toLowerCase().includes('email is the same')) {
    return 'Das ist bereits deine aktuelle E-Mail-Adresse.'
  }

  return fallback
}
