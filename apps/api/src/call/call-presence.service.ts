import { Inject, Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { and, eq, isNotNull, isNull, lt, sql } from 'drizzle-orm';
import type { RoomServiceClient } from 'livekit-server-sdk';
import { DRIZZLE, type DrizzleDb } from '../db/db.module';
import { bookings } from '../db/schema';
import { LIVEKIT_ROOM_SERVICE } from '../livekit/livekit.module';
import { CallService } from './call.service';
import { COACH_GRACE_MINUTES, presenceChange, type WebhookLike } from './call-presence';
import { callRoomName, roleFromIdentity } from './livekit-token';

/** Wie oft nach abgelaufenen Nachfristen gesehen wird. Die Nachfrist ist damit auf ±30 s genau. */
const SWEEP_INTERVAL_MS = 30_000;

/**
 * Autoritatives Sitzungsende (doc/videocall-umsetzungsplan.md B6).
 *
 * Bisher endete eine Sitzung nur über „Sitzung beenden". Schloss der Coach einfach den Tab,
 * blieb sie offen – der Klient saß allein im Raum, und der Termin galt nie als gehalten.
 * Jetzt meldet LiveKit per Webhook, wenn der Coach geht; kommt er innerhalb von
 * COACH_GRACE_MINUTES nicht zurück, endet die Sitzung wie beim Klick.
 *
 * Zwei Hälften:
 * - `handle` trägt die Webhooks ein: Nachfrist beginnen oder aufheben.
 * - `endAbandonedSessions` beendet, was abgelaufen ist – und fragt dabei LiveKit selbst,
 *   ob der Coach nicht doch im Raum ist. Webhooks kommen nicht zwingend in der Reihenfolge
 *   an, in der die Dinge passiert sind: Beim zweiten Tab etwa (DUPLICATE_IDENTITY) trifft
 *   das Verlassen des alten Tabs oft *nach* dem Beitritt des neuen ein. Der Blick in den
 *   Raum im Moment der Entscheidung macht das unschädlich.
 *
 * Geloggt werden nur IDs, keine Namen (technisches-konzept.md §17).
 */
@Injectable()
export class CallPresenceService {
  private readonly logger = new Logger(CallPresenceService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly callService: CallService,
    @Inject(LIVEKIT_ROOM_SERVICE) private readonly rooms: RoomServiceClient,
  ) {}

  async handle(event: WebhookLike): Promise<void> {
    const change = presenceChange(event);
    if (!change) return;

    if (change.change === 'coach-joined') {
      await this.db
        .update(bookings)
        .set({ coachLeftAt: null })
        .where(and(eq(bookings.id, change.bookingId), isNotNull(bookings.coachLeftAt)));
      return;
    }

    // coach-left und room-finished: Nachfrist beginnen – nur für eine laufende Sitzung, und
    // nur, wenn sie nicht schon läuft. Sonst verlängerte jedes weitere Ereignis sie.
    // Vor dem Einlass ist der Coach nicht im Raum (er tritt beim Einlassen bei), ein
    // Verlassen gibt es dort also nicht; die Bedingung auf admittedAt fängt Nachzügler ab.
    const started = await this.db
      .update(bookings)
      .set({ coachLeftAt: sql`now()` })
      .where(
        and(
          eq(bookings.id, change.bookingId),
          isNotNull(bookings.admittedAt),
          isNull(bookings.callEndedAt),
          isNull(bookings.coachLeftAt),
          eq(bookings.status, 'confirmed'),
        ),
      )
      .returning({ id: bookings.id });

    if (started.length) {
      this.logger.log(`Coach nicht mehr im Raum, Nachfrist läuft (Buchung ${change.bookingId}, ${change.change})`);
    }
  }

  @Interval(SWEEP_INTERVAL_MS)
  async endAbandonedSessions(): Promise<void> {
    let due: { id: string }[];
    try {
      due = await this.db
        .select({ id: bookings.id })
        .from(bookings)
        .where(
          and(
            isNull(bookings.callEndedAt),
            // Grenze in SQL: So zählt die Zeit der Datenbank, in der auch coachLeftAt steht.
            lt(bookings.coachLeftAt, sql`now() - make_interval(mins => ${COACH_GRACE_MINUTES})`),
          ),
        );
    } catch (err) {
      this.logger.error('Abfrage der abgelaufenen Nachfristen fehlgeschlagen', err);
      return;
    }

    for (const { id } of due) {
      try {
        if (await this.coachInRoom(id)) {
          // Er ist da – das Ereignis seines Beitritts ist verloren gegangen oder kam vor dem
          // seines Verlassens an. Nachfrist aufheben statt beenden.
          await this.db.update(bookings).set({ coachLeftAt: null }).where(eq(bookings.id, id));
          this.logger.log(`Coach doch im Raum, Nachfrist aufgehoben (Buchung ${id})`);
          continue;
        }

        if (await this.callService.endAfterCoachLeft(id)) {
          this.logger.log(`Sitzung beendet, Coach nicht zurückgekommen (Buchung ${id})`);
        }
      } catch (err) {
        // LiveKit nicht erreichbar oder die Datenbank hakt: im nächsten Lauf erneut. Lieber
        // eine Sitzung eine halbe Minute zu spät beenden als eine laufende zu früh.
        this.logger.warn(`Nachfrist nicht geprüft, nächster Lauf versucht es erneut (Buchung ${id})`);
      }
    }
  }

  /**
   * Ist gerade ein Coach im Raum dieser Sitzung? Ein Raum, den es nicht mehr gibt, ist leer.
   * Jeder andere Fehler wirft – dann wird nicht beendet.
   */
  private async coachInRoom(bookingId: string): Promise<boolean> {
    try {
      const participants = await this.rooms.listParticipants(callRoomName(bookingId));
      return participants.some((participant) => roleFromIdentity(participant.identity) === 'coach');
    } catch (err) {
      if (isRoomNotFound(err)) return false;
      throw err;
    }
  }
}

/** LiveKit antwortet für einen geschlossenen Raum mit „not_found" (Twirp) bzw. HTTP 404. */
function isRoomNotFound(err: unknown): boolean {
  const e = err as { code?: string; status?: number; message?: string } | null;
  return e?.code === 'not_found' || e?.status === 404 || /not.?found/i.test(e?.message ?? '');
}
