import { describe, expect, it } from 'vitest';
import { CONFIRMATION_TTL_MINUTES, isExpiredPending } from './booking.constants';

// Die Grenzentscheidung wird an zwei Stellen getroffen (Lazy-Check in confirm() und
// Verfall-Cron) und entscheidet darüber, ob ein Slot wieder frei wird – deshalb hier
// als reine Funktion isoliert testbar.
describe('isExpiredPending', () => {
  const created = new Date('2026-08-10T10:00:00.000Z');

  it('ist innerhalb der TTL nicht abgelaufen', () => {
    expect(isExpiredPending(created, new Date('2026-08-10T10:29:59.000Z'))).toBe(false);
  });

  it('ist exakt auf der Grenze noch nicht abgelaufen', () => {
    expect(isExpiredPending(created, new Date('2026-08-10T10:30:00.000Z'))).toBe(false);
  });

  it('ist eine Sekunde nach der Grenze abgelaufen', () => {
    expect(isExpiredPending(created, new Date('2026-08-10T10:30:01.000Z'))).toBe(true);
  });

  it('ist direkt nach dem Anlegen nicht abgelaufen', () => {
    expect(isExpiredPending(created, created)).toBe(false);
  });

  it('respektiert eine abweichende TTL', () => {
    expect(isExpiredPending(created, new Date('2026-08-10T10:06:00.000Z'), 5)).toBe(true);
    expect(isExpiredPending(created, new Date('2026-08-10T10:06:00.000Z'), 10)).toBe(false);
  });

  it('verwendet CONFIRMATION_TTL_MINUTES als Default', () => {
    const justBefore = new Date(created.getTime() + CONFIRMATION_TTL_MINUTES * 60_000);
    const justAfter = new Date(justBefore.getTime() + 1);

    expect(isExpiredPending(created, justBefore)).toBe(false);
    expect(isExpiredPending(created, justAfter)).toBe(true);
  });
});
