import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { and, eq, lt, sql } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../db/db.module';
import { bookings } from '../db/schema';
import { CONFIRMATION_TTL_MINUTES } from './booking.constants';

/**
 * Storniert 'pending'-Buchungen, deren Bestätigungsfenster abgelaufen ist.
 *
 * Ohne diesen Lauf blockiert eine nie bestätigte Buchung ihren Zeitpunkt dauerhaft:
 * die Slot-Berechnung schließt nur 'cancelled' aus (OrganizationService.resolveOfferAndSlots),
 * und der Lazy-Check in BookingsService.confirm greift nur, wenn der Klient den Link
 * doch noch anklickt – was bei einer verfallenen Buchung gerade nicht passiert.
 *
 * doc/technisches-konzept.md sieht dafür einen BullMQ-Job mit Delay vor. Solange kein
 * Redis im Betrieb ist, erledigt ein periodischer Lauf dasselbe: die Genauigkeit von
 * ±5 Minuten ist bei einer TTL von 30 Minuten unkritisch.
 */
@Injectable()
export class BookingExpiryService {
  private readonly logger = new Logger(BookingExpiryService.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async expireStalePendingBookings(): Promise<void> {
    try {
      const expired = await this.db
        .update(bookings)
        // cancelledBy 'system' hält den Verfall von einer bewussten Absage auseinander –
        // im Backoffice ist das für den Coach ein anderer Vorgang.
        .set({ status: 'cancelled', cancelledAt: new Date(), cancelledBy: 'system' })
        .where(
          and(
            eq(bookings.status, 'pending'),
            // Grenze in SQL statt in JS: so zählt die DB-Zeit, nicht die des App-Containers.
            lt(bookings.createdAt, sql`now() - make_interval(mins => ${CONFIRMATION_TTL_MINUTES})`),
          ),
        )
        .returning({ id: bookings.id });

      // Nur die Anzahl loggen – Buchungen sind personenbezogen (DSGVO).
      if (expired.length > 0) {
        this.logger.log(`Expired ${expired.length} unconfirmed booking(s)`);
      }
    } catch (err) {
      // Ein Fehler hier darf den Scheduler nicht abwürgen; der nächste Lauf holt es nach.
      this.logger.error('Failed to expire unconfirmed bookings', err instanceof Error ? err.stack : err);
    }
  }
}
