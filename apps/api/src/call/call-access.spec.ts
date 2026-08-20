import { describe, expect, it } from 'vitest';
import type { BookingStatus } from '@hxroom/shared';
import {
  CALL_CLOSES_MINUTES_AFTER_END,
  CALL_OPENS_MINUTES_BEFORE_START,
  callWindowClosesAt,
  callWindowOpensAt,
  canAdmit,
  canEnd,
  resolveCallState,
  type CallBookingState,
} from './call-access';

// Sitzung von 10:00 bis 11:00; Fenster damit 09:00 bis 13:00.
const START = new Date('2026-08-20T10:00:00.000Z');
const END = new Date('2026-08-20T11:00:00.000Z');
const OPENS = new Date('2026-08-20T09:00:00.000Z');
const CLOSES = new Date('2026-08-20T13:00:00.000Z');

function booking(overrides: Partial<CallBookingState> = {}): CallBookingState {
  return {
    status: 'confirmed' as BookingStatus,
    startTime: START,
    endTime: END,
    clientTokenUsedAt: null,
    admittedAt: null,
    callEndedAt: null,
    ...overrides,
  };
}

describe('Zugangsfenster', () => {
  it('öffnet CALL_OPENS_MINUTES_BEFORE_START vor dem Beginn', () => {
    expect(callWindowOpensAt(START).toISOString()).toBe(OPENS.toISOString());
    expect(CALL_OPENS_MINUTES_BEFORE_START).toBe(60);
  });

  // Gemessen ab dem Ende, nicht ab dem Beginn: eine 90-Minuten-Sitzung soll nicht eine
  // halbe Stunde vor Schluss aus dem Fenster fallen.
  it('schließt CALL_CLOSES_MINUTES_AFTER_END nach dem Ende', () => {
    expect(callWindowClosesAt(END).toISOString()).toBe(CLOSES.toISOString());
    expect(CALL_CLOSES_MINUTES_AFTER_END).toBe(120);
  });

  it('richtet sich nach der tatsächlichen Dauer', () => {
    const longEnd = new Date('2026-08-20T11:30:00.000Z');
    expect(callWindowClosesAt(longEnd).toISOString()).toBe('2026-08-20T13:30:00.000Z');
  });
});

describe('resolveCallState – zeitliche Grenzen', () => {
  it('ist eine Sekunde vor dem Fenster zu früh', () => {
    expect(resolveCallState(booking(), new Date(OPENS.getTime() - 1000))).toBe('too_early');
  });

  it('ist exakt zum Öffnen bereits offen', () => {
    expect(resolveCallState(booking(), OPENS)).toBe('open');
  });

  it('ist exakt zum Schließen noch offen', () => {
    expect(resolveCallState(booking(), CLOSES)).toBe('open');
  });

  it('ist eine Sekunde nach dem Schließen abgelaufen', () => {
    expect(resolveCallState(booking(), new Date(CLOSES.getTime() + 1000))).toBe('expired');
  });

  // Die Lücke, die A1 schließt: ohne Fensterprüfung öffnete ein beliebig alter Mail-Link
  // den Call unbegrenzt.
  it('lässt einen alten Link nicht mehr in den Warteraum', () => {
    const state = resolveCallState(booking({ clientTokenUsedAt: START }), new Date('2026-08-27T10:00:00.000Z'));
    expect(state).toBe('expired');
  });

  it('beendet auch für einen bereits eingelassenen Klienten mit dem Fenster', () => {
    const state = resolveCallState(booking({ admittedAt: START }), new Date(CLOSES.getTime() + 1000));
    expect(state).toBe('expired');
  });
});

