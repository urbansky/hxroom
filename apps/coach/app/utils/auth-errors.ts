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
import { PASSWORD_MIN_DISTINCT_CHARS, PASSWORD_MIN_LENGTH } from '@hxroom/shared'

const MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD:      'E-Mail oder Passwort ist falsch.',
  INVALID_PASSWORD:               'Das eingegebene Passwort ist falsch.',
  EMAIL_NOT_VERIFIED:             'Bitte bestätige zuerst deine E-Mail-Adresse.',
  USER_ALREADY_EXISTS:            'Diese E-Mail-Adresse ist bereits registriert.',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'Diese E-Mail-Adresse ist bereits registriert.',
  PASSWORD_TOO_SHORT:             `Das Passwort ist zu kurz – mindestens ${PASSWORD_MIN_LENGTH} Zeichen.`,
  PASSWORD_TOO_LONG:              'Das Passwort ist zu lang.',
  INVALID_TOKEN:                  'Dieser Link ist ungültig oder abgelaufen. Fordere einen neuen an.',
  // Tritt auf, wenn zum Konto kein Passwort-Login gehört – bei HxRoom heute nicht möglich,
  // aber better-auth kann den Code für die Passwortprüfung zurückgeben.
  CREDENTIAL_ACCOUNT_NOT_FOUND:   'Für dieses Konto ist keine Passwort-Anmeldung eingerichtet.',
  SESSION_EXPIRED:                'Deine Sitzung ist abgelaufen. Bitte melde dich neu an.',
  FAILED_TO_UPDATE_USER:          'Die Änderung konnte nicht gespeichert werden.',
  // Eigener Code aus hooks.before in apps/api/src/auth/auth.module.ts
  TERMS_NOT_ACCEPTED:             'Bitte stimme den AGB und dem Auftragsverarbeitungsvertrag zu.',
  // Passwortrichtlinie, ebenfalls aus hooks.before (apps/api/src/auth/password-policy.ts)
  PASSWORD_TOO_SIMPLE:            `Das Passwort braucht mindestens ${PASSWORD_MIN_DISTINCT_CHARS} verschiedene Zeichen.`,
  PASSWORD_TOO_COMMON:            'Dieses Passwort ist zu verbreitet. Bitte wähle ein anderes.',
  PASSWORD_RESEMBLES_EMAIL:       'Das Passwort darf nicht auf deiner E-Mail-Adresse beruhen.',
}

/**
 * Antwort des Rate-Limiters von better-auth (Grenzen in apps/api/src/auth/rate-limit.ts).
 * Sie trägt keinen `code`, nur Status 429 – ohne eigene Meldung landete sie bei der
 * Ersatzmeldung, und „Anmeldung fehlgeschlagen“ verschweigt, dass Warten genügt.
 */
const TOO_MANY_REQUESTS_MESSAGE = 'Zu viele Versuche. Bitte warte einen Moment und versuche es dann erneut.'

interface AuthErrorLike {
  code?: string
  message?: string
  status?: number
}

export function mapAuthError(error: AuthErrorLike | null | undefined, fallback: string): string {
  if (!error) return fallback
  if (error.status === 429) return TOO_MANY_REQUESTS_MESSAGE
  if (error.code && MESSAGES[error.code]) return MESSAGES[error.code]!

  // "Email is the same" hat keinen eigenen Code, ist beim Adresswechsel aber der
  // naheliegendste Fehlgriff und verdient einen brauchbaren Hinweis.
  if (error.message?.toLowerCase().includes('email is the same')) {
    return 'Das ist bereits deine aktuelle E-Mail-Adresse.'
  }

  return fallback
}
