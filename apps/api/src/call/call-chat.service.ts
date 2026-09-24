import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import { and, asc, count, eq, gt } from 'drizzle-orm';
import { CALL_MESSAGES_PER_BOOKING_LIMIT } from '@hxroom/shared';
import { DRIZZLE, type DrizzleDb } from '../db/db.module';
import { sessionChatMessages } from '../db/schema';
import { mayReachRoom, resolveCallState } from './call-access';
import { CallEventsService } from './call-events.service';
import { CallService } from './call.service';
import type {
  CallChatMessageResponse,
  CallChatMessagesResponse,
  CallChatSender,
  SendCallMessageDto,
} from '@hxroom/shared';
import type { bookings as bookingsTable, sessionChatMessages as messagesTable } from '../db/schema';

type BookingRow = typeof bookingsTable.$inferSelect;
type MessageRow = typeof messagesTable.$inferSelect;

function toResponse(row: MessageRow): CallChatMessageResponse {
  return {
    id:              row.id,
    seq:             Number(row.seq),
    sender:          row.sender,
    text:            row.text,
    createdAt:       row.createdAt.toISOString(),
    clientMessageId: row.clientMessageId,
  };
}

/**
 * Chat einer Sitzung (doc/videocall-umsetzungsplan.md B7).
 *
 * Der Weg einer Nachricht führt über die API und nicht über den LiveKit-Datenkanal: Läge das
 * Speichern beim Browser des Senders, gäbe es Nachrichten, die ankommen, aber nirgends
 * liegen – und umgekehrt. Zugestellt wird über den Ereigniskanal, den beide Seiten während
 * des Gesprächs ohnehin offen halten; das Ereignis trägt keinen Inhalt, jede Seite holt sich
 * die neuen Nachrichten mit ihrem eigenen Ausweis.
 *
 * Die Mandantengrenze wird nicht neu geprüft, sondern von `CallService` übernommen
 * (`findOwn` für den Coach, `loadForClient` für den Token des Klienten).
 *
 * Der Inhalt wird nie geloggt – wie bei den Notizen.
 */
@Injectable()
export class CallChatService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly callService: CallService,
    private readonly events: CallEventsService,
  ) {}

  // --- Coach: Ausweis ist die Session, die Grenze die organizationId ---

  async listForCoach(organizationId: string, bookingId: string, after?: number): Promise<CallChatMessagesResponse> {
    const booking = await this.callService.findOwn(organizationId, bookingId);
    return this.list(booking.id, after);
  }

  async sendAsCoach(
    organizationId: string,
    userId: string,
    bookingId: string,
    dto: SendCallMessageDto,
  ): Promise<CallChatMessageResponse> {
    const booking = await this.callService.findOwn(organizationId, bookingId);
    return this.send(booking, 'coach', userId, dto);
  }

  // --- Klient: Ausweis ist der Token aus dem Mail-Link ---

  /**
   * Der Klient darf lesen, solange sein Zugang gilt. Nach dem Ende der Sitzung ist der Raum
   * für ihn zu – der Verlauf bleibt dem Coach, für den er gespeichert wurde.
   */
  async listForClient(bookingId: string, token: string, after?: number): Promise<CallChatMessagesResponse> {
    const booking = await this.callService.loadForClient(bookingId, token);
    if (!mayReachRoom(resolveCallState(booking, new Date()))) {
      throw new ConflictException('Session is not open');
    }
    return this.list(booking.id, after);
  }

  async sendAsClient(bookingId: string, token: string, dto: SendCallMessageDto): Promise<CallChatMessageResponse> {
    const booking = await this.callService.loadForClient(bookingId, token);
    return this.send(booking, 'client', null, dto);
  }

  // --- intern ---

  /**
   * Der Verlauf, aufsteigend. `after` ist die Nummer der letzten bekannten Nachricht: Auf ein
   * Chatereignis hin fragt die Oberfläche damit nur nach, was sie noch nicht hat, und nach
   * einem Verbindungsabbruch holt derselbe Aufruf alles Verpasste nach.
   */
  private async list(bookingId: string, after?: number): Promise<CallChatMessagesResponse> {
    const rows = await this.db
      .select()
      .from(sessionChatMessages)
      .where(
        after === undefined
          ? eq(sessionChatMessages.bookingId, bookingId)
          : and(eq(sessionChatMessages.bookingId, bookingId), gt(sessionChatMessages.seq, after)),
      )
      .orderBy(asc(sessionChatMessages.seq));

    return { messages: rows.map(toResponse) };
  }

  /**
   * Geschrieben wird nur im laufenden Gespräch: Der Chat ist die Rückfallebene *im* Call
   * (project.md §5a), nicht ein Postfach für die Zeit davor oder danach. Vor dem Einlass
   * gibt es den Warteraum, nach dem Ende ist die Sitzung abgeschlossen.
   */
  private async send(
    booking: BookingRow,
    sender: CallChatSender,
    senderUserId: string | null,
    dto: SendCallMessageDto,
  ): Promise<CallChatMessageResponse> {
    if (resolveCallState(booking, new Date()) !== 'admitted') {
      throw new ConflictException('Chat is only available during the session');
    }

    const [{ value: existing }] = await this.db
      .select({ value: count() })
      .from(sessionChatMessages)
      .where(eq(sessionChatMessages.bookingId, booking.id));

    if (existing >= CALL_MESSAGES_PER_BOOKING_LIMIT) {
      throw new BadRequestException('Message limit for this session reached');
    }

    // Wiederholbar: Derselbe clientMessageId trifft auf den Unique-Schlüssel, und statt einer
    // zweiten Zeile kommt die vorhandene zurück. Ein Netzfehler nach dem Schreiben – die
    // Antwort geht verloren, die Nachricht liegt schon – ist damit unschädlich.
    const [inserted] = await this.db
      .insert(sessionChatMessages)
      .values({
        organizationId:  booking.organizationId,
        bookingId:       booking.id,
        sender,
        senderUserId,
        clientMessageId: dto.clientMessageId,
        text:            dto.text,
      })
      .onConflictDoNothing({ target: [sessionChatMessages.bookingId, sessionChatMessages.clientMessageId] })
      .returning();

    if (!inserted) return this.findByClientMessageId(booking.id, dto.clientMessageId);

    this.events.notifyChat(booking.id);
    return toResponse(inserted);
  }

  private async findByClientMessageId(bookingId: string, clientMessageId: string): Promise<CallChatMessageResponse> {
    const [row] = await this.db
      .select()
      .from(sessionChatMessages)
      .where(
        and(
          eq(sessionChatMessages.bookingId, bookingId),
          eq(sessionChatMessages.clientMessageId, clientMessageId),
        ),
      )
      .limit(1);

    // Kann nur fehlen, wenn zwischen Konflikt und Abfrage gelöscht wurde – heute gibt es
    // keinen Weg, eine einzelne Nachricht zu löschen.
    if (!row) throw new ConflictException('Message could not be stored');
    return toResponse(row);
  }
}
