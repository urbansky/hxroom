import { describe, expect, it } from 'vitest';
import {
  DELETION_GRACE_DAYS,
  DELETION_REMINDER_DAYS_BEFORE,
  daysUntilDeletion,
  deletionDueAt,
  formatDeletionDate,
  isDeletionDue,
  isReminderDue,
} from './deletion.constants';

// Diese Rechnungen entscheiden, wann Klientendaten unwiederbringlich verschwinden. Der
// Ausführungslauf selbst braucht eine Datenbank und ist damit im aktuellen Test-Setup nicht
// abgedeckt – die Grenzentscheidungen sind hier bewusst als reine Funktionen isoliert.
describe('deletionDueAt', () => {
  const requested = new Date('2026-08-17T09:30:00.000Z');

  it('liegt 30 Tage nach dem Antrag', () => {
    expect(deletionDueAt(requested).toISOString()).toBe('2026-09-16T09:30:00.000Z');
  });

  it('verwendet DELETION_GRACE_DAYS als Default', () => {
    const eigene = deletionDueAt(requested, DELETION_GRACE_DAYS);
    expect(deletionDueAt(requested).getTime()).toBe(eigene.getTime());
  });

  it('respektiert eine abweichende Frist', () => {
    expect(deletionDueAt(requested, 1).toISOString()).toBe('2026-08-18T09:30:00.000Z');
  });
});

describe('isDeletionDue', () => {
  const scheduled = new Date('2026-09-16T09:30:00.000Z');

  it('ist einen Tag vorher nicht fällig', () => {
    expect(isDeletionDue(scheduled, new Date('2026-09-15T09:30:00.000Z'))).toBe(false);
  });

  it('ist eine Sekunde vorher nicht fällig', () => {
    expect(isDeletionDue(scheduled, new Date('2026-09-16T09:29:59.000Z'))).toBe(false);
  });

  it('ist exakt auf der Grenze fällig', () => {
    expect(isDeletionDue(scheduled, scheduled)).toBe(true);
  });

  it('bleibt danach fällig – ein ausgefallener Lauf holt es nach', () => {
    expect(isDeletionDue(scheduled, new Date('2026-10-01T00:00:00.000Z'))).toBe(true);
  });
});

describe('isReminderDue', () => {
  const scheduled = new Date('2026-09-16T09:30:00.000Z');

  it('ist 8 Tage vorher noch nicht fällig', () => {
    expect(isReminderDue(scheduled, new Date('2026-09-08T09:30:00.000Z'))).toBe(false);
  });

  it('ist exakt 7 Tage vorher fällig', () => {
    expect(isReminderDue(scheduled, new Date('2026-09-09T09:30:00.000Z'))).toBe(true);
  });

  it('ist auch nach dem Löschzeitpunkt fällig, damit ein ausgefallener Lauf nachzieht', () => {
    expect(isReminderDue(scheduled, new Date('2026-09-20T00:00:00.000Z'))).toBe(true);
  });

  it('respektiert einen abweichenden Vorlauf', () => {
    const zehnTageVorher = new Date('2026-09-06T09:30:00.000Z');
    expect(isReminderDue(scheduled, zehnTageVorher, DELETION_REMINDER_DAYS_BEFORE)).toBe(false);
    expect(isReminderDue(scheduled, zehnTageVorher, 14)).toBe(true);
  });
});

describe('daysUntilDeletion', () => {
  const scheduled = new Date('2026-09-16T09:30:00.000Z');

  it('rundet angebrochene Tage auf', () => {
    expect(daysUntilDeletion(scheduled, new Date('2026-09-09T09:30:00.000Z'))).toBe(7);
    expect(daysUntilDeletion(scheduled, new Date('2026-09-09T20:00:00.000Z'))).toBe(7);
  });

  it('gibt bei überschrittenem Zeitpunkt 0 zurück, nie einen negativen Wert', () => {
    expect(daysUntilDeletion(scheduled, new Date('2026-09-20T00:00:00.000Z'))).toBe(0);
  });
});

describe('formatDeletionDate', () => {
  it('formatiert deutsch mit Jahr', () => {
    expect(formatDeletionDate(new Date('2026-09-16T09:30:00.000Z'))).toBe('16. September 2026');
  });

  it('rechnet in Europe/Berlin, nicht in UTC', () => {
    // 22:30 UTC ist in Berlin bereits der Folgetag.
    expect(formatDeletionDate(new Date('2026-09-16T22:30:00.000Z'))).toBe('17. September 2026');
  });
});
