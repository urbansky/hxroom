import { describe, expect, it } from 'vitest';
import { CONFIRMATION_TTL_MINUTES, canClientCancel, canMarkNoShow, isExpiredPending } from './booking.constants';

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

// Diese Funktion entscheidet, ob der Absage-Link aus der Bestätigungsmail noch greift.
// Sagt sie fälschlich ja, storniert ein Klient einen Termin, der gerade läuft oder schon
// gelaufen ist; sagt sie fälschlich nein, landet die Absage doch wieder beim Coach.
describe('canClientCancel', () => {
  const now = new Date('2026-08-18T12:00:00.000Z');
  const future = new Date('2026-08-19T09:00:00.000Z');
  const past = new Date('2026-08-17T09:00:00.000Z');

  it('erlaubt die Absage eines bestätigten Termins in der Zukunft', () => {
    expect(canClientCancel({ status: 'confirmed', startTime: future }, now)).toBe(true);
  });

  it('erlaubt die Absage eines noch unbestätigten Termins', () => {
    expect(canClientCancel({ status: 'pending', startTime: future }, now)).toBe(true);
  });

  it('lehnt einen Termin in der Vergangenheit ab', () => {
    expect(canClientCancel({ status: 'confirmed', startTime: past }, now)).toBe(false);
  });

  it('lehnt exakt zum Terminbeginn ab – dann läuft die Sitzung', () => {
    expect(canClientCancel({ status: 'confirmed', startTime: now }, now)).toBe(false);
  });

  it('lehnt eine bereits abgesagte Buchung ab', () => {
    expect(canClientCancel({ status: 'cancelled', startTime: future }, now)).toBe(false);
  });

  it('lehnt eine abgeschlossene Sitzung ab', () => {
    expect(canClientCancel({ status: 'completed', startTime: past }, now)).toBe(false);
  });
});

describe('canMarkNoShow – wann der Coach „nicht erschienen" vermerken darf', () => {
  const now = new Date('2026-09-25T10:10:00.000Z');
  const started = new Date('2026-09-25T10:00:00.000Z');
  const later = new Date('2026-09-25T11:00:00.000Z');

  it('erlaubt es für einen bestätigten, begonnenen Termin ohne Einlass', () => {
    expect(canMarkNoShow({ status: 'confirmed', startTime: started, admittedAt: null }, now)).toBe(true);
  });

  it('erlaubt es genau zum Beginn', () => {
    expect(canMarkNoShow({ status: 'confirmed', startTime: now, admittedAt: null }, now)).toBe(true);
  });

  // Vor dem Beginn kann niemand zu spät sein.
  it('lehnt einen Termin ab, der noch nicht begonnen hat', () => {
    expect(canMarkNoShow({ status: 'confirmed', startTime: later, admittedAt: null }, now)).toBe(false);
  });

  // Wer eingelassen wurde, war da – auch wenn das Gespräch kurz war.
  it('lehnt einen Termin mit Einlass ab', () => {
    expect(canMarkNoShow({ status: 'confirmed', startTime: started, admittedAt: started }, now)).toBe(false);
  });

  it('lehnt abgesagte, abgeschlossene, unbestätigte und schon vermerkte Termine ab', () => {
    for (const status of ['cancelled', 'completed', 'pending', 'no_show'] as const) {
      expect(canMarkNoShow({ status, startTime: started, admittedAt: null }, now)).toBe(false);
    }
  });
});
