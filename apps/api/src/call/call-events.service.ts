import { Injectable } from '@nestjs/common';
import { Observable, Subject, filter, map } from 'rxjs';

/**
 * Ereigniskanal und Präsenzregistry des Videocalls (doc/videocall-umsetzungsplan.md A2).
 *
 * Der Bus transportiert bewusst **nur die bookingId**, nicht den fertigen Zustand: Wer
 * etwas ändert, muss dann keine Antwort bauen können. Das ist die Voraussetzung dafür,
 * dass auch Stellen außerhalb des Call-Moduls melden können – etwa die Absage durch den
 * Coach (CoachBookingsService). Den vollständigen Stand lädt der Stream selbst.
 *
 * Beides lebt im Prozess. Bei mehreren API-Instanzen sähe ein Ereignis nur, wer zufällig
 * auf derselben Instanz hängt – dieselbe Einschränkung wie beim ScheduleModule in
 * app.module.ts. Das Deployment fährt heute genau eine Instanz und hat kein Redis.
 */
@Injectable()
export class CallEventsService {
  private readonly changes = new Subject<string>();

  // Anzahl offener Klienten-Streams je Buchung. Ein Zähler und keine Menge von IDs, weil
  // die einzige Frage lautet: hält gerade noch jemand die Verbindung? Zwei Tabs desselben
  // Klienten zählen deshalb doppelt und der zweite hält die Präsenz, wenn der erste geht.
  private readonly clientStreams = new Map<string, number>();

  /** Meldet, dass sich am Zustand dieser Buchung etwas geändert hat. */
  notifyChanged(bookingId: string): void {
    this.changes.next(bookingId);
  }

  /** Ereignisse genau einer Buchung – ohne Nutzlast, der Abonnent lädt den Stand selbst. */
  changesFor(bookingId: string): Observable<void> {
    return this.changes.pipe(
      filter((id) => id === bookingId),
      map(() => undefined),
    );
  }

  /**
   * An- und Abmeldung eines Klienten-Streams. Gibt die Abmeldefunktion zurück, die an
   * `finalize` des Streams gehört – ein abgebrochener Browser bliebe sonst als Dauergast
   * in der Registry stehen und der Coach sähe einen Klienten, der längst weg ist.
   *
   * Eine Präsenzänderung ist selbst ein Ereignis: Sie ändert `clientOnline` und damit die
   * Sicht des Coachs.
   */
  registerClientStream(bookingId: string): () => void {
    this.clientStreams.set(bookingId, (this.clientStreams.get(bookingId) ?? 0) + 1);
    this.notifyChanged(bookingId);

    let released = false;
    return () => {
      // Gegen doppelten Aufruf: finalize kann bei Fehler und Abschluss beide greifen,
      // und ein zu tief gezählter Wert machte einen anwesenden Klienten unsichtbar.
      if (released) return;
      released = true;

      const open = (this.clientStreams.get(bookingId) ?? 1) - 1;
      if (open > 0) this.clientStreams.set(bookingId, open);
      else this.clientStreams.delete(bookingId);

      this.notifyChanged(bookingId);
    };
  }

  /**
   * Hält der Klient gerade eine Verbindung? Sagt nicht, dass jemand davor sitzt – für den
   * Einlass-Knopf des Coachs reicht das. Der Warteraum-Eintritt selbst bleibt getrennt
   * davon in `clientTokenUsedAt` festgehalten (A1).
   */
  isClientOnline(bookingId: string): boolean {
    return (this.clientStreams.get(bookingId) ?? 0) > 0;
  }
}
