import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, gt, lt, ne } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../db/db.module';
import { availabilitySlots } from '../db/schema';
import type { CreateAvailabilitySlotDto, UpdateAvailabilitySlotDto } from '@hxroom/shared';

@Injectable()
export class AvailabilityService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  list(organizationId: string) {
    return this.db
      .select()
      .from(availabilitySlots)
      .where(eq(availabilitySlots.organizationId, organizationId))
      .orderBy(asc(availabilitySlots.weekday), asc(availabilitySlots.startTime));
  }

  async create(organizationId: string, dto: CreateAvailabilitySlotDto) {
    await this.assertNoOverlap(organizationId, dto.weekday, dto.startTime, dto.endTime);

    const [row] = await this.db
      .insert(availabilitySlots)
      .values({
        organizationId,
        weekday: dto.weekday,
        startTime: dto.startTime,
        endTime: dto.endTime,
      })
      .returning();

    return row;
  }

  async update(organizationId: string, id: string, dto: UpdateAvailabilitySlotDto) {
    const existing = await this.assertOwnership(organizationId, id);

    const weekday = dto.weekday ?? existing.weekday;
    const startTime = dto.startTime ?? existing.startTime;
    const endTime = dto.endTime ?? existing.endTime;

    await this.assertNoOverlap(organizationId, weekday, startTime, endTime, id);

    const [row] = await this.db
      .update(availabilitySlots)
      .set({ weekday, startTime, endTime })
      .where(eq(availabilitySlots.id, id))
      .returning();

    return row;
  }

  async remove(organizationId: string, id: string) {
    await this.assertOwnership(organizationId, id);
    await this.db.delete(availabilitySlots).where(eq(availabilitySlots.id, id));
  }

  private async assertOwnership(organizationId: string, id: string) {
    const [row] = await this.db
      .select()
      .from(availabilitySlots)
      .where(and(eq(availabilitySlots.id, id), eq(availabilitySlots.organizationId, organizationId)))
      .limit(1);

    if (!row) {
      throw new NotFoundException('Availability slot not found');
    }
    return row;
  }

  // Zwei Zeitfenster überlappen (bei halboffenen Intervallen [start, end)), wenn
  // start1 < end2 und end1 > start2 – so gelten direkt aneinandergrenzende Slots
  // (z.B. 09:00-12:00 und 12:00-17:00) bewusst nicht als Überlappung.
  private async assertNoOverlap(organizationId: string, weekday: number, startTime: string, endTime: string, excludeId?: string) {
    const conflicts = await this.db
      .select({ id: availabilitySlots.id })
      .from(availabilitySlots)
      .where(and(
        eq(availabilitySlots.organizationId, organizationId),
        eq(availabilitySlots.weekday, weekday),
        lt(availabilitySlots.startTime, endTime),
        gt(availabilitySlots.endTime, startTime),
        ...(excludeId ? [ne(availabilitySlots.id, excludeId)] : []),
      ))
      .limit(1);

    if (conflicts.length > 0) {
      throw new ConflictException('Availability slot overlaps with an existing slot on this weekday');
    }
  }
}
