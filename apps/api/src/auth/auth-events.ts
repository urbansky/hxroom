/**
 * Welche Vorgänge von better-auth ins Log gehören (technisches-konzept.md §17, „Logging der
 * API“). better-auth läuft an Nest vorbei; der `hooks.after` in auth.module.ts reicht jeden
 * Aufruf hierher, und was hier eine Zeile ergibt, wird geloggt.
 *
 * Nur IDs und Fehlercodes. Die E-Mail-Adresse aus dem Formular bleibt draußen, auch bei
 * fehlgeschlagener Anmeldung – sie wäre dort oft genug eine vertippte fremde Adresse.
 */

export interface AuthHookInput {
  path: string;
  /** `ctx.context.returned`: die Antwort des Endpunkts oder sein APIError. */
  returned: unknown;
  /** Benutzer der Session, mit der der Aufruf kam (bei Admin-Endpunkten der Betreiber). */
  sessionUserId?: string | null;
  /** Bei einer übernommenen Session: der Betreiber dahinter. */
  impersonatedBy?: string | null;
  /** Benutzer der Session, die der Aufruf neu angelegt hat (Anmeldung). */
  newSessionUserId?: string | null;
  body?: unknown;
}

export interface AuthLogEntry {
  level: 'log' | 'warn';
  message: string;
  fields: Record<string, string>;
}

// Betreiber-Aktionen auf einen Coach, alle mit `userId` im Body.
const OPERATOR_ACTIONS = new Set([
  'ban-user',
  'unban-user',
  'set-role',
  'set-user-password',
  'update-user',
  'remove-user',
  'revoke-user-session',
  'revoke-user-sessions',
]);

// Für Vorgänge ohne eigenen Fall: Meldung bei Erfolg und bei Misserfolg, mehr nicht.
const SIMPLE: Record<string, [ok: string, failed: string]> = {
  '/sign-out': ['Sign-out', 'Sign-out failed'],
  '/request-password-reset': ['Password reset requested', 'Password reset request failed'],
  '/reset-password': ['Password reset completed', 'Password reset failed'],
  '/verify-email': ['Email verified', 'Email verification failed'],
  '/change-password': ['Password changed', 'Password change failed'],
  '/change-email': ['Email change requested', 'Email change request failed'],
};

export function describeAuthEvent(input: AuthHookInput): AuthLogEntry | null {
  const failure = failureCode(input.returned);
  const ok = failure === null;
  const fail = (message: string, fields: Record<string, unknown> = {}): AuthLogEntry =>
    entry('warn', message, { ...fields, code: failure });

  switch (input.path) {
    case '/sign-in/email':
      return ok
        ? entry('log', 'Sign-in', { userId: input.newSessionUserId ?? returnedUserId(input.returned) })
        : fail('Sign-in failed');
    case '/sign-up/email':
      return ok
        ? entry('log', 'Sign-up', { userId: returnedUserId(input.returned) })
        : fail('Sign-up rejected');
    case '/admin/impersonate-user':
      return ok
        ? entry('log', 'Impersonation started', { operatorId: input.sessionUserId, targetUserId: bodyUserId(input.body) })
        : fail('Impersonation failed', { targetUserId: bodyUserId(input.body) });
    case '/admin/stop-impersonating':
      return ok
        ? entry('log', 'Impersonation stopped', {
          operatorId: input.impersonatedBy ?? returnedUserId(input.returned),
          targetUserId: input.sessionUserId,
        })
        : null;
    case '/admin/create-user':
      return ok
        ? entry('log', 'Operator created user', { operatorId: input.sessionUserId, targetUserId: returnedUserId(input.returned) })
        : fail('Operator action failed', { action: 'create-user' });
  }

  const adminAction = input.path.startsWith('/admin/') ? input.path.slice('/admin/'.length) : null;
  if (adminAction && OPERATOR_ACTIONS.has(adminAction)) {
    const fields = { action: adminAction, operatorId: input.sessionUserId, targetUserId: bodyUserId(input.body) };
    if (!ok) return fail('Operator action failed', fields);
    const role = adminAction === 'set-role' ? bodyString(input.body, 'role') : undefined;
    return entry('log', 'Operator action', { ...fields, role });
  }

  const simple = SIMPLE[input.path];
  if (simple) {
    const fields = { userId: input.newSessionUserId ?? input.sessionUserId };
    return ok ? entry('log', simple[0], fields) : fail(simple[1], fields);
  }
  return null;
}

function entry(level: AuthLogEntry['level'], message: string, fields: Record<string, unknown>): AuthLogEntry {
  const clean: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === 'string' && value) clean[key] = value;
  }
  return { level, message, fields: clean };
}

/**
 * Null bei Erfolg, sonst der Fehlercode von better-auth (`INVALID_EMAIL_OR_PASSWORD` …) oder
 * der HTTP-Status. Bewusst über die Form statt `instanceof APIError`: Die Funktion bleibt so
 * ohne better-auth testbar.
 */
function failureCode(returned: unknown): string | null {
  if (!returned || typeof returned !== 'object') return null;
  const { statusCode, status, body } = returned as { statusCode?: unknown; status?: unknown; body?: { code?: unknown } };
  if (typeof statusCode !== 'number' || statusCode < 400) return null;
  if (typeof body?.code === 'string') return body.code;
  return typeof status === 'string' ? status : String(statusCode);
}

function returnedUserId(returned: unknown): string | undefined {
  const user = (returned as { user?: { id?: unknown } } | null | undefined)?.user;
  return typeof user?.id === 'string' ? user.id : undefined;
}

function bodyUserId(body: unknown): string | undefined {
  return bodyString(body, 'userId');
}

function bodyString(body: unknown, key: string): string | undefined {
  const value = (body as Record<string, unknown> | null | undefined)?.[key];
  return typeof value === 'string' ? value : undefined;
}
