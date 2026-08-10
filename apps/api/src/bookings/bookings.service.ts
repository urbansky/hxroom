import { ConflictException, Inject, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, timingSafeEqual } from 'crypto';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../db/db.module';
import { organization, bookings, clients } from '../db/schema';
import { OrganizationService } from '../organization/organization.service';
import { MailService } from '../mail/mail.service';
import { buildBookingIcs } from '../mail/ics';
import { renderBookingConfirmationEmail } from '../mail/templates/client/booking-confirmation';
import { renderBookingConfirmedEmail } from '../mail/templates/client/booking-confirmed';
import { renderBookingNotificationEmail } from '../mail/templates/coach/booking-notification';
import { CONFIRMATION_TTL_MINUTES, isExpiredPending } from './booking.constants';
import { formatDayLabel, formatDayTimeLabel } from './booking-formatting';
import { buildConfirmUrl } from './booking-urls';
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

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly organizationService: OrganizationService,
    private readonly mailService: MailService,
    private readonly config: ConfigService,
  ) {}

  async create(slug: string, offerId: string, dto: CreateBookingDto) {
    const org = await this.organizationService.findBySlug(slug);
    const requestedStart = new Date(dto.start);

    const booking = await this.db.transaction(async (tx) => {
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
        const [inserted] = await tx
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

        return inserted;
      } catch (err) {
        // Letzte Absicherung durch den partiellen Unique-Index (bookings_org_start_active_unique) –
        // sollte dank des Row-Locks oben im Normalfall nicht erreicht werden.
        if ((err as { code?: string }).code === '23505') {
          throw new ConflictException('This time slot is no longer available');
        }
        throw err;
      }
    });

    // Erst nach dem Commit der Transaktion versenden: die Buchung existiert bereits
    // (der Klient sieht im UI die "Termin vorgemerkt"-Ansicht) – ein Mail-Fehler soll
    // den Request nicht als 500 enden lassen, nur geloggt werden.
    if (org.slug) {
      const confirmUrl = buildConfirmUrl(this.config, org.slug, booking.id, booking.clientAccessToken);
      try {
        await this.mailService.send({
          to: { email: booking.clientEmail, name: booking.clientName },
          subject: 'Bitte bestätige deinen Termin – HxRoom',
          htmlContent: await renderBookingConfirmationEmail({
            clientName: booking.clientName,
            offerName: booking.offerName,
            dayTimeLabel: formatDayTimeLabel(booking),
            confirmUrl,
            ttlMinutes: CONFIRMATION_TTL_MINUTES,
          }),
        });
      } catch (err) {
        this.logger.error(`Failed to send booking confirmation email for booking ${booking.id}`, err instanceof Error ? err.stack : err);
      }
    } else {
      this.logger.warn(`Organization ${org.id} has no slug – skipped booking confirmation email for booking ${booking.id}`);
    }

    return toBookingResponse(booking);
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

      // Zweite Verteidigungslinie neben dem Verfall-Cron: fängt die Buchung ab, deren
      // TTL zwischen zwei Cron-Läufen abgelaufen ist.
      if (isExpiredPending(booking.createdAt, new Date())) {
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

    // Äußeres Netz für alles, was vor dem eigentlichen Versand schiefgehen kann
    // (Coach-Lookup, Konfiguration): Der Klient hat bestätigt, das ist der Erfolgsfall.
    try {
      await this.sendBookingConfirmedMails(result.booking);
    } catch (err) {
      this.logger.error(`Failed to prepare confirmation mails for booking ${result.booking.id}`, err instanceof Error ? err.stack : err);
    }

    return toBookingResponse(result.booking);
  }

  // Wird erst nach dem Commit aufgerufen: die Buchung steht bereits fest, ein Ausfall des
  // Mail-Providers (MailService.send wirft) darf die Bestätigung nicht zurückrollen und den
  // Klienten nicht auf eine Fehlerseite schicken. Beide Mails laufen in getrennten
  // try/catch, damit die eine nicht an der anderen scheitert. Logs enthalten laut
  // doc/technisches-konzept.md §17 ausschließlich IDs, keine Namen oder Adressen.
  private async sendBookingConfirmedMails(booking: BookingRow): Promise<void> {
    const org = await this.organizationService.findById(booking.organizationId);
    const coach = await this.organizationService.findOwnerContact(booking.organizationId);

    if (!coach) {
      this.logger.warn(`Organization ${org.id} has no owner member – skipped coach notification for booking ${booking.id}`);
    }

    const dayTimeLabel = formatDayTimeLabel(booking);
    const coachDisplayName = coach?.name ?? org.name;

    const ics = buildBookingIcs({
      uid: booking.id,
      start: booking.startTime,
      end: booking.endTime,
      summary: `${booking.offerName} mit ${coachDisplayName}`,
      organizer: coach ? { name: coach.name, email: coach.email } : undefined,
      attendee: { name: booking.clientName, email: booking.clientEmail },
    });

    try {
      await this.mailService.send({
        to: { email: booking.clientEmail, name: booking.clientName },
        subject: 'Dein Termin ist bestätigt – HxRoom',
        // Antworten des Klienten sollen beim Coach landen, nicht beim Betreiber –
        // inhaltlich zuständig für den Termin ist der Coach.
        replyTo: coach ? { email: coach.email, name: coach.name } : undefined,
        htmlContent: await renderBookingConfirmedEmail({
          clientName: booking.clientName,
          coachName: coachDisplayName,
          offerName: booking.offerName,
          dayTimeLabel,
          durationMinutes: booking.durationMinutes,
        }),
        attachment: [{ name: 'termin.ics', content: Buffer.from(ics, 'utf8').toString('base64') }],
      });
    } catch (err) {
      this.logger.error(`Failed to send booking confirmed email for booking ${booking.id}`, err instanceof Error ? err.stack : err);
    }

    if (!coach) return;

    try {
      await this.mailService.send({
        to: { email: coach.email, name: coach.name },
        subject: `Neue Buchung: ${booking.clientName} am ${formatDayLabel(booking)}`,
        replyTo: { email: booking.clientEmail, name: booking.clientName },
        htmlContent: await renderBookingNotificationEmail({
          coachName: coach.name,
          clientName: booking.clientName,
          clientEmail: booking.clientEmail,
          clientPhone: booking.clientPhone,
          clientNote: booking.clientNote,
          offerName: booking.offerName,
          dayTimeLabel,
          bookingsUrl: `${this.config.getOrThrow<string>('COACH_APP_URL').replace(/\/$/, '')}/bookings`,
        }),
      });
    } catch (err) {
      this.logger.error(`Failed to send coach booking notification for booking ${booking.id}`, err instanceof Error ? err.stack : err);
    }
  }
}