describe('resolveCallState – Fortschritt im Warteraum', () => {
  const during = new Date('2026-08-20T10:05:00.000Z');

  it('meldet offen, solange der Klient nicht da war', () => {
    expect(resolveCallState(booking(), during)).toBe('open');
  });

  it('meldet wartend, sobald der Klient den Warteraum betreten hat', () => {
    expect(resolveCallState(booking({ clientTokenUsedAt: during }), during)).toBe('waiting');
  });

  it('meldet eingelassen, sobald der Coach eingelassen hat', () => {
    const state = resolveCallState(booking({ clientTokenUsedAt: during, admittedAt: during }), during);
    expect(state).toBe('admitted');
  });

  // Der Coach kann einlassen, bevor der Klient eintrifft – sonst gäbe es ein Rennen
  // zwischen Klick und Ankunft.
  it('meldet eingelassen auch ohne vorherigen Warteraum-Eintritt', () => {
    expect(resolveCallState(booking({ admittedAt: during }), during)).toBe('admitted');
  });

  it('meldet beendet, sobald der Coach beendet hat', () => {
    const state = resolveCallState(booking({ admittedAt: during, callEndedAt: during }), during);
    expect(state).toBe('ended');
  });
});

describe('resolveCallState – Status der Buchung', () => {
  const during = new Date('2026-08-20T10:05:00.000Z');

  it('lässt eine abgesagte Buchung nicht in den Warteraum', () => {
    expect(resolveCallState(booking({ status: 'cancelled' }), during)).toBe('cancelled');
  });

  // Eine Absage wiegt schwerer als alles andere: sie soll auch dann als solche gemeldet
  // werden, wenn die Sitzung vorher schon lief.
  it('meldet die Absage auch nach einer eingelassenen Sitzung', () => {
    const state = resolveCallState(booking({ status: 'cancelled', admittedAt: during }), during);
    expect(state).toBe('cancelled');
  });

  it('lässt eine unbestätigte Buchung nicht in den Warteraum', () => {
    expect(resolveCallState(booking({ status: 'pending' }), during)).toBe('expired');
  });

  // Bestand aus der Zeit vor A1: 'completed' gab es, callEndedAt noch nicht.
  it('behandelt eine abgeschlossene Sitzung ohne Zeitstempel als beendet', () => {
    expect(resolveCallState(booking({ status: 'completed' }), during)).toBe('ended');
  });

  it('meldet zu früh unabhängig davon, ob der Klient den Link schon geöffnet hat', () => {
    const state = resolveCallState(booking({ clientTokenUsedAt: OPENS }), new Date(OPENS.getTime() - 1000));
    expect(state).toBe('too_early');
  });
});

describe('canAdmit', () => {
  it('erlaubt das Einlassen im offenen Fenster – mit und ohne wartenden Klienten', () => {
    expect(canAdmit('open')).toBe(true);
    expect(canAdmit('waiting')).toBe(true);
  });

  it('lehnt außerhalb des Fensters und nach dem Ende ab', () => {
    expect(canAdmit('too_early')).toBe(false);
    expect(canAdmit('expired')).toBe(false);
    expect(canAdmit('ended')).toBe(false);
    expect(canAdmit('cancelled')).toBe(false);
  });

  // Wiederholtes Einlassen behandelt der CallService als denselben Zustand, nicht als
  // Fehler – deshalb ist 'admitted' hier bewusst kein erlaubter Übergang.
  it('führt einen bereits eingelassenen Klienten nicht erneut ein', () => {
    expect(canAdmit('admitted')).toBe(false);
  });
});

describe('canEnd', () => {
  it('beendet nur eine tatsächlich begonnene Sitzung', () => {
    expect(canEnd('admitted')).toBe(true);
  });

  // Kein Abschluss ohne Einlass: 'completed' zählt als gehaltene Sitzung
  // (HELD_SESSION_STATUSES) und würde die Kennzahlen des Coachs verfälschen. Der
  // No-Show bekommt in B6 einen eigenen Weg.
  it('lehnt den Abschluss ohne Einlass ab', () => {
    expect(canEnd('open')).toBe(false);
    expect(canEnd('waiting')).toBe(false);
    expect(canEnd('too_early')).toBe(false);
    expect(canEnd('ended')).toBe(false);
  });
});
