import { describe, expect, it } from 'vitest';
import { ForbiddenException, UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import type { Auth } from './auth.module';

/**
 * Der AdminGuard ist die einzige Autorisierungsgrenze des Betreiber-Backoffice – der Host
 * admin-api.hxroom.de ist ausdrücklich keine (siehe auth-hosts.ts). Mit der Coach-Liste
 * wird er erstmals scharf geschaltet, deshalb hier festgeschrieben.
 *
 * Ohne Datenbank testbar: better-auth wird auf die eine benutzte Methode reduziert.
 */
type Session = { user: { id: string; role?: string | null } } | null;

function guardFor(session: Session): AdminGuard {
  const auth = { api: { getSession: async () => session } } as unknown as Auth;
  return new AdminGuard(auth);
}

function contextWith(req: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

describe('AdminGuard', () => {
  it('weist Aufrufe ohne Session mit 401 ab', async () => {
    await expect(guardFor(null).canActivate(contextWith({ headers: {} })))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('weist einen angemeldeten Coach mit 403 ab', async () => {
    const guard = guardFor({ user: { id: 'u1', role: 'user' } });
    await expect(guard.canActivate(contextWith({ headers: {} })))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  // NULL bedeutet defaultRole ('user'), nicht "keine Einschränkung". Ein Bestandsaccount
  // aus der Zeit vor dem admin-Plugin darf nicht versehentlich ins Backoffice kommen.
  it('weist eine nicht gesetzte Rolle mit 403 ab', async () => {
    const guard = guardFor({ user: { id: 'u1', role: null } });
    await expect(guard.canActivate(contextWith({ headers: {} })))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lässt einen Betreiber durch', async () => {
    const req: Record<string, unknown> = { headers: {} };
    const guard = guardFor({ user: { id: 'admin1', role: 'admin' } });

    await expect(guard.canActivate(contextWith(req))).resolves.toBe(true);
    expect(req.session).toBeDefined();
  });

  // Die eigentliche Zusicherung gegenüber dem AuthGuard: Der Betreiber bekommt keinen
  // Organisationskontext untergeschoben. Sonst könnte ein Admin-Endpunkt versehentlich
  // wie ein Coach-Endpunkt arbeiten – die Mandantentrennung hinge dann an der Sorgfalt
  // des jeweiligen Controllers statt am Guard.
  it('setzt keinen Organisationskontext', async () => {
    const req: Record<string, unknown> = { headers: {} };
    const guard = guardFor({ user: { id: 'admin1', role: 'admin' } });

    await guard.canActivate(contextWith(req));
    expect(req.organization).toBeUndefined();
  });
});
