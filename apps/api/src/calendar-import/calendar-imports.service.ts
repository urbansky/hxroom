import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, count, eq, gt, lt } from 'drizzle-orm';
import {
  CALENDAR_IMPORT_MAX_COUNT,
  type CalendarBusyTimeResponse,
  type CalendarImportResponse,
  type CreateCalendarImportDto,
  type UpdateCalendarImportDto,
} from '@hxroom/shared';
import { DRIZZLE, type DrizzleDb } from '../db/db.module';
import { calendarBusyTimes, calendarImports } from '../db/schema';
import type { DateRange } from '../availability/slot-calculation';
import { CalendarFetchError } from './fetch-ical';
import { CalendarImportSyncService, type SyncTrigger } from './calendar-import-sync.service';
import { encryptUrl, urlHint } from './url-crypto';

type ImportRow = typeof calendarImports.$inferSelect;

/**
 * Externe Kalender eines Coachs (doc/produkt/funktionen/kalenderabgleich.md §3). Verwaltung
 * und Abfrage der belegten Zeiten; das Abrufen selbst liegt in CalendarImportSyncService.
 * Pausierte Kalender blockieren nichts – ihre Zeiten bleiben gespeichert, zählen aber nicht.
 */
@Injectable()
export class CalendarImportsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly sync: CalendarImportSyncService,
  ) {}

  async list(organizationId: string): Promise<CalendarImportResponse[]> {
    const rows = await this.db
      .select()
      .from(calendarImports)
      .where(eq(calendarImports.organizationId, organizationId))
      .orderBy(asc(calendarImports.createdAt));

    const counts = await this.db
      .select({ id: calendarBusyTimes.calendarImportId, value: count() })
      .from(calendarBusyTimes)
      .where(and(eq(calendarBusyTimes.organizationId, organizationId), gt(calendarBusyTimes.endTime, new Date())))
      .groupBy(calendarBusyTimes.calendarImportId);
    const countById = new Map(counts.map((c) => [c.id, Number(c.value)]));

    return rows.map((row) => toResponse(row, countById.get(row.id) ?? 0));
  }

  /**
   * Ruft die Adresse sofort ab und speichert nur, wenn das klappt – ein Kalender, der nie
   * funktioniert hat, soll gar nicht erst in der Liste stehen.
   */
  async create(organizationId: string, dto: CreateCalendarImportDto): Promise<CalendarImportResponse> {
    const [{ value: existing }] = await this.db
      .select({ value: count() })
      .from(calendarImports)
      .where(eq(calendarImports.organizationId, organizationId));
    if (Number(existing) >= CALENDAR_IMPORT_MAX_COUNT) {
      throw new BadRequestException(`At most ${CALENDAR_IMPORT_MAX_COUNT} calendars can be connected`);
    }

    let url: string;
    let fetched: Awaited<ReturnType<CalendarImportSyncService['fetchBusy']>>;
    try {
      url = this.sync.normalizeUrl(dto.url);
      fetched = await this.sync.fetchBusy(organizationId, url, dto.blockAllDay);
    } catch (err) {
      if (err instanceof CalendarFetchError) {
        throw new BadRequestException({ statusCode: 400, message: 'Calendar could not be fetched', code: err.code });
      }
      throw err;
    }

    const now = new Date();
    const row = await this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(calendarImports)
        .values({
          organizationId,
          name: dto.name,
          urlEncrypted: encryptUrl(url, this.sync.key),
          urlHint: urlHint(url),
          blockAllDay: dto.blockAllDay,
          lastAttemptAt: now,
          lastSuccessAt: now,
        })
        .returning();
      await this.sync.replaceBusyTimes(tx, created.id, organizationId, fetched.busy);
      return created;
    });

    return toResponse(row, fetched.busy.filter((range) => range.end > now).length);
  }

  async update(organizationId: string, id: string, dto: UpdateCalendarImportDto): Promise<CalendarImportResponse> {
    const existing = await this.findOwn(organizationId, id);
    const [row] = await this.db
      .update(calendarImports)
      .set({
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.blockAllDay !== undefined && { blockAllDay: dto.blockAllDay }),
      })
      .where(eq(calendarImports.id, id))
      .returning();

    // Geänderte Regel für ganztägige Termine oder wieder aktiviert: sofort neu auswerten,
    // sonst gälte bis zum nächsten Lauf noch der alte Stand.
    const needsSync = (dto.blockAllDay !== undefined && dto.blockAllDay !== existing.blockAllDay)
      || (dto.isActive === true && !existing.isActive);
    if (needsSync && row.isActive) {
      await this.sync.syncImport({ ...row, lastAttemptAt: null }, 'manual');
    }

    return (await this.list(organizationId)).find((item) => item.id === id)!;
  }

  async remove(organizationId: string, id: string): Promise<void> {
    await this.findOwn(organizationId, id);
    await this.db.delete(calendarImports).where(eq(calendarImports.id, id));
  }

  async syncNow(organizationId: string, trigger: Extract<SyncTrigger, 'activity' | 'manual'>): Promise<CalendarImportResponse[]> {
    await this.sync.syncOrganization(organizationId, trigger);
    return this.list(organizationId);
  }

  /** Belegte Zeiten aktiver Kalender, die den Zeitraum berühren – mit Kalendername. */
  async busyTimes(organizationId: string, range: DateRange): Promise<CalendarBusyTimeResponse[]> {
    const rows = await this.db
      .select({
        calendarImportId: calendarBusyTimes.calendarImportId,
        calendarName: calendarImports.name,
        start: calendarBusyTimes.startTime,
        end: calendarBusyTimes.endTime,
      })
      .from(calendarBusyTimes)
      .innerJoin(calendarImports, eq(calendarImports.id, calendarBusyTimes.calendarImportId))
      .where(and(
        eq(calendarBusyTimes.organizationId, organizationId),
        eq(calendarImports.isActive, true),
        lt(calendarBusyTimes.startTime, range.end),
        gt(calendarBusyTimes.endTime, range.start),
      ))
      .orderBy(asc(calendarBusyTimes.startTime));
    return rows.map((r) => ({ ...r, start: r.start.toISOString(), end: r.end.toISOString() }));
  }

  private async findOwn(organizationId: string, id: string): Promise<ImportRow> {
    const [row] = await this.db
      .select()
      .from(calendarImports)
      .where(and(eq(calendarImports.id, id), eq(calendarImports.organizationId, organizationId)))
      .limit(1);
    if (!row) throw new NotFoundException('Calendar import not found');
    return row;
  }
}

function toResponse(row: ImportRow, busyCount: number): CalendarImportResponse {
  return {
    id: row.id,
    name: row.name,
    urlHint: row.urlHint,
    isActive: row.isActive,
    blockAllDay: row.blockAllDay,
    lastAttemptAt: row.lastAttemptAt?.toISOString() ?? null,
    lastSuccessAt: row.lastSuccessAt?.toISOString() ?? null,
    lastError: row.lastError ?? null,
    failingSince: row.failingSince?.toISOString() ?? null,
    busyCount,
  };
}
