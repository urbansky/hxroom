import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CallEventsService } from './call-events.service';

describe('CallEventsService – Zustellung', () => {
  let events: CallEventsService;

  beforeEach(() => {
    events = new CallEventsService();
  });

  it('stellt eine Meldung an den Abonnenten derselben Buchung zu', () => {
    const received = vi.fn();
    events.changesFor('booking-1').subscribe(received);

    events.notifyChanged('booking-1');

    expect(received).toHaveBeenCalledTimes(1);
  });

  // Beide Streams einer Sitzung – Coach und Klient – hängen am selben Bus. Ohne diesen
  // Filter bekäme jede offene Verbindung im Prozess jede fremde Änderung.
  it('stellt einer anderen Buchung nichts zu', () => {
    const received = vi.fn();
    events.changesFor('booking-1').subscribe(received);

    events.notifyChanged('booking-2');

    expect(received).not.toHaveBeenCalled();
  });

  it('erreicht alle Abonnenten derselben Buchung', () => {
    const coach = vi.fn();
    const client = vi.fn();
    events.changesFor('booking-1').subscribe(coach);
    events.changesFor('booking-1').subscribe(client);

    events.notifyChanged('booking-1');

    expect(coach).toHaveBeenCalledTimes(1);
    expect(client).toHaveBeenCalledTimes(1);
  });

  it('stellt einem abgemeldeten Abonnenten nichts mehr zu', () => {
    const received = vi.fn();
    const subscription = events.changesFor('booking-1').subscribe(received);

    subscription.unsubscribe();
    events.notifyChanged('booking-1');

    expect(received).not.toHaveBeenCalled();
  });
});

// Diese Registry beantwortet die Frage, die A1 offenlassen musste: ob im Warteraum
// wirklich noch jemand sitzt. Zählt sie falsch, sieht der Coach entweder einen Klienten,
// der längst weg ist, oder keinen, der wartet.
describe('CallEventsService – Präsenz', () => {
  let events: CallEventsService;

  beforeEach(() => {
    events = new CallEventsService();
  });

  it('meldet ohne offenen Stream niemanden', () => {
    expect(events.isClientOnline('booking-1')).toBe(false);
  });

  it('meldet den Klienten als anwesend, solange sein Stream offen ist', () => {
    const release = events.registerClientStream('booking-1');
    expect(events.isClientOnline('booking-1')).toBe(true);

    release();
    expect(events.isClientOnline('booking-1')).toBe(false);
  });

  it('trennt die Präsenz nach Buchung', () => {
    events.registerClientStream('booking-1');
    expect(events.isClientOnline('booking-2')).toBe(false);
  });

  // Zwei Tabs desselben Klienten: Schließt er einen, ist er noch da.
  it('bleibt anwesend, solange ein zweiter Stream offen ist', () => {
    const releaseFirst = events.registerClientStream('booking-1');
    const releaseSecond = events.registerClientStream('booking-1');

    releaseFirst();
    expect(events.isClientOnline('booking-1')).toBe(true);

    releaseSecond();
    expect(events.isClientOnline('booking-1')).toBe(false);
  });

  // finalize kann bei Abschluss und Fehler beide greifen. Ein doppelt gezähltes Ende
  // machte einen zweiten, noch offenen Stream unsichtbar.
  it('zählt eine doppelte Abmeldung nur einmal', () => {
    const releaseFirst = events.registerClientStream('booking-1');
    events.registerClientStream('booking-1');

    releaseFirst();
    releaseFirst();

    expect(events.isClientOnline('booking-1')).toBe(true);
  });

  it('meldet den Wechsel der Präsenz als Änderung', () => {
    const received = vi.fn();
    events.changesFor('booking-1').subscribe(received);

    const release = events.registerClientStream('booking-1');
    expect(received).toHaveBeenCalledTimes(1);

    release();
    expect(received).toHaveBeenCalledTimes(2);
  });
});
