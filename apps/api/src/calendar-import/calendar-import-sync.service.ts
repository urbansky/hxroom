import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { and, asc, eq, gte, isNull, lt, or, sql } from 'drizzle-orm';
import type { CalendarImportError } from '@hxroom/shared';
import { DRIZZLE, type DrizzleDb } from '../db/db.module';
import { availabilitySettings, bookings, calendarBusyTimes, calendarImports, member, user } from '../db/schema';
import { MailService } from '../mail/mail.service';
import { renderCalendarImportFailingEmail } from '../mail/templates/coach/calendar-import-failing';
import { DEFAULT_BOOKING_WINDOW_WEEKS, type DateRange } from '../availability/slot-calculation';
import { CalendarFetchError, fetchIcal, normalizeCalendarUrl } from './fetch-ical';
import { parseBusyTimes } from './parse-busy';
import { decryptUrl, parseUrlKey } from './url-crypto';

// Abgleich externer Kalender (doc/produkt/funktionen/kalenderabgleich.md §3.3/§3.4). Alle Anlässe –
// Lauf, Aktivität in der Coach-App, Knopf, Buchungsseite, Buchung – laufen über syncImport();
// sie unterscheiden sich nur im Mindestabstand seit dem letzten Versuch.

export type SyncTrigger = 'schedule' | 'activity' | 'manual' | 'booking_page';

const MINUTE = 60_000;
export const SYNC_MIN_AGE_MS: Record<SyncTrigger, number> = {
  schedule: 15 * MINUTE,
  activity: 5 * MINUTE,
  manual: 30_000,
  booking_page: 10 * MINUTE,
};
/** Eine Sperre, die so alt ist, stammt von einem abgebrochenen Abruf und gilt nicht mehr. */
const STALE_LOCK_MS = 2 * MINUTE;
/** Ab so langer Fehlerdauer bekommt der Coach eine Mail. */
const FAILURE_MAIL_AFTER_MS = 6 * 60 * MINUTE;
const SCHEDULE_CONCURRENCY = 3;
const SCHEDULE_BATCH = 200;

type ImportRow = typeof calendarImports.$inferSelect;

export interface FetchedBusy {
  busy: DateRange[];
  truncated: boolean;
}

@Injectable()
export class CalendarImportSyncService {
  private readonly logger = new Logger(CalendarImportSyncService.name);
  private readonly urlKey: Buffer;
  private readonly allowPrivate: boolean;

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {
    // Ohne Schlüssel startet die API bewusst nicht: Ein fehlender Eintrag in der .env soll beim
    // Deploy auffallen, nicht erst, wenn ein Coach einen Kalender hinzufügt.
    this.urlKey = parseUrlKey(this.config.getOrThrow<string>('CALENDAR_URL_KEY'));
    this.allowPrivate = this.config.get<string>('CALENDAR_IMPORT_ALLOW_PRIVATE') === 'true';
  }

  get key(): Buffer {
    return this.urlKey;
  }

  /** webcal → https; wirft CalendarFetchError('invalid_url'). In der Entwicklung auch http. */
  normalizeUrl(url: string): string {
    return normalizeCalendarUrl(url, this.allowPrivate).toString();
  }

  /** Abruf und Auswertung ohne Speichern – auch für das Hinzufügen eines neuen Kalenders. */
  async fetchBusy(organizationId: string, url: string, blockAllDay: boolean): Promise<FetchedBusy> {
    const text = await fetchIcal(url, { allowPrivate: this.allowPrivate });
    const window = await this.window(organizationId);
    const [ownUids, ownEmails] = await Promise.all([this.ownUids(organizationId, window), this.ownEmails(organizationId)]);
    try {
      return parseBusyTimes(text, { window, blockAllDay, ownUids, ownEmails });
    } catch {
      // ical.js wirft bei kaputten Dateien – für den Coach ist das „keine Kalenderdatei“.
      throw new CalendarFetchError('not_ical');
    }
  }

