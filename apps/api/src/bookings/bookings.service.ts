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
import { renderBookingCancelledEmail } from '../mail/templates/client/booking-cancelled';
import { renderBookingNotificationEmail } from '../mail/templates/coach/booking-notification';
import { renderBookingCancelledByClientEmail } from '../mail/templates/coach/booking-cancelled-by-client';
import { isUniqueViolation } from '../common/pg-errors';
import { normalizeEmail } from '../clients/normalize-email';
import { CONFIRMATION_TTL_MINUTES, canClientCancel, isExpiredPending } from './booking.constants';
import { formatDayLabel, formatDayTimeLabel } from './booking-formatting';
import { buildBookingPageUrl, buildCancelUrl, buildConfirmUrl } from './booking-urls';
import type { CreateBookingDto, BookingResponse, ClientBookingView } from '@hxroom/shared';
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

// Konstantzeit-Vergleich für den clientAccessToken: er ist der einzige Zugangsschutz für
// Bestätigung und Absage, ein früh abbrechender Vergleich wäre hier angreifbar.
// timingSafeEqual verlangt gleiche Länge, deshalb der vorgeschaltete Längenvergleich.
function tokenMatches(provided: string, stored: string): boolean {
  const providedBuffer = Buffer.from(provided, 'utf8');
  const storedBuffer = Buffer.from(stored, 'utf8');
  return providedBuffer.length === storedBuffer.length && timingSafeEqual(providedBuffer, storedBuffer);
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
        if (isUniqueViolation(err)) {
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

      if (!tokenMatches(token, booking.clientAccessToken)) {
        throw new UnauthorizedException('Invalid confirmation token');
      }

      if (booking.status !== 'pending') {
        throw new ConflictException('Booking is not awaiting confirmation');
      }

      // Zweite Verteidigungslinie neben dem Verfall-Cron: fängt die Buchung ab, deren
      // TTL zwischen zwei Cron-Läufen abgelaufen ist.
      if (isExpiredPending(booking.createdAt, new Date())) {
        await tx
          .update(bookings)
          .set({ status: 'cancelled', cancelledAt: new Date(), cancelledBy: 'system' })
          .where(eq(bookings.id, bookingId));
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

  /**
   * Token-authentifizierte Sicht des Klienten auf seine eigene Buchung. Sie steht vor der
   * Absage: der Klient soll sehen, welchen Termin er trifft, bevor er ihn storniert –
   * gerade wenn er mehrere offene Termine beim selben Coach hat.
   */
  async findForClient(bookingId: string, token: string): Promise<ClientBookingView> {
    const [booking] = await this.db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (!tokenMatches(token, booking.clientAccessToken)) {
      throw new UnauthorizedException('Invalid access token');
    }

    const org = await this.organizationService.findById(booking.organizationId);
    const coach = await this.organizationService.findOwnerContact(booking.organizationId);

    return {
      id: booking.id,
      start: booking.startTime.toISOString(),
      end: booking.endTime.toISOString(),
      offerName: booking.offerName,
      coachName: coach?.name ?? org.name,
      status: booking.status,
      cancellable: canClientCancel(booking, new Date()),
    };
  }

  /**
   * Absage durch den Klienten über den Link aus der Bestätigungsmail
   * (doc/funktionen/backoffice-coach.md 2.06). Der Slot wird dadurch sofort wieder
   * buchbar – dafür sorgt der partielle Unique-Index, der 'cancelled' ausnimmt.
   *
   * Der clientAccessToken wird bewusst nicht invalidiert: derselbe Token soll später den
   * Warteraum öffnen (doc/technisches-konzept.md §8), und ein wiederholter Aufruf des
   * Links soll dem Klienten „bereits abgesagt" zeigen statt „ungültiger Link".
   */
  async cancelByClient(bookingId: string, token: string, reason?: string): Promise<BookingResponse> {
    const cancelled = await this.db.transaction(async (tx) => {
      const [booking] = await tx.select().from(bookings).where(eq(bookings.id, bookingId)).for('update');
      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      if (!tokenMatches(token, booking.clientAccessToken)) {
        throw new UnauthorizedException('Invalid access token');
      }

      // Zwei getrennte Meldungen: „schon abgesagt" ist für den Klienten die Entwarnung,
      // „nicht mehr möglich" der Hinweis, sich an den Coach zu wenden.
      if (booking.status === 'cancelled') {
        throw new ConflictException('Booking is already cancelled');
      }

      if (!canClientCancel(booking, new Date())) {
        throw new ConflictException('Booking can no longer be cancelled');
      }

      const [updated] = await tx
        .update(bookings)
        .set({
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelledBy: 'client',
          cancellationReason: reason ?? null,
        })
        .where(eq(bookings.id, bookingId))
        .returning();

      return updated;
    });

    // Nach dem Commit: die Absage steht und der Slot ist frei – daran darf ein Ausfall
    // des Mail-Providers nichts ändern, der Klient hat seine Erfolgsseite verdient.
    try {
      await this.sendClientCancellationMails(cancelled, reason);
    } catch (err) {
      this.logger.error(`Failed to prepare cancellation mails for booking ${cancelled.id}`, err instanceof Error ? err.stack : err);
    }

    return toBookingResponse(cancelled);
  }

  // Quittung an den Klienten und Benachrichtigung an den Coach. Getrennte try/catch wie
  // bei der Bestätigung: die eine Mail darf nicht an der anderen scheitern. Für den Coach
  // ist seine Mail der einzige aktive Hinweis auf die neue Lücke im Kalender.
  private async sendClientCancellationMails(booking: BookingRow, reason?: string): Promise<void> {
    const org = await this.organizationService.findById(booking.organizationId);
    const coach = await this.organizationService.findOwnerContact(booking.organizationId);

    const dayTimeLabel = formatDayTimeLabel(booking);
    const coachDisplayName = coach?.name ?? org.name;

    try {
      await this.mailService.send({
        to: { email: booking.clientEmail, name: booking.clientName },
        subject: 'Dein Termin wurde abgesagt – HxRoom',
        replyTo: coach ? { email: coach.email, name: coach.name } : undefined,
        htmlContent: await renderBookingCancelledEmail({
          clientName: booking.clientName,
          coachName: coachDisplayName,
          offerName: booking.offerName,
          dayTimeLabel,
          cancelledBy: 'client',
          reason: reason ?? null,
          bookingPageUrl: org.slug ? buildBookingPageUrl(this.config, org.slug) : null,
        }),
      });
    } catch (err) {
      this.logger.error(`Failed to send cancellation receipt for booking ${booking.id}`, err instanceof Error ? err.stack : err);
    }

    if (!coach) {
      this.logger.warn(`Organization ${org.id} has no owner member – skipped coach cancellation notice for booking ${booking.id}`);
      return;
    }

    try {
      await this.mailService.send({
        to: { email: coach.email, name: coach.name },
        subject: `Absage: ${booking.clientName} am ${formatDayLabel(booking)}`,
        replyTo: { email: booking.clientEmail, name: booking.clientName },
        htmlContent: await renderBookingCancelledByClientEmail({
          coachName: coach.name,
          clientName: booking.clientName,
          clientEmail: booking.clientEmail,
          offerName: booking.offerName,
          dayTimeLabel,
          reason: reason ?? null,
          bookingsUrl: `${this.config.getOrThrow<string>('COACH_APP_URL').replace(/\/$/, '')}/bookings`,
        }),
      });
    } catch (err) {
      this.logger.error(`Failed to send coach cancellation notice for booking ${booking.id}`, err instanceof Error ? err.stack : err);
    }
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
          cancelUrl: org.slug ? buildCancelUrl(this.config, org.slug, booking.id, booking.clientAccessToken) : null,
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
