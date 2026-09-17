import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, count, desc, eq, gt, inArray, lt, min, ne } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../db/db.module';
import { bookings, clients, sessionNotes } from '../db/schema';
import { HELD_SESSION_STATUSES } from '../bookings/booking.constants';
import { richTextToPlain } from '../common/rich-text-plain';
import type { CallClientContext } from '@hxroom/shared';

/** So viele frühere Sitzungen zeigt die Seitenleiste; der Rest steht im Klientenprofil. */
const PREVIOUS_SESSION_LIMIT = 3;

/**
 * Seitenleiste „Klient“ im Call des Coachs: Stammdaten, die wievielte Sitzung das ist, der
 * nächste Termin und die letzten Sitzungen samt Notiz.
 *
 * Alles bezieht sich auf den Beginn dieses Termins, nicht auf „jetzt“: Im Gespräch liegen
 * beide dicht beieinander, aber wer den Call nach dem Ende noch einmal öffnet, soll dieselbe
 * Sitzungsnummer sehen – und nicht die laufende Sitzung als „frühere“.
 *
 * Die Notizen sind der sensibelste Inhalt der Plattform und werden hier nie geloggt.
 */
@Injectable()
export class CallClientContextService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async getForCoach(organizationId: string, bookingId: string): Promise<CallClientContext> {
    const [booking] = await this.db
      .select({
        id:         bookings.id,
        clientId:   bookings.clientId,
        startTime:  bookings.startTime,
        clientNote: bookings.clientNote,
      })
      .from(bookings)
      .where(and(eq(bookings.id, bookingId), eq(bookings.organizationId, organizationId)))
      .limit(1);

    // Eine fremde Buchung ist für diesen Coach nicht vorhanden (gleiches Verhalten wie
    // CallService.findOwn).
    if (!booking) throw new NotFoundException('Booking not found');

    const bookingNote = booking.clientNote?.trim() || null;

    const [client] = booking.clientId
      ? await this.db
        .select()
        .from(clients)
        .where(and(eq(clients.id, booking.clientId), eq(clients.organizationId, organizationId)))
        .limit(1)
      : [];

    if (!client) {
      return { client: null, bookingNote, sessionNumber: null, nextSessionAt: null, previousSessions: [] };
    }

    const ofClient = and(eq(bookings.clientId, client.id), eq(bookings.organizationId, organizationId));
    // Dieselbe Definition von „gehalten“ wie in der Klientenliste (ClientsService).
    const heldBefore = and(
      ofClient,
      inArray(bookings.status, [...HELD_SESSION_STATUSES]),
      lt(bookings.startTime, booking.startTime),
    );

    const [[held], [next], previous] = await Promise.all([
      this.db.select({ value: count() }).from(bookings).where(heldBefore),
      this.db
        .select({ value: min(bookings.startTime) })
        .from(bookings)
        .where(and(
          ofClient,
          eq(bookings.status, 'confirmed'),
          gt(bookings.startTime, booking.startTime),
          ne(bookings.id, booking.id),
        )),
      this.db
        .select({
          bookingId:       bookings.id,
          startTime:       bookings.startTime,
          durationMinutes: bookings.durationMinutes,
          offerName:       bookings.offerName,
          note:            sessionNotes.content,
        })
        .from(bookings)
        .leftJoin(sessionNotes, and(
          eq(sessionNotes.bookingId, bookings.id),
          eq(sessionNotes.organizationId, organizationId),
        ))
        .where(heldBefore)
        .orderBy(desc(bookings.startTime))
        .limit(PREVIOUS_SESSION_LIMIT),
    ]);

    return {
      client: {
        id:        client.id,
        name:      client.name,
        email:     client.email,
        phone:     client.phone,
        note:      client.note?.trim() || null,
        createdAt: client.createdAt.toISOString(),
      },
      bookingNote,
      sessionNumber: held.value + 1,
      nextSessionAt: next?.value?.toISOString() ?? null,
      previousSessions: previous.map(row => ({
        bookingId:       row.bookingId,
        start:           row.startTime.toISOString(),
        durationMinutes: row.durationMinutes,
        offerName:       row.offerName,
        note:            richTextToPlain(row.note),
      })),
    };
  }
}
