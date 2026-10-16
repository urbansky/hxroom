import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { and, eq, inArray, lt, sql } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../db/db.module';
import { bookings } from '../db/schema';
import { S3Service } from '../storage/s3.service';
import { TEST_SESSION_RETENTION_HOURS } from './booking.constants';

/**
 * Löscht Probe-Sitzungen (Herkunft 'test', Schritt 6a) TEST_SESSION_RETENTION_HOURS nach
 * ihrem Ende – samt Notizen, Chat und geteilten Dateien. Es sind Testdaten des Coachs, und
 * ohne Aufräumen füllten sie Kalender und Agenda.
 *
 * Notizen, Chatnachrichten und Dateieinträge fallen per Cascade mit dem Termin, die Objekte
 * im Speicher ({org}/sessions/{booking}/) danach einzeln. Der Merker für die Checkliste
 * (booking_page.test_session_at) bleibt.
 */
@Injectable()
export class TestSessionCleanupService {
  private readonly logger = new Logger(TestSessionCleanupService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly s3: S3Service,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async deleteExpiredTestSessions(): Promise<number> {
    try {
      const expired = await this.db
        .select({ id: bookings.id, organizationId: bookings.organizationId })
        .from(bookings)
        .where(and(
          eq(bookings.origin, 'test'),
          // Grenze in SQL: so zählt die DB-Zeit, nicht die des App-Containers.
          lt(bookings.endTime, sql`now() - make_interval(hours => ${TEST_SESSION_RETENTION_HOURS})`),
        ));
      if (expired.length === 0) return 0;

      await this.db.delete(bookings).where(inArray(bookings.id, expired.map((b) => b.id)));

      for (const booking of expired) {
        try {
          await this.s3.deletePrefix(`${booking.organizationId}/sessions/${booking.id}/`);
        } catch (err) {
          this.logger.error(`Failed to delete files of test session ${booking.id}`, err instanceof Error ? err.stack : err);
        }
      }

      this.logger.log(`Deleted ${expired.length} expired test session(s)`);
      return expired.length;
    } catch (err) {
      // Ein Fehler hier darf den Scheduler nicht abwürgen; der nächste Lauf holt es nach.
      this.logger.error('Failed to delete expired test sessions', err instanceof Error ? err.stack : err);
      return 0;
    }
  }
}
