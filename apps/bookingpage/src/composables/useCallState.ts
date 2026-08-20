import { onUnmounted, ref } from 'vue';
import { apiUrl } from '../utils/api';
import type { CallAccessResponse, CallState } from '@hxroom/shared';

/** Zustände, nach denen nichts mehr kommt – dort wird der Ereignisstrom geschlossen. */
const FINAL_STATES: CallState[] = ['ended', 'cancelled', 'expired'];

/** Sekundentakt für Countdown und das Erkennen von Fensterwechseln. */
const TICK_MS = 1000;

function isFinal(state: CallState): boolean {
  return FINAL_STATES.includes(state);
}

// Die englischen Meldungen der API in Sätze übersetzen, die dem Klienten weiterhelfen –
// dasselbe Vorgehen wie mapCancelError in CancelBookingView.vue.
//
// Nicht hier landen 'too_early' und 'expired': Ein geschlossenes Zugangsfenster ist kein
// Fehler, sondern ein Zustand mit eigener Ansicht.
function mapCallError(message: string | undefined): string {
  switch (message) {
    case 'Invalid access token':
      return 'Dieser Link ist ungültig. Bitte öffne den Link aus deiner Bestätigungsmail.';
    case 'Booking not found':
      return 'Zu diesem Link gibt es keinen Termin.';
    default:
      return 'Der Raum konnte nicht geöffnet werden.';
  }
}

/**
 * Zustand des Videocalls für die Klientenseite: Eintritt, Ereignisstrom und Zeitrechnung
 * an einer Stelle, damit die Ansicht nur noch darstellt.
 */
export function useCallState(bookingId: string, token: string) {
  const phase = ref<'loading' | 'ready' | 'error'>('loading');
  const call = ref<CallAccessResponse | null>(null);
  const errorMessage = ref('');
  /** Reaktive Jetzt-Zeit für den Countdown; ohne sie stünde die Anzeige still. */
  const now = ref(Date.now());

  let source: EventSource | null = null;
  let ticker: ReturnType<typeof setInterval> | undefined;

  function closeStream() {
    source?.close();
    source = null;
  }

  /**
   * Der Ereignisstrom hält zugleich die Anwesenheit: Solange er offen ist, sieht der Coach
   * den Klienten als anwesend. Deshalb wird er über die gesamte Wartezeit gehalten und nur
   * bei Endzuständen und beim Verlassen der Seite geschlossen.
   */
  function openStream() {
    if (source) return;

    source = new EventSource(
      `${apiUrl}/api/v1/bookings/${bookingId}/waiting-room/events?token=${encodeURIComponent(token)}`,
    );

    source.onmessage = (event) => {
      const next = JSON.parse(event.data) as CallAccessResponse;
      call.value = next;
      if (isFinal(next.state)) closeStream();
    };

    // Kein eigenes Zutun: Der Browser verbindet von sich aus neu, und jedes Ereignis trägt
    // den vollständigen Zustand – ein währenddessen verpasster Wechsel heilt beim nächsten.
    source.onerror = () => {};

    // Das benannte 'ping'-Ereignis des Servers erreicht onmessage bewusst nicht; es hält
    // nur die Verbindung offen und braucht keine Behandlung.
  }

  /**
   * Betreten des Warteraums – zugleich die Zugangsprüfung.
   *
   * Bewusst vor dem Ereignisstrom: Ein EventSource kann den HTTP-Status nicht lesen. Bei
   * ungültigem Token bekäme er nur ein anonymes onerror und verbände endlos neu, ohne dass
   * der Klient je erführe, warum nichts passiert. Der POST liefert 401 und 404 sauber aus.
   *
   * Serverseitig ist der Aufruf idempotent: Er hält den ersten Eintritt fest und
   * verbraucht den Token nicht – Reload und Netzabbruch sind unschädlich.
   */
  async function enter(): Promise<void> {
    try {
      const res = await fetch(`${apiUrl}/api/v1/bookings/${bookingId}/waiting-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        phase.value = 'error';
        errorMessage.value = mapCallError(body?.message);
        closeStream();
        return;
      }

      call.value = body as CallAccessResponse;
      phase.value = 'ready';

      if (isFinal(call.value.state)) closeStream();
      else openStream();
    } catch {
      phase.value = 'error';
      errorMessage.value = 'Der Raum konnte nicht geöffnet werden. Bitte versuche es erneut.';
    }
  }

  /**
   * Prüft, ob allein durch das Verstreichen von Zeit ein anderer Zustand gilt. Die API
   * meldet das nicht, weil dabei nichts geschrieben wird; die Grenzen des Zugangsfensters
   * stehen dafür in jeder Antwort.
   */
  function checkWindow(): void {
    const current = call.value;
    if (!current || phase.value !== 'ready') return;

    // Fenster hat sich geöffnet: erneut eintreten, damit der Coach den Klienten auch
    // wirklich als wartend sieht – ein reines Nachladen würde ihn nicht anmelden.
    if (current.state === 'too_early' && now.value >= Date.parse(current.opensAt)) {
      void enter();
      return;
    }

    if (!isFinal(current.state) && now.value > Date.parse(current.closesAt)) void enter();
  }

  function start(): void {
    if (!token) {
      phase.value = 'error';
      errorMessage.value = 'Dieser Link ist unvollständig. Bitte öffne den Link aus deiner Bestätigungsmail.';
      return;
    }

    void enter();
    ticker = setInterval(() => {
      now.value = Date.now();
      checkWindow();
    }, TICK_MS);
  }

  onUnmounted(() => {
    closeStream();
    if (ticker) clearInterval(ticker);
  });

  return { phase, call, errorMessage, now, start };
}
