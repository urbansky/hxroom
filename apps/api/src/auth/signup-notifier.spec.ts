import { describe, expect, it, vi } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import { SignupNotifier, type RegisteredCoach } from './signup-notifier';
import type { DrizzleDb } from '../db/db.module';
import type { MailService, SendMailOptions } from '../mail/mail.service';

function fakeDb(rows: unknown) {
  const where = vi.fn(() => (rows instanceof Error ? Promise.reject(rows) : Promise.resolve(rows)));
  const from = vi.fn(() => ({ where }));
  const select = vi.fn(() => ({ from }));
  return { select } as unknown as DrizzleDb;
}

function fakeConfig(): ConfigService {
  const values: Record<string, string> = { ROOT_DOMAIN: 'hxroom.de', ROOT_DOMAIN_HTTPS: 'true' };
  return {
    get: (key: string) => values[key],
    getOrThrow: (key: string) => values[key],
  } as unknown as ConfigService;
}

function fakeMail(send = vi.fn((_opts: SendMailOptions) => Promise.resolve())) {
  return { mail: { send } as unknown as MailService, send };
}

const coach: RegisteredCoach = {
  id: 'u-coach',
  name: 'Anna Bergmann',
  email: 'anna@example.com',
  slug: 'anna-bergmann',
  createdAt: new Date(Date.UTC(2026, 10, 25, 9, 14)),
};

describe('SignupNotifier', () => {
  it('schreibt jedem Betreiber eine eigene Mail', async () => {
    const { mail, send } = fakeMail();
    const db = fakeDb([
      { email: 'stefan@hxroom.de', name: 'Stefan', role: 'admin' },
      { email: 'support@hxroom.de', name: 'Support', role: 'user,admin' },
    ]);

    await new SignupNotifier(db, fakeConfig(), mail).notify(coach);

    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls.map(([opts]) => opts.to)).toEqual([
      { email: 'stefan@hxroom.de', name: 'Stefan' },
      { email: 'support@hxroom.de', name: 'Support' },
    ]);
    const [opts] = send.mock.calls[0];
    expect(opts.kind).toBe('coach-registered');
    expect(opts.subject).toBe('Neuer Coach: Anna Bergmann');
    expect(opts.replyTo).toEqual({ email: 'anna@example.com', name: 'Anna Bergmann' });
    expect(opts.htmlContent).toContain('https://admin.hxroom.de/coaches');
  });

  // Das LIKE der Abfrage trifft auch Rollen wie 'superadmin'; maßgeblich ist isAdminRole.
  it('übergeht Rollen, die nur „admin“ enthalten', async () => {
    const { mail, send } = fakeMail();
    const db = fakeDb([{ email: 'x@example.com', name: 'X', role: 'superadmin' }]);

    await new SignupNotifier(db, fakeConfig(), mail).notify(coach);

    expect(send).not.toHaveBeenCalled();
  });

  it('versucht alle Betreiber, auch wenn eine Mail scheitert', async () => {
    const send = vi.fn((_opts: SendMailOptions) => Promise.resolve())
      .mockRejectedValueOnce(new Error('brevo down'))
      .mockResolvedValueOnce(undefined);
    const { mail } = fakeMail(send);
    const db = fakeDb([
      { email: 'a@hxroom.de', name: 'A', role: 'admin' },
      { email: 'b@hxroom.de', name: 'B', role: 'admin' },
    ]);

    await expect(new SignupNotifier(db, fakeConfig(), mail).notify(coach)).resolves.toBeUndefined();
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('wirft nicht, wenn die Datenbank ausfällt', async () => {
    const { mail, send } = fakeMail();

    await expect(
      new SignupNotifier(fakeDb(new Error('db down')), fakeConfig(), mail).notify(coach),
    ).resolves.toBeUndefined();
    expect(send).not.toHaveBeenCalled();
  });
});
