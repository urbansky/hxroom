import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { and, eq, isNull, ne, sql } from 'drizzle-orm';
import { CALL_OPENS_MINUTES_BEFORE_START } from '@hxroom/shared';
import { DRIZZLE, type DrizzleDb } from '../db/db.module';
import { bookings } from '../db/schema';
import { MailService } from '../mail/mail.service';
import { renderBookingReminderEmail } from '../mail/templates/client/booking-reminder';
import { OrganizationService } from '../organization/organization.service';
import { formatTimeLabel, relativeDayLabel, toAppointmentInfo } from './booking-formatting';
import { REMINDER_KINDS, REMINDER_WINDOWS, type ReminderKind } from './booking-reminders';
import { buildCallUrl, buildCancelUrl } from './booking-urls';

const sentAtColumn = {
  '24h': bookings.reminder24hSentAt,
  '1h': bookings.reminder1hSentAt,
} as const;

const sentAtField = {
  '24h': 'reminder24hSentAt',
  '1h': 'reminder1hSentAt',
} as const;

/**
 * Erinnerungsmails an den Klienten, 24 Stunden und 1 Stunde vor dem Termin.
 *
 * Ein Lauf alle 5 Minuten statt eines Jobs je Buchung – wie BookingExpiryService, solange kein
 * Redis im Betrieb ist. Die Regel, wann eine Erinnerung fällig ist, steht lesbar und getestet in
 * booking-reminders.ts (isReminderDue); hier steht sie als SQL.
 *
 * Gegen doppelten Versand beansprucht der Lauf die fälligen Erinnerungen zuerst in einem einzigen
 * UPDATE … RETURNING und verschickt erst dann. Scheitert der Versand, gibt er den Vermerk wieder
 * frei, und der nächste Lauf versucht es erneut – solange das Fenster offen ist.
 *
 * Logs enthalten nur Buchungs-IDs (technisches-konzept.md §17).
 */
@Injectable()
export class BookingReminderService {
  private readonly logger = new Logger(BookingReminderService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly organizationService: OrganizationService,
    private readonly mailService: MailService,
    private readonly config: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async sendDueReminders(): Promise<void> {
    for (const kind of REMINDER_KINDS) {
      try {
        const claimed = await this.claim(kind);
        for (const booking of claimed) await this.send(kind, booking);
      } catch (err) {
        this.logger.error(`Erinnerungen (${kind}) fehlgeschlagen`, err instanceof Error ? err.stack : err);
      }
    }
  }

  /** Markiert alle jetzt fälligen Erinnerungen `kind` als versendet und gibt die Buchungen zurück. */
  private claim(kind: ReminderKind) {
    const { dueMinutesBefore, latestMinutesBefore } = REMINDER_WINDOWS[kind];
    const column = sentAtColumn[kind];
    // Grenzen in SQL statt in JS: So zählt die Zeit der Datenbank, nicht die des Containers.
    return this.db
      .update(bookings)
      .set({ [sentAtField[kind]]: sql`now()` })
      .where(
        and(
          eq(bookings.status, 'confirmed'),
          ne(bookings.origin, 'ad_hoc'),
          isNull(column),
          sql`${bookings.startTime} <= now() + make_interval(mins => ${dueMinutesBefore})`,
          sql`${bookings.startTime} >= now() + make_interval(mins => ${latestMinutesBefore})`,
          // Erst nach dem Fälligkeitszeitpunkt bestätigt: Die Bestätigung mit Link ist gerade erst
          // gekommen, eine Erinnerung wäre doppelt.
          sql`coalesce(${bookings.confirmedAt}, ${bookings.createdAt}) < ${bookings.startTime} - make_interval(mins => ${dueMinutesBefore})`,
        ),
      )
      .returning({
        id: bookings.id,
        organizationId: bookings.organizationId,
        offerId: bookings.offerId,
        offerName: bookings.offerName,
        durationMinutes: bookings.durationMinutes,
        startTime: bookings.startTime,
        endTime: bookings.endTime,
        clientName: bookings.clientName,
        clientEmail: bookings.clientEmail,
        clientAccessToken: bookings.clientAccessToken,
      });
  }

  private async send(kind: ReminderKind, booking: Awaited<ReturnType<BookingReminderService['claim']>>[number]) {
    try {
      const org = await this.organizationService.findById(booking.organizationId);
      const coach = await this.organizationService.findOwnerContact(booking.organizationId);
      const coachName = coach?.name ?? org.name;
      const startTimeLabel = formatTimeLabel(booking.startTime);
      const dayLabel = relativeDayLabel(booking.startTime, new Date());

      await this.mailService.send({
        to: { email: booking.clientEmail, name: booking.clientName },
        subject: kind === '24h'
          ? `Erinnerung: Dein Termin ${dayLabel} um ${startTimeLabel} Uhr – HxRoom`
          : `Gleich geht's los: Dein Termin um ${startTimeLabel} Uhr – HxRoom`,
        // Antworten gehen an den Coach – er ist für den Termin zuständig, nicht der Betreiber.
        replyTo: coach ? { email: coach.email, name: coach.name } : undefined,
        htmlContent: await renderBookingReminderEmail({
          kind,
          clientName: booking.clientName,
          coachName,
          appointment: toAppointmentInfo(booking),
          dayLabel,
          startTimeLabel,
          opensTimeLabel: formatTimeLabel(new Date(booking.startTime.getTime() - CALL_OPENS_MINUTES_BEFORE_START * 60_000)),
          callUrl: org.slug ? buildCallUrl(this.config, org.slug, booking.id, booking.clientAccessToken) : null,
          cancelUrl: org.slug ? buildCancelUrl(this.config, org.slug, booking.id, booking.clientAccessToken) : null,
        }),
      });
      this.logger.log(`Erinnerung ${kind} gesendet für Buchung ${booking.id}`);
    } catch (err) {
      this.logger.error(`Erinnerung ${kind} für Buchung ${booking.id} nicht gesendet, nächster Lauf versucht es erneut`, err instanceof Error ? err.stack : err);
      await this.db
        .update(bookings)
        .set({ [sentAtField[kind]]: null })
        .where(eq(bookings.id, booking.id));
    }
  }
}
