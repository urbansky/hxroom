import { z } from 'zod';

// Passwortrichtlinie für Konten (doc/technik/technisches-konzept.md §7, „Passwortrichtlinie“).
// Geteilt zwischen API (hooks.before in auth.module.ts) und Coach-App (Registrierung,
// Passwort ändern, Passwort zurücksetzen). Die Sperrliste verbreiteter Passwörter prüft nur
// die API – sie gehört nicht ins Browser-Bundle.

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;
/** Fängt Muster wie `aaaaaaaaaa` oder `1212121212` ab, die auf keiner Liste stehen. */
export const PASSWORD_MIN_DISTINCT_CHARS = 4;

/** Anzahl verschiedener Zeichen, ohne Unterschied zwischen Groß- und Kleinschreibung. */
export function countDistinctChars(password: string): number {
  return new Set(Array.from(password.toLowerCase())).size;
}

/**
 * Ein neues Passwort, wie es die drei Formulare abfragen. Zeichenklassen werden bewusst
 * nicht verlangt: Länge schützt besser, und Pflicht-Sonderzeichen führen zu `Passwort1!`.
 */
export const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Passwort muss mindestens ${PASSWORD_MIN_LENGTH} Zeichen haben`)
  .max(PASSWORD_MAX_LENGTH, `Passwort darf höchstens ${PASSWORD_MAX_LENGTH} Zeichen haben`)
  .refine(
    password => countDistinctChars(password) >= PASSWORD_MIN_DISTINCT_CHARS,
    `Passwort braucht mindestens ${PASSWORD_MIN_DISTINCT_CHARS} verschiedene Zeichen`,
  );

/**
 * Ob das Passwort nur aus der E-Mail-Adresse oder deren Teil vor dem @ besteht, höchstens
 * ergänzt um Ziffern und Sonderzeichen (`anna.berg2026`). Ein Satz, in dem der Name
 * vorkommt, bleibt erlaubt.
 */
export function passwordResemblesEmail(password: string, email: string): boolean {
  const pw = password.toLowerCase();
  const address = email.trim().toLowerCase();
  const localPart = address.split('@')[0] ?? '';
  return [address, localPart].some((part) => {
    if (part.length < 3 || !pw.includes(part)) return false;
    const rest = pw.split(part).join('');
    return !/\p{L}/u.test(rest);
  });
}
