import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../db/db.module';
import { organization, offers, bookingPage, availabilitySlots, availabilitySettings } from '../db/schema';
import { computeAvailableSlots, DEFAULT_BOOKING_WINDOW_WEEKS } from '../availability/slot-calculation';

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
      throw new NotFoundException(`No coach found for slug "${slug}"`);
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

  async findAvailableSlots(slug: string, offerId: string) {
    const org = await this.findBySlug(slug);

    const [offer] = await this.db
      .select({ durationMinutes: offers.durationMinutes })
      .from(offers)
      .where(and(eq(offers.id, offerId), eq(offers.organizationId, org.id), eq(offers.isActive, true)))
      .limit(1);

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    const rules = await this.db
      .select({ weekday: availabilitySlots.weekday, startTime: availabilitySlots.startTime, endTime: availabilitySlots.endTime })
      .from(availabilitySlots)
      .where(eq(availabilitySlots.organizationId, org.id));

    const [settingsRow] = await this.db
      .select({
        bufferMinutes: availabilitySettings.bufferMinutes,
        minLeadTimeHours: availabilitySettings.minLeadTimeHours,
        bookingWindowWeeks: availabilitySettings.bookingWindowWeeks,
      })
      .from(availabilitySettings)
      .where(eq(availabilitySettings.organizationId, org.id))
      .limit(1);

    const slots = computeAvailableSlots({
      rules,
      settings: {
        bufferMinutes: settingsRow?.bufferMinutes ?? 0,
        minLeadTimeHours: settingsRow?.minLeadTimeHours ?? 0,
      },
      durationMinutes: offer.durationMinutes,
      now: new Date(),
      timeZone: 'Europe/Berlin',
      daysAhead: (settingsRow?.bookingWindowWeeks ?? DEFAULT_BOOKING_WINDOW_WEEKS) * 7,
    });

    return slots.map((s) => ({ start: s.start.toISOString(), end: s.end.toISOString() }));
  }
}
