import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, max } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../db/db.module';
import { offers } from '../db/schema';
import type { CreateOfferDto, UpdateOfferDto } from '@hxroom/shared';

@Injectable()
export class OffersService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  list(organizationId: string) {
    return this.db
      .select()
      .from(offers)
      .where(eq(offers.organizationId, organizationId))
      .orderBy(asc(offers.sortOrder), asc(offers.createdAt));
  }

  async create(organizationId: string, dto: CreateOfferDto) {
    const [{ maxSortOrder }] = await this.db
      .select({ maxSortOrder: max(offers.sortOrder) })
      .from(offers)
      .where(eq(offers.organizationId, organizationId));

    const [row] = await this.db
      .insert(offers)
      .values({
        organizationId,
        name: dto.name,
        durationMinutes: dto.durationMinutes,
        priceCents: dto.priceCents ?? null,
        isActive: dto.isActive ?? true,
        sortOrder: (maxSortOrder ?? -1) + 1,
      })
      .returning();

    return row;
  }

  async update(organizationId: string, id: string, dto: UpdateOfferDto) {
    await this.assertOwnership(organizationId, id);

    const [row] = await this.db
      .update(offers)
      .set({
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.durationMinutes !== undefined && { durationMinutes: dto.durationMinutes }),
        ...(dto.priceCents !== undefined && { priceCents: dto.priceCents }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      })
      .where(eq(offers.id, id))
      .returning();

    return row;
  }

  async remove(organizationId: string, id: string) {
    await this.assertOwnership(organizationId, id);
    await this.db.delete(offers).where(eq(offers.id, id));
  }

  private async assertOwnership(organizationId: string, id: string) {
    const [row] = await this.db
      .select({ id: offers.id })
      .from(offers)
      .where(and(eq(offers.id, id), eq(offers.organizationId, organizationId)))
      .limit(1);

    if (!row) {
      throw new NotFoundException('Offer not found');
    }
  }
}
