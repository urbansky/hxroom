import { ConflictException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../db/db.module';
import { bookings } from '../db/schema';
import { OrganizationService } from '../organization/organization.service';
import { tokenMatches } from '../common/client-token';
import { callWindowOpensAt, canAdmit, canEnd, resolveCallState } from './call-access';
import type { CallAccessResponse } from '@hxroom/shared';
import type { bookings as bookingsTable } from '../db/schema';

type BookingRow = typeof bookingsTable.$inferSelect;

/**
 * Zustand und Zugang des Videocalls (doc/videocall-umsetzungsplan.md A1).
 *
 * Hier liegt die einzige Mandantengrenze des Calls: Der Raumname entsteht deterministisch
 * aus der Booking-ID und ist damit ratbar (doc/technisches-konzept.md §8) – die Trennung
 * hängt allein an dieser Prüfung. Beim Coach entscheidet die organizationId, beim Klienten
 * der clientAccessToken. Ab B2 hängt die Ausgabe des LiveKit-Tokens an denselben Methoden,
 * damit die Prüfung nicht ein zweites Mal geschrieben wird.
 */
@Injectable()
export class CallService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly organizationService: OrganizationService,
  ) {}

  // --- Klient: Ausweis ist der Token aus dem Mail-Link ---

  async getForClient(bookingId: string, token: string): Promise<CallAccessResponse> {
    const booking = await this.loadForClient(bookingId, token);
    return this.toResponse(booking);
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
    const booking = await this.db.transaction(async (tx) => {
      const [row] = await tx.select().from(bookings).where(eq(bookings.id, bookingId)).for('update');
      if (!row) throw new NotFoundException('Booking not found');
      if (!tokenMatches(token, row.clientAccessToken)) throw new UnauthorizedException('Invalid access token');

      const state = resolveCallState(row, new Date());
      const entersWaitingRoom = state === 'open' || state === 'waiting' || state === 'admitted';
      if (!entersWaitingRoom || row.clientTokenUsedAt) return row;

      const [updated] = await tx
        .update(bookings)
        .set({ clientTokenUsedAt: new Date() })
        .where(eq(bookings.id, bookingId))
        .returning();

      return updated;
    });

    return this.toResponse(booking);
  }

  // --- Coach: Ausweis ist die better-auth Session ---

  async getForCoach(organizationId: string, bookingId: string): Promise<CallAccessResponse> {
    const booking = await this.findOwn(organizationId, bookingId);
    return this.toResponse(booking);
  }

  /**
   * Einlassen des Klienten. Bewusst ohne die Bedingung, dass er bereits wartet: zwischen
   * dem Klick des Coachs und dem Eintreffen des Klienten läge sonst ein Rennen.
   */
  async admit(organizationId: string, bookingId: string): Promise<CallAccessResponse> {
    return this.transition(organizationId, bookingId, {
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
  async end(organizationId: string, bookingId: string): Promise<CallAccessResponse> {
    return this.transition(organizationId, bookingId, {
      alreadyDone: (state) => state === 'ended',
      allowed: canEnd,
      values: () => ({ callEndedAt: new Date(), status: 'completed' as const }),
      conflict: 'Session is not running',
    });
  }

  // --- intern ---

  /**
   * Gemeinsamer Rahmen für die beiden Zustandswechsel des Coachs: Zeile sperren, Zustand
   * aus dem frischen Stand ableiten, schreiben. Die Sperre verhindert, dass zwei offene
   * Tabs desselben Coachs gegeneinander arbeiten.
   */
  private async transition(
    organizationId: string,
    bookingId: string,
    step: {
      alreadyDone: (state: ReturnType<typeof resolveCallState>) => boolean;
      allowed: (state: ReturnType<typeof resolveCallState>) => boolean;
      values: () => Partial<BookingRow>;
      conflict: string;
    },
  ): Promise<CallAccessResponse> {
    const booking = await this.db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(bookings)
        .where(and(eq(bookings.id, bookingId), eq(bookings.organizationId, organizationId)))
        .for('update');

      if (!row) throw new NotFoundException('Booking not found');

      const state = resolveCallState(row, new Date());
      if (step.alreadyDone(state)) return row;
      if (!step.allowed(state)) throw new ConflictException(step.conflict);

      const [updated] = await tx.update(bookings).set(step.values()).where(eq(bookings.id, bookingId)).returning();
      return updated;
    });

    return this.toResponse(booking);
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
  private async toResponse(booking: BookingRow): Promise<CallAccessResponse> {
    const org = await this.organizationService.findById(booking.organizationId);
    const coach = await this.organizationService.findOwnerContact(booking.organizationId);

    return {
      bookingId:    booking.id,
      state:        resolveCallState(booking, new Date()),
      start:        booking.startTime.toISOString(),
      end:          booking.endTime.toISOString(),
      offerName:    booking.offerName,
      coachName:    coach?.name ?? org.name,
      clientName:   booking.clientName,
      opensAt:      callWindowOpensAt(booking.startTime).toISOString(),
      waitingSince: booking.clientTokenUsedAt?.toISOString() ?? null,
      admittedAt:   booking.admittedAt?.toISOString() ?? null,
    };
  }
}
