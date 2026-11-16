import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  PASSWORD_MIN_DISTINCT_CHARS,
  countDistinctChars,
  passwordResemblesEmail,
} from '@hxroom/shared';

// Serverseitiger Teil der Passwortrichtlinie (technisches-konzept.md §7). Länge prüft
// better-auth selbst (minPasswordLength/maxPasswordLength), hier kommen die übrigen Regeln dazu.

/**
 * Verbreitete Passwörter aus SecLists (xato-net-10-million-passwords-1000000.txt, MIT),
 * ergänzt um deutsche Klassiker. Enthalten sind nur Einträge, die Länge und
 * Zeichenvielfalt bestehen würden, in Kleinbuchstaben. Nest kopiert die Datei beim Build
 * nach dist/auth (nest-cli.json, assets).
 */
const BLOCKLIST_FILE = join(__dirname, 'password-blocklist.txt');

let blocklist: Set<string> | undefined;

function loadBlocklist(): Set<string> {
  blocklist ??= new Set(readFileSync(BLOCKLIST_FILE, 'utf8').split('\n').filter(Boolean));
  return blocklist;
}

export type PasswordViolation = {
  code: 'PASSWORD_TOO_SIMPLE' | 'PASSWORD_TOO_COMMON' | 'PASSWORD_RESEMBLES_EMAIL';
  message: string;
};

/** Erste verletzte Regel oder `null`. `email` fehlt, wenn sich das Konto nicht ermitteln ließ. */
export function checkPasswordPolicy(password: string, email?: string | null): PasswordViolation | null {
  if (countDistinctChars(password) < PASSWORD_MIN_DISTINCT_CHARS) {
    return {
      code: 'PASSWORD_TOO_SIMPLE',
      message: `Password must contain at least ${PASSWORD_MIN_DISTINCT_CHARS} different characters`,
    };
  }
  if (loadBlocklist().has(password.toLowerCase())) {
    return { code: 'PASSWORD_TOO_COMMON', message: 'Password is too common' };
  }
  if (email && passwordResemblesEmail(password, email)) {
    return { code: 'PASSWORD_RESEMBLES_EMAIL', message: 'Password must not be based on the email address' };
  }
  return null;
}
