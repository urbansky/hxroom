import { ConflictException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { randomBytes, timingSafeEqual } from 'crypto';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../db/db.module';
import { organization, bookings, clients } from '../db/schema';
import { OrganizationService } from '../organization/organization.service';
import type { CreateBookingDto, BookingResponse } from '@hxroom/shared';
import type { bookings as bookingsTable } from '../db/schema';

type BookingRow = typeof bookingsTable.$inferSelect;

// Nie das komplette DB-Row zurückgeben: clientAccessToken darf ausschließlich per
// E-Mail an den Klienten gehen, niemals in einer Browser-lesbaren API-Antwort landen
// (sonst könnte jeder eine Buchung sofort selbst "bestätigen").
function toBookingResponse(booking: BookingRow): BookingResponse {
  return {
    id: booking.id,
    start: booking.startTime.toISOString(),
    end: booking.endTime.toISOString(),
    offerName: booking.offerName,
    status: booking.status,
  };
}

// Siehe doc/idee-klienten-matching.md: Zeitfenster, in dem eine 'pending'-Buchung
// bestätigt werden muss, bevor sie automatisch verfällt. Offene Frage dort (TTL bei
// sehr kurzfristigen Buchungen kappen) betrifft aktuell nur diese Prüfung, da der
// automatische Verfall-Job (BullMQ) noch nicht Teil dieser Runde ist.
const CONFIRMATION_TTL_MINUTES = 30;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

@Injectable()
export class BookingsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly organizationService: OrganizationService,
  ) {}

  async create(slug: string, offerId: string, dto: CreateBookingDto) {
    const org = await this.organizationService.findBySlug(slug);
    const requestedStart = new Date(dto.start);

    return this.db.transaction(async (tx) => {
      // Sperrt die Organisation-Zeile für die Dauer der Transaktion: eine zweite,
      // gleichzeitige Buchungserstellung für dieselbe Organisation wartet hier, bis
      // diese Transaktion committet (oder zurückgerollt wird). Dadurch sieht die
      // anschließende Slot-Neuberechnung (auf einer separaten DB-Verbindung, siehe
      // OrganizationService.resolveOfferAndSlots) garantiert den Stand nach der
      // vorherigen Buchung – kein Race zwischen zwei unterschiedlichen, aber
      // überlappenden Angeboten möglich.
      await tx.select({ id: organization.id }).from(organization).where(eq(organization.id, org.id)).for('update');

      const { offer, slots } = await this.organizationService.resolveOfferAndSlots(org, offerId);
      const matchedSlot = slots.find((s) => s.start.getTime() === requestedStart.getTime());
      if (!matchedSlot) {
        throw new ConflictException('This time slot is no longer available');
      }

      try {
        const [booking] = await tx
          .insert(bookings)
          .values({
            organizationId: org.id,
            offerId,
            offerName: offer.name,
            durationMinutes: offer.durationMinutes,
            startTime: matchedSlot.start,
            endTime: matchedSlot.end,
            clientName: dto.clientName,
            clientEmail: dto.clientEmail,
            clientPhone: dto.clientPhone ?? null,
            clientNote: dto.clientNote ?? null,
            clientAccessToken: randomBytes(32).toString('hex'),
          })
          .returning();

        return toBookingResponse(booking);
      } catch (err) {
        // Letzte Absicherung durch den partiellen Unique-Index (bookings_org_start_active_unique) –
        // sollte dank des Row-Locks oben im Normalfall nicht erreicht werden.
        if ((err as { code?: string }).code === '23505') {
          throw new ConflictException('This time slot is no longer available');
        }
        throw err;
      }
    });
  }

  async confirm(bookingId: string, token: string) {
    // Die Verfall-Markierung unten muss auch dann persistiert werden, wenn confirm()
    // mit einem Fehler endet – ein throw innerhalb von db.transaction() würde die
    // gesamte Transaktion inkl. dieses Updates zurückrollen. Deshalb hier erst
    // committen (Rückgabewert statt throw für den Verfall-Fall) und danach außerhalb
    // der Transaktion die ConflictException werfen.
    const result = await this.db.transaction(async (tx) => {
      const [booking] = await tx.select().from(bookings).where(eq(bookings.id, bookingId)).for('update');
      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      const providedToken = Buffer.from(token, 'utf8');
      const storedToken = Buffer.from(booking.clientAccessToken, 'utf8');
      const tokenMatches = providedToken.length === storedToken.length && timingSafeEqual(providedToken, storedToken);
      if (!tokenMatches) {
        throw new UnauthorizedException('Invalid confirmation token');
      }

      if (booking.status !== 'pending') {
        throw new ConflictException('Booking is not awaiting confirmation');
      }

      if (Date.now() - booking.createdAt.getTime() > CONFIRMATION_TTL_MINUTES * 60_000) {
        await tx.update(bookings).set({ status: 'cancelled' }).where(eq(bookings.id, bookingId));
        return { expired: true as const };
      }

      const normalizedEmail = normalizeEmail(booking.clientEmail);
      let [client] = await tx
        .select()
        .from(clients)
        .where(and(eq(clients.organizationId, booking.organizationId), eq(clients.email, normalizedEmail)))
        .limit(1);

      if (!client) {
        [client] = await tx
          .insert(clients)
          .values({ organizationId: booking.organizationId, name: booking.clientName, email: normalizedEmail })
          .returning();
      }

      const [confirmed] = await tx
        .update(bookings)
        .set({ status: 'confirmed', confirmedAt: new Date(), clientId: client.id })
        .where(eq(bookings.id, bookingId))
        .returning();

      return { expired: false as const, booking: confirmed };
    });

    if (result.expired) {
      throw new ConflictException('Confirmation window has expired');
    }
    return toBookingResponse(result.booking);
  }
}