  /** Ersetzt die belegten Zeiten eines Kalenders – in einer Transaktion, nie halb. */
  async replaceBusyTimes(tx: Pick<DrizzleDb, 'delete' | 'insert'>, importId: string, organizationId: string, busy: DateRange[]) {
    await tx.delete(calendarBusyTimes).where(eq(calendarBusyTimes.calendarImportId, importId));
    for (let i = 0; i < busy.length; i += 1000) {
      await tx.insert(calendarBusyTimes).values(
        busy.slice(i, i + 1000).map((range) => ({ calendarImportId: importId, organizationId, startTime: range.start, endTime: range.end })),
      );
    }
  }

  /** Alle aktiven Kalender einer Organisation, sofern ihr letzter Versuch älter ist als der Anlass verlangt. */
  async syncOrganization(organizationId: string, trigger: SyncTrigger): Promise<void> {
    const rows = await this.db
      .select()
      .from(calendarImports)
      .where(and(eq(calendarImports.organizationId, organizationId), eq(calendarImports.isActive, true)));
    await Promise.all(rows.map((row) => this.syncImport(row, trigger)));
  }

  /**
   * Für die Buchung: abgleichen, wenn der Stand älter ist als der Anlass verlangt, aber
   * höchstens `timeoutMs` warten. Danach gilt der letzte Stand – der Abruf läuft weiter.
   */
  async ensureFresh(organizationId: string, timeoutMs: number): Promise<void> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<void>((resolve) => { timer = setTimeout(resolve, timeoutMs); });
    try {
      await Promise.race([this.syncOrganization(organizationId, 'booking_page').catch(() => undefined), timeout]);
    } finally {
      clearTimeout(timer);
    }
  }

  /** Für die Slot-Anzeige: im Hintergrund abgleichen, die Antwort wartet nicht. */
  refreshInBackground(organizationId: string): void {
    this.syncOrganization(organizationId, 'booking_page').catch((err) => {
      this.logger.error(`Background calendar sync failed for organization ${organizationId}`, err instanceof Error ? err.stack : err);
    });
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async runSchedule(): Promise<void> {
    const due = new Date(Date.now() - SYNC_MIN_AGE_MS.schedule);
    const rows = await this.db
      .select()
      .from(calendarImports)
      .where(and(eq(calendarImports.isActive, true), or(isNull(calendarImports.lastAttemptAt), lt(calendarImports.lastAttemptAt, due))))
      .orderBy(asc(calendarImports.lastAttemptAt))
      .limit(SCHEDULE_BATCH);

    for (let i = 0; i < rows.length; i += SCHEDULE_CONCURRENCY) {
      await Promise.all(rows.slice(i, i + SCHEDULE_CONCURRENCY).map((row) => this.syncImport(row, 'schedule')));
    }
  }

  /**
   * Ein Kalender. Beansprucht ihn über `syncing_since` – nur wer die Zeile bekommt, ruft ab.
   * Ein Fehler lässt die letzten belegten Zeiten stehen: Würden sie verworfen, wären auf einen
   * Schlag alle privaten Termine des Coachs buchbar.
   */
  async syncImport(row: ImportRow, trigger: SyncTrigger): Promise<void> {
    const now = new Date();
    if (row.lastAttemptAt && now.getTime() - row.lastAttemptAt.getTime() < SYNC_MIN_AGE_MS[trigger]) return;

    const [claimed] = await this.db
      .update(calendarImports)
      .set({ syncingSince: now })
      .where(and(
        eq(calendarImports.id, row.id),
        eq(calendarImports.isActive, true),
        or(isNull(calendarImports.syncingSince), lt(calendarImports.syncingSince, new Date(now.getTime() - STALE_LOCK_MS))),
        // Ein paralleler Anlass könnte gerade fertig geworden sein
        or(isNull(calendarImports.lastAttemptAt), lt(calendarImports.lastAttemptAt, new Date(now.getTime() - SYNC_MIN_AGE_MS[trigger]))),
      ))
      .returning();
    if (!claimed) return;

    try {
      const { busy, truncated } = await this.fetchBusy(claimed.organizationId, decryptUrl(claimed.urlEncrypted, this.urlKey), claimed.blockAllDay);
      await this.db.transaction(async (tx) => {
        await this.replaceBusyTimes(tx, claimed.id, claimed.organizationId, busy);
        await tx.update(calendarImports).set({
          syncingSince: null,
          lastAttemptAt: now,
          lastSuccessAt: now,
          lastError: null,
          failingSince: null,
          failureMailSentAt: null,
        }).where(eq(calendarImports.id, claimed.id));
      });
      if (truncated) this.logger.warn(`Calendar import ${claimed.id} truncated to the occurrence limit`);
    } catch (err) {
      const code: CalendarImportError = err instanceof CalendarFetchError ? err.code : 'unreachable';
      if (!(err instanceof CalendarFetchError)) {
        this.logger.error(`Calendar import ${claimed.id} failed unexpectedly`, err instanceof Error ? err.stack : err);
      }
      const failingSince = claimed.failingSince ?? now;
      await this.db.update(calendarImports).set({
        syncingSince: null,
        lastAttemptAt: now,
        lastError: code,
        failingSince,
      }).where(eq(calendarImports.id, claimed.id));
      this.logger.log('Calendar import failed', { calendarImportId: claimed.id, code, trigger });

      if (!claimed.failureMailSentAt && now.getTime() - failingSince.getTime() >= FAILURE_MAIL_AFTER_MS) {
        await this.sendFailureMail(claimed, code).catch((mailErr) => {
          this.logger.error(`Failure mail for calendar import ${claimed.id} not sent`, mailErr instanceof Error ? mailErr.stack : mailErr);
        });
      }
    }
  }

  private async sendFailureMail(row: ImportRow, code: CalendarImportError): Promise<void> {
    const [owner] = await this.members(row.organizationId);
    if (!owner) return;
    await this.mail.send({
      kind: 'calendar-import-failing',
      to: { email: owner.email, name: owner.name },
      subject: `Dein Kalender „${row.name}“ lässt sich nicht mehr abgleichen – HxRoom`,
      htmlContent: await renderCalendarImportFailingEmail({
        name: owner.name,
        calendarName: row.name,
        reason: code,
        lastSuccessAt: row.lastSuccessAt,
        settingsUrl: `${this.config.getOrThrow<string>('COACH_APP_URL').replace(/\/$/, '')}/bookings/availability?tab=calendar`,
      }),
    });
    await this.db.update(calendarImports).set({ failureMailSentAt: new Date() }).where(eq(calendarImports.id, row.id));
  }

  /** Von gestern bis zum Ende des Buchungsfensters plus eine Woche. */
  private async window(organizationId: string): Promise<DateRange> {
    const [settings] = await this.db
      .select({ bookingWindowWeeks: availabilitySettings.bookingWindowWeeks })
      .from(availabilitySettings)
      .where(eq(availabilitySettings.organizationId, organizationId))
      .limit(1);
    const weeks = (settings?.bookingWindowWeeks ?? DEFAULT_BOOKING_WINDOW_WEEKS) + 1;
    const now = Date.now();
    return { start: new Date(now - 24 * 60 * MINUTE), end: new Date(now + weeks * 7 * 24 * 60 * MINUTE) };
  }

  /** Termine, die HxRoom selbst in Kalender schreibt (Mail-Anhang, Feed), tragen die booking.id als UID. */
  private async ownUids(organizationId: string, window: DateRange): Promise<Set<string>> {
    const rows = await this.db
      .select({ id: bookings.id })
      .from(bookings)
      .where(and(eq(bookings.organizationId, organizationId), gte(bookings.endTime, window.start), lt(bookings.startTime, window.end)));
    return new Set(rows.map((r) => r.id));
  }

  private async ownEmails(organizationId: string): Promise<string[]> {
    return (await this.members(organizationId)).map((m) => m.email.toLowerCase());
  }

  // Inhaber zuerst – an ihn geht die Fehler-Mail (wie OrganizationService.findOwnerContact).
  private members(organizationId: string) {
    return this.db
      .select({ name: user.name, email: user.email })
      .from(member)
      .innerJoin(user, eq(user.id, member.userId))
      .where(eq(member.organizationId, organizationId))
      .orderBy(sql`${member.role} = 'owner' desc`, asc(member.createdAt));
  }
}
