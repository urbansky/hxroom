import { ConflictException, Inject, Injectable, NotFoundException, UnauthorizedException, type MessageEvent } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, concat, concatMap, defer, finalize, interval, map, merge, of } from 'rxjs';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../db/db.module';
import { bookings } from '../db/schema';
import { OrganizationService } from '../organization/organization.service';
import { tokenMatches } from '../common/client-token';
import { callWindowClosesAt, callWindowOpensAt } from '@hxroom/shared';
import { canAdmit, canEnd, mayJoinRoom, resolveCallState } from './call-access';
import { CallEventsService } from './call-events.service';
import { callIdentity, callRoomName, createCallToken, livekitUrl } from './livekit-token';
import type { CallAccessResponse } from '@hxroom/shared';
import type { bookings as bookingsTable } from '../db/schema';

type BookingRow = typeof bookingsTable.$inferSelect;

/**
 * Wer fragt. Die Antwortform ist für beide Rollen dieselbe (A1), der LiveKit-Token ist es
 * nicht: Er trägt eine rollengetrennte Identität und wird zu unterschiedlichen Zeitpunkten
 * ausgegeben. Als Objekt statt als zwei Parameter, damit die userId nicht ohne Rolle
 * durchgereicht werden kann.
 */
type CallActor = { role: 'coach'; userId: string } | { role: 'client' };

// Abstand der Heartbeats. Kurz genug für die üblichen Leerlaufgrenzen von Proxys
// (60 Sekunden), lang genug, um nicht selbst ins Gewicht zu fallen.
const HEARTBEAT_INTERVAL_MS = 25_000;

/**
 * Zustand und Zugang des Videocalls (doc/videocall-umsetzungsplan.md A1).
 *
 * Hier liegt die einzige Mandantengrenze des Calls: Der Raumname entsteht deterministisch
 * aus der Booking-ID und ist damit ratbar (doc/technisches-konzept.md §8) – die Trennung
 * hängt allein an dieser Prüfung. Beim Coach entscheidet die organizationId, beim Klienten
 * der clientAccessToken. Die Ausgabe des LiveKit-Tokens (B2) hängt an denselben Methoden,
 * damit die Prüfung nicht ein zweites Mal geschrieben wird.
 */
