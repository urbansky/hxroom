import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, gt, lt, type SQL } from 'drizzle-orm';
import { formatInTimeZone } from 'date-fns-tz';
import type { AvailabilityExceptionDto, AvailabilityExceptionResponse, ListAvailabilityExceptionsQuery } from '@hxroom/shared';
import { DRIZZLE, type DrizzleDb } from '../db/db.module';
import { availabilityExceptions } from '../db/schema';
import type { DateRange } from './slot-calculation';

const TIME_ZONE = 'Europe/Berlin';

type ExceptionRow = typeof availabilityExceptions.$inferSelect;

/**
 * Ausnahmen von den Wochenzeiten (doc/produkt/funktionen/kalenderabgleich.md §2). Gesperrte
 * Zeiträume nimmt die Slot-Berechnung aus, freigegebene kommen als zusätzliche Zeitfenster
 * hinzu – beides über `loadForSlots`, damit Buchungsseite, Buchungserstellung und die
 * Prüfung beim manuellen Anlegen dieselbe Sicht haben.
 */
@Injectable()
export class AvailabilityExceptionsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async list(organizationId: string, query: ListAvailabilityExceptionsQuery): Promise<AvailabilityExceptionResponse[]> {
    const conditions: SQL[] = [eq(availabilityExceptions.organizationId, organizationId)];
    // Ohne Zeitraum: alles, was noch nicht vorbei ist.
    conditions.push(gt(availabilityExceptions.endTime, query.from ? new Date(query.from) : new Date()));
    if (query.to) conditions.push(lt(availabilityExceptions.startTime, new Date(query.to)));

    const rows = await this.db
      .select()
      .from(availabilityExceptions)
      .where(and(...conditions))
      .orderBy(asc(availabilityExceptions.startTime));
    return rows.map(toResponse);
  }

  async create(organizationId: string, dto: AvailabilityExceptionDto): Promise<AvailabilityExceptionResponse> {
    const values = this.validate(dto);
    const [row] = await this.db
      .insert(availabilityExceptions)
      .values({ organizationId, ...values })
      .returning();
    return toResponse(row);
  }

  async update(organizationId: string, id: string, dto: AvailabilityExceptionDto): Promise<AvailabilityExceptionResponse> {
    await this.assertOwnership(organizationId, id);
    const values = this.validate(dto);
    const [row] = await this.db
      .update(availabilityExceptions)
      .set(values)
      .where(eq(availabilityExceptions.id, id))
      .returning();
    return toResponse(row);
  }

  async remove(organizationId: string, id: string): Promise<void> {
    await this.assertOwnership(organizationId, id);
    await this.db.delete(availabilityExceptions).where(eq(availabilityExceptions.id, id));
  }

  /**
   * Ausnahmen, die den Zeitraum berühren, aufgeteilt für computeAvailableSlots und
   * isWithinAvailability. `blocked` behält die Zeilen, damit die Prüfung beim manuellen
   * Anlegen die Notiz nennen kann.
   */
  async loadForSlots(organizationId: string, range: DateRange): Promise<{ blocked: ExceptionRow[]; available: DateRange[] }> {
    const rows = await this.db
      .select()
      .from(availabilityExceptions)
      .where(and(
        eq(availabilityExceptions.organizationId, organizationId),
        lt(availabilityExceptions.startTime, range.end),
        gt(availabilityExceptions.endTime, range.start),
      ))
      .orderBy(asc(availabilityExceptions.startTime));

    return {
      blocked: rows.filter((row) => row.kind === 'blocked'),
      available: rows
        .filter((row) => row.kind === 'available')
        .map((row) => ({ start: row.startTime, end: row.endTime })),
    };
  }

  // Regeln, die das Schema nicht prüfen kann, weil sie die Uhr oder die Zeitzone brauchen.
  private validate(dto: AvailabilityExceptionDto) {
    const startTime = new Date(dto.start);
    const endTime = new Date(dto.end);

    if (endTime.getTime() <= Date.now()) {
      throw new BadRequestException('Exception must not lie entirely in the past');
    }
    // Eine Freigabe endet am selben Tag; 24:00 zählt noch zum Tag (Ende ist exklusiv).
    if (dto.kind === 'available'
      && formatInTimeZone(startTime, TIME_ZONE, 'yyyy-MM-dd') !== formatInTimeZone(new Date(endTime.getTime() - 1), TIME_ZONE, 'yyyy-MM-dd')) {
      throw new BadRequestException('An available exception must start and end on the same day');
    }

    return {
      kind: dto.kind,
      startTime,
      endTime,
      allDay: dto.kind === 'blocked' && dto.allDay,
      note: dto.note?.trim() || null,
    };
  }

  private async assertOwnership(organizationId: string, id: string) {
    const [row] = await this.db
      .select({ id: availabilityExceptions.id })
      .from(availabilityExceptions)
      .where(and(eq(availabilityExceptions.id, id), eq(availabilityExceptions.organizationId, organizationId)))
      .limit(1);
    if (!row) throw new NotFoundException('Availability exception not found');
  }
}

function toResponse(row: ExceptionRow): AvailabilityExceptionResponse {
  return {
    id: row.id,
    kind: row.kind,
    start: row.startTime.toISOString(),
    end: row.endTime.toISOString(),
    allDay: row.allDay,
    note: row.note,
  };
}
