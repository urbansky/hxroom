import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../db/db.module';
import { bookings, sessionNotes } from '../db/schema';
import type { RichTextDoc, SessionNoteDto, SessionNoteResponse } from '@hxroom/shared';

type SessionNoteRow = typeof sessionNotes.$inferSelect;

function toResponse(row: SessionNoteRow | undefined): SessionNoteResponse {
  return {
    content:   (row?.content as RichTextDoc | undefined) ?? null,
    updatedAt: row?.updatedAt.toISOString() ?? null,
  };
}

/**
 * Sitzungsnotizen des Coachs, eine pro Buchung. Dieselben Endpunkte bedienen den Call und
 * das Termin-Detail (doc/technisches-konzept.md §8: „beide Oberflächen greifen auf dieselbe
 * Tabelle zu“).
 *
 * Erlaubt für jede eigene Buchung, unabhängig vom Zustand: Vorbereitung vor der Sitzung und
 * Nachbearbeitung danach gehören genauso dazu wie die Mitschrift im Gespräch.
 *
 * Der Inhalt wird nie geloggt – er ist das Sensibelste, was die Plattform speichert.
 */
@Injectable()
export class SessionNotesService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async find(organizationId: string, bookingId: string): Promise<SessionNoteResponse> {
    await this.assertOwnBooking(organizationId, bookingId);

    const [row] = await this.db
      .select()
      .from(sessionNotes)
      .where(and(eq(sessionNotes.bookingId, bookingId), eq(sessionNotes.organizationId, organizationId)))
      .limit(1);

    return toResponse(row);
  }

  /**
   * Ganzes Dokument ersetzen. Schreiben zwei Tabs gleichzeitig, gewinnt der letzte – bei
   * einem Coach pro Gespräch ist das die erwartbare Wirkung, und ein Versionsabgleich würde
   * das automatische Speichern mitten im Tippen mit Konflikten unterbrechen.
   */
  async save(organizationId: string, bookingId: string, dto: SessionNoteDto): Promise<SessionNoteResponse> {
    await this.assertOwnBooking(organizationId, bookingId);

    const [row] = await this.db
      .insert(sessionNotes)
      .values({ organizationId, bookingId, content: dto.content })
      .onConflictDoUpdate({
        target: sessionNotes.bookingId,
        // $onUpdateFn greift beim Upsert nicht – der Zeitstempel muss hier ausdrücklich stehen.
        set: { content: dto.content, updatedAt: new Date() },
      })
      .returning();

    return toResponse(row);
  }

  // Eine fremde Buchung ist für diesen Coach nicht vorhanden, nicht verboten (gleiches
  // Verhalten wie CallService.findOwn).
  private async assertOwnBooking(organizationId: string, bookingId: string): Promise<void> {
    const [booking] = await this.db
      .select({ id: bookings.id })
      .from(bookings)
      .where(and(eq(bookings.id, bookingId), eq(bookings.organizationId, organizationId)))
      .limit(1);

    if (!booking) throw new NotFoundException('Booking not found');
  }
}