@Injectable()
export class CallService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly organizationService: OrganizationService,
    private readonly events: CallEventsService,
    private readonly config: ConfigService,
  ) {}

  // --- Klient: Ausweis ist der Token aus dem Mail-Link ---

  async getForClient(bookingId: string, token: string): Promise<CallAccessResponse> {
    const booking = await this.loadForClient(bookingId, token);
    return this.toResponse(booking, { role: 'client' });
  }

  /**
   * Betreten des Warteraums. Setzt beim ersten Mal clientTokenUsedAt und lässt den
   * Zeitstempel danach unangetastet – er beantwortet dem Coach, wie lange jemand schon
   * wartet, und ist kein Verbrauchszähler: Der Token wird bewusst nicht invalidiert,
   * sonst sperrte ein Reload oder ein Netzabbruch den Klienten aus.
   *
   * Ein geschlossenes Fenster ist hier kein Fehler, sondern eine Antwort: Wer zu früh
   * dran ist, bekommt 'too_early' samt opensAt und kann warten, statt auf einer
   * Fehlerseite zu landen.
   */
  async enterWaitingRoom(bookingId: string, token: string): Promise<CallAccessResponse> {
    const { booking, changed } = await this.db.transaction(async (tx) => {
      const [row] = await tx.select().from(bookings).where(eq(bookings.id, bookingId)).for('update');
      if (!row) throw new NotFoundException('Booking not found');
      if (!tokenMatches(token, row.clientAccessToken)) throw new UnauthorizedException('Invalid access token');

      const state = resolveCallState(row, new Date());
      const entersWaitingRoom = state === 'open' || state === 'waiting' || state === 'admitted';
      if (!entersWaitingRoom || row.clientTokenUsedAt) return { booking: row, changed: false };

      const [updated] = await tx
        .update(bookings)
        .set({ clientTokenUsedAt: new Date() })
        .where(eq(bookings.id, bookingId))
        .returning();

      return { booking: updated, changed: true };
    });

    if (changed) this.events.notifyChanged(bookingId);
    return this.toResponse(booking, { role: 'client' });
  }

  /**
   * Ereignisstrom des Klienten. Die Zugangsprüfung ist dieselbe wie beim Abruf – sie läuft
   * vor dem Öffnen des Streams, damit ein ungültiger Token als 401 ankommt und nicht als
   * leerer Stream.
   *
   * Solange der Strom offen ist, gilt der Klient als anwesend. Das ist die Antwort auf die
   * Frage, die A1 offenlassen musste: ob im Warteraum wirklich noch jemand sitzt.
   */
  async streamForClient(bookingId: string, token: string): Promise<Observable<MessageEvent>> {
    const initial = await this.getForClient(bookingId, token);

    // defer: Die Anmeldung passiert erst beim Abonnieren und nicht schon hier – sonst
    // bliebe ein Zähler stehen, falls es zwischen Aufruf und Abonnement scheitert.
    //
    // Der erste gesendete Zustand stammt noch aus der Zeit vor dieser Anmeldung und meldet
    // clientOnline: false. Das korrigiert sich sofort selbst: Die Anmeldung ist ihrerseits
    // eine Änderung und löst damit das nächste Ereignis aus.
    return defer(() => {
      const release = this.events.registerClientStream(bookingId);
      return this.stream(bookingId, initial, () => this.getForClient(bookingId, token)).pipe(finalize(release));
    });
  }

  // --- Coach: Ausweis ist die better-auth Session ---

  async getForCoach(organizationId: string, userId: string, bookingId: string): Promise<CallAccessResponse> {
    const booking = await this.findOwn(organizationId, bookingId);
    return this.toResponse(booking, { role: 'coach', userId });
  }

  async streamForCoach(
    organizationId: string,
    userId: string,
    bookingId: string,
  ): Promise<Observable<MessageEvent>> {
    const initial = await this.getForCoach(organizationId, userId, bookingId);
    return this.stream(bookingId, initial, () => this.getForCoach(organizationId, userId, bookingId));
  }

  /**
   * Einlassen des Klienten. Bewusst ohne die Bedingung, dass er bereits wartet: zwischen
   * dem Klick des Coachs und dem Eintreffen des Klienten läge sonst ein Rennen.
   */
  async admit(organizationId: string, userId: string, bookingId: string): Promise<CallAccessResponse> {
    return this.transition(organizationId, userId, bookingId, {
      // Zweimal einlassen ist kein Fehler, sondern derselbe Zustand – der Coach klickt
      // erfahrungsgemäß nach, wenn beim Klienten nicht sofort etwas passiert.
      alreadyDone: (state) => state === 'admitted',
      allowed: canAdmit,
      values: () => ({ admittedAt: new Date() }),
      conflict: 'Session cannot be opened in its current state',
    });
  }

  /**
   * Sitzungsende durch den Coach. Setzt zugleich den Status auf 'completed' – damit zählt
   * die Sitzung erstmals als gehalten (HELD_SESSION_STATUSES) und taucht in der
   * Klientenliste und der Betreiber-Auswertung auf.
   */
  async end(organizationId: string, userId: string, bookingId: string): Promise<CallAccessResponse> {
    return this.transition(organizationId, userId, bookingId, {
      alreadyDone: (state) => state === 'ended',
      allowed: canEnd,
      values: () => ({ callEndedAt: new Date(), status: 'completed' as const }),
      conflict: 'Session is not running',
    });
  }

  // --- intern ---

  /**
   * Gemeinsamer Aufbau beider Ströme: erst der aktuelle Stand, danach bei jeder Meldung
   * des Busses der frisch geladene.
   *
   * Jedes Ereignis trägt den vollständigen Zustand. Dadurch ist jede Nachricht für sich
   * verständlich, ein verpasstes Ereignis heilt beim nächsten von selbst, und es braucht
   * weder Last-Event-ID noch Wiedergabepuffer.
   *
   * `concatMap` statt `mergeMap`: Zwei dicht aufeinanderfolgende Änderungen dürfen sich
   * beim Laden nicht überholen – der Klient bekäme sonst 'waiting' nach 'admitted'.
   *
   * Was hier bewusst *nicht* passiert: das Verstreichen von Zeit melden. `too_early → open`
   * und der Ablauf des Zugangsfensters entstehen ohne Schreibvorgang. Da jedes Ereignis
   * opensAt, start und end mitliefert, rechnet die Oberfläche das selbst aus – billiger als
   * ein Server, der im Sekundentakt Zustände nachrechnet.
   */
  private stream(
    bookingId: string,
    initial: CallAccessResponse,
    load: () => Promise<CallAccessResponse>,
  ): Observable<MessageEvent> {
    const state = concat(of(initial), this.events.changesFor(bookingId).pipe(concatMap(() => load()))).pipe(
      map((data): MessageEvent => ({ data })),
    );

    // Ohne Nutzlast und ohne Datenbankzugriff, nur damit eine stille Verbindung nicht von
    // einer Zwischenstation gekappt wird. Als benanntes Ereignis, damit es den regulären
    // onmessage-Handler der Oberfläche nicht erreicht.
    const heartbeat = interval(HEARTBEAT_INTERVAL_MS).pipe(
      map((): MessageEvent => ({ type: 'ping', data: '' })),
    );

    return merge(state, heartbeat);
  }

  /**
   * Gemeinsamer Rahmen für die beiden Zustandswechsel des Coachs: Zeile sperren, Zustand
   * aus dem frischen Stand ableiten, schreiben. Die Sperre verhindert, dass zwei offene
   * Tabs desselben Coachs gegeneinander arbeiten.
   */
  private async transition(
    organizationId: string,
    userId: string,
    bookingId: string,
    step: {
      alreadyDone: (state: ReturnType<typeof resolveCallState>) => boolean;
      allowed: (state: ReturnType<typeof resolveCallState>) => boolean;
      values: () => Partial<BookingRow>;
      conflict: string;
    },
  ): Promise<CallAccessResponse> {
    const { booking, changed } = await this.db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(bookings)
        .where(and(eq(bookings.id, bookingId), eq(bookings.organizationId, organizationId)))
        .for('update');

      if (!row) throw new NotFoundException('Booking not found');

      const state = resolveCallState(row, new Date());
      if (step.alreadyDone(state)) return { booking: row, changed: false };
      if (!step.allowed(state)) throw new ConflictException(step.conflict);

      const [updated] = await tx.update(bookings).set(step.values()).where(eq(bookings.id, bookingId)).returning();
      return { booking: updated, changed: true };
    });

    // Erst nach dem Commit melden – und nur, wenn tatsächlich geschrieben wurde. Der
    // No-Op-Pfad oben ist der Doppelklick des Coachs; als Ereignis gemeldet, käme er beim
    // Klienten als zweiter Zustandswechsel an.
    if (changed) this.events.notifyChanged(bookingId);
    return this.toResponse(booking, { role: 'coach', userId });
  }

  private async loadForClient(bookingId: string, token: string): Promise<BookingRow> {
    const [booking] = await this.db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
    if (!booking) throw new NotFoundException('Booking not found');
    if (!tokenMatches(token, booking.clientAccessToken)) throw new UnauthorizedException('Invalid access token');
    return booking;
  }

  // Ownership über die organizationId – eine fremde Buchung ist für diesen Coach nicht
  // vorhanden, nicht verboten (gleiches Verhalten wie CoachBookingsService.findOwn).
  private async findOwn(organizationId: string, bookingId: string): Promise<BookingRow> {
    const [booking] = await this.db
      .select()
      .from(bookings)
      .where(and(eq(bookings.id, bookingId), eq(bookings.organizationId, organizationId)))
      .limit(1);

    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  // Eine Antwortform für beide Rollen (doc/videocall-umsetzungsplan.md A1). Der
  // clientAccessToken darf sie nie enthalten – er geht ausschließlich per E-Mail hinaus.
  private async toResponse(booking: BookingRow, actor: CallActor): Promise<CallAccessResponse> {
    const org = await this.organizationService.findById(booking.organizationId);
    const coach = await this.organizationService.findOwnerContact(booking.organizationId);
    const state = resolveCallState(booking, new Date());
    const coachName = coach?.name ?? org.name;

    return {
      bookingId:    booking.id,
      state,
      start:        booking.startTime.toISOString(),
      end:          booking.endTime.toISOString(),
      offerName:    booking.offerName,
      offerId:      booking.offerId,
      coachName,
      clientName:   booking.clientName,
      opensAt:      callWindowOpensAt(booking.startTime).toISOString(),
      closesAt:     callWindowClosesAt(booking.endTime).toISOString(),
      waitingSince: booking.clientTokenUsedAt?.toISOString() ?? null,
      admittedAt:   booking.admittedAt?.toISOString() ?? null,
      clientOnline: this.events.isClientOnline(booking.id),
      livekit:      await this.livekitAccess(booking, actor, state, coachName),
    };
  }

  /**
   * Der Ausweis für den LiveKit-Raum (B2). Hängt bewusst hier und nicht an einem eigenen
   * Endpunkt: Beide Wege hierher – der des Klienten über den clientAccessToken, der des
   * Coachs über die organizationId – haben ihre Prüfung bereits hinter sich. Ein zweiter
   * Endpunkt bräuchte dieselbe Prüfung ein zweites Mal, und genau dort läuft so etwas
   * irgendwann auseinander (§8).
   *
   * Ausgestellt wird bei jedem Abruf neu. Das klingt verschwenderisch, löst aber die
   * Spanne zwischen zehn Minuten Token-Laufzeit und bis zu einer Stunde Wartezeit ohne
   * Sonderweg: Da jedes SSE-Ereignis den frisch geladenen Zustand trägt (siehe stream()),
   * entsteht der Token genau in dem Ereignis, das den Einlass meldet – und bei jedem
   * Reconnect erneut.
   */
  private async livekitAccess(
    booking: BookingRow,
    actor: CallActor,
    state: ReturnType<typeof resolveCallState>,
    coachName: string,
  ): Promise<CallAccessResponse['livekit']> {
    if (!mayJoinRoom(state, actor.role)) return null;

    const coach = actor.role === 'coach';

    return {
      url: livekitUrl(this.config),
      token: await createCallToken(this.config, {
        room: callRoomName(booking.id),
        identity: callIdentity(actor.role, coach ? actor.userId : booking.id),
        // Der Anzeigename der Gegenseite steht damit im Raum, ohne dass die Bühne ihn
        // gesondert zuordnen muss. Beide kennen ihn ohnehin, und LiveKit läuft
        // self-hosted – kein neuer Empfänger personenbezogener Daten.
        displayName: coach ? coachName : booking.clientName,
      }),
    };
  }
}
