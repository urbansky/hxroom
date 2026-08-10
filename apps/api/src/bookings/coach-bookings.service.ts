import { ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, asc, eq, gte, lte, type SQL } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../db/db.module';
import { bookings } from '../db/schema';
import { OrganizationService } from '../organization/organization.service';
import { MailService } from '../mail/mail.service';
import { buildBookingIcs } from '../mail/ics';
import { renderBookingCancelledEmail } from '../mail/templates/client/booking-cancelled';
import { formatDayTimeLabel } from './booking-formatting';
import { buildBookingPageUrl } from './booking-urls';
import type { CancelBookingDto, CoachBookingResponse, ListCoachBookingsQuery } from '@hxroom/shared';

// Explizite Spaltenliste statt select(): clientAccessToken darf die API nie verlassen,
// und ein select() ohne Argument würde ihn bei jedem Schema-Wechsel stillschweigend
// wieder mitnehmen.
const coachBookingColumns = {
  id:              bookings.id,
  startTime:       bookings.startTime,
  endTime:         bookings.endTime,
  offerId:         bookings.offerId,
  offerName:       bookings.offerName,
  durationMinutes: bookings.durationMinutes,
  status:          bookings.status,
  clientId:        bookings.clientId,
  clientName:      bookings.clientName,
  clientEmail:     bookings.clientEmail,
  clientPhone:     bookings.clientPhone,
  clientNote:      bookings.clientNote,
  confirmedAt:     bookings.confirmedAt,
  createdAt:       bookings.createdAt,
};

interface CoachBookingRow {
  id: string;
  startTime: Date;
  endTime: Date;
  offerId: string | null;
  offerName: string;
  durationMinutes: number;
  status: CoachBookingResponse['status'];
  clientId: string | null;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  clientNote: string | null;
  confirmedAt: Date | null;
  createdAt: Date;
}

function toCoachBookingResponse(row: CoachBookingRow): CoachBookingResponse {
  return {
    id: row.id,
    start: row.startTime.toISOString(),
    end: row.endTime.toISOString(),
    offerId: row.offerId,
    offerName: row.offerName,
    durationMinutes: row.durationMinutes,
    status: row.status,
    clientId: row.clientId,
    clientName: row.clientName,
    clientEmail: row.clientEmail,
    clientPhone: row.clientPhone,
    clientNote: row.clientNote,
    confirmedAt: row.confirmedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Coach-seitiger Zugriff auf die eigenen Buchungen (Kalender im Backoffice).
 * Bewusst getrennt von BookingsService, der den Klienten-Lifecycle (Buchen, Bestätigen)
 * abbildet – hier geht es ausschließlich um die authentifizierte Sicht des Coachs.
 */
@Injectable()
export class CoachBookingsService {
  private readonly logger = new Logger(CoachBookingsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly organizationService: OrganizationService,
    private readonly mailService: MailService,
    private readonly config: ConfigService,
  ) {}

  async list(organizationId: string, query: ListCoachBookingsQuery): Promise<CoachBookingResponse[]> {
    const filters: SQL[] = [eq(bookings.organizationId, organizationId)];
    if (query.from) filters.push(gte(bookings.startTime, new Date(query.from)));
    if (query.to) filters.push(lte(bookings.startTime, new Date(query.to)));
    if (query.status) filters.push(eq(bookings.status, query.status));

    const rows = await this.db
      .select(coachBookingColumns)
      .from(bookings)
      .where(and(...filters))
      .orderBy(asc(bookings.startTime))
      .limit(query.limit);

    return rows.map(toCoachBookingResponse);
  }

  async cancel(organizationId: string, bookingId: string, dto: CancelBookingDto): Promise<CoachBookingResponse> {
    const booking = await this.findOwn(organizationId, bookingId);

    if (booking.status === 'cancelled') {
      throw new ConflictException('Booking is already cancelled');
    }

    const [cancelled] = await this.db
      .update(bookings)
      .set({ status: 'cancelled' })
      .where(eq(bookings.id, bookingId))
      .returning(coachBookingColumns);

    // Wie beim übrigen Mailversand: nach dem Update, in try/catch. Die Absage steht
    // bereits in der DB und der Slot ist frei – ein Mail-Fehler darf daran nichts ändern.
    try {
      await this.sendCancellationMail(organizationId, cancelled, dto.reason);
    } catch (err) {
      this.logger.error(`Failed to send cancellation email for booking ${bookingId}`, err instanceof Error ? err.stack : err);
    }

    return toCoachBookingResponse(cancelled);
  }

  /** iCalendar-Datei für einen einzelnen Termin – zum Import in den Kalender des Coachs. */
  async buildIcs(organizationId: string, bookingId: string): Promise<string> {
    const booking = await this.findOwn(organizationId, bookingId);
    const coach = await this.organizationService.findOwnerContact(organizationId);

    return buildBookingIcs({
      uid: booking.id,
      start: booking.startTime,
      end: booking.endTime,
      summary: `${booking.offerName} mit ${booking.clientName}`,
      organizer: coach ? { name: coach.name, email: coach.email } : undefined,
      attendee: { name: booking.clientName, email: booking.clientEmail },
      description: booking.clientNote ?? undefined,
    });
  }

  // Ownership-Prüfung über die organizationId: eine fremde Buchung ist für diesen Coach
  // schlicht nicht vorhanden – 404 statt 403, damit die Existenz nicht durchsickert.
  private async findOwn(organizationId: string, bookingId: string): Promise<CoachBookingRow> {
    const [booking] = await this.db
      .select(coachBookingColumns)
      .from(bookings)
      .where(and(eq(bookings.id, bookingId), eq(bookings.organizationId, organizationId)))
      .limit(1);

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  private async sendCancellationMail(organizationId: string, booking: CoachBookingRow, reason?: string): Promise<void> {
    const org = await this.organizationService.findById(organizationId);
    if (!org.slug) {
      this.logger.warn(`Organization ${organizationId} has no slug – skipped cancellation email for booking ${booking.id}`);
      return;
    }

    const coach = await this.organizationService.findOwnerContact(organizationId);
    const coachDisplayName = coach?.name ?? org.name;

    await this.mailService.send({
      to: { email: booking.clientEmail, name: booking.clientName },
      subject: 'Dein Termin wurde abgesagt – HxRoom',
      replyTo: coach ? { email: coach.email, name: coach.name } : undefined,
      htmlContent: await renderBookingCancelledEmail({
        clientName: booking.clientName,
        coachName: coachDisplayName,
        offerName: booking.offerName,
        dayTimeLabel: formatDayTimeLabel(booking),
        reason: reason ?? null,
        bookingPageUrl: buildBookingPageUrl(this.config, org.slug),
      }),
    });
  }
}
