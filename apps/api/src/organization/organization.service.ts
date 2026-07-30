import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../db/db.module';
import { organization, offers, bookingPage } from '../db/schema';

@Injectable()
export class OrganizationService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async findBySlug(slug: string) {
    const [org] = await this.db
      .select({
        id:              organization.id,
        name:            organization.name,
        slug:            organization.slug,
        logo:            organization.logo,
        avatarUpdatedAt: bookingPage.avatarUpdatedAt,
      })
      .from(organization)
      .leftJoin(bookingPage, eq(bookingPage.organizationId, organization.id))
      .where(eq(organization.slug, slug))
      .limit(1);

    if (!org) {
      throw new NotFoundException(`Kein Coach mit dem Slug „${slug}" gefunden`);
    }

    return org;
  }

  async findActiveOffersBySlug(slug: string) {
    const org = await this.findBySlug(slug);

    return this.db
      .select({
        id: offers.id,
        name: offers.name,
        durationMinutes: offers.durationMinutes,
        priceCents: offers.priceCents,
        description: offers.description,
        isActive: offers.isActive,
        sortOrder: offers.sortOrder,
      })
      .from(offers)
      .where(and(eq(offers.organizationId, org.id), eq(offers.isActive, true)))
      .orderBy(asc(offers.sortOrder), asc(offers.createdAt));
  }
}
