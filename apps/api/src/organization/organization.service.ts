import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, ne } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../db/db.module';
import { organization, offers, bookingPage, availabilitySlots, availabilitySettings, bookings } from '../db/schema';
import { computeAvailableSlots, DEFAULT_BOOKING_WINDOW_WEEKS, type DateRange } from '../availability/slot-calculation';

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
    const { slots } = await this.resolveOfferAndSlots(org, offerId);

    return slots.map((s) => ({ start: s.start.toISOString(), end: s.end.toISOString() }));
  }

  // Gemeinsame Grundlage für die öffentliche Slot-Anzeige (findAvailableSlots) und die
  // Buchungserstellung (BookingsService.create) – beide brauchen dieselbe "Angebot laden
  // → Regeln/Settings laden → Slots berechnen"-Logik inkl. Ausschluss bereits belegter Zeiten.
  async resolveOfferAndSlots(org: { id: string }, offerId: string): Promise<{ offer: { name: string; durationMinutes: number }; slots: DateRange[] }> {
    const [offer] = await this.db
      .select({ name: offers.name, durationMinutes: offers.durationMinutes })
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

    // 'cancelled'/verfallene Buchungen geben ihren Zeitpunkt wieder frei, alle anderen
    // (auch 'pending' – noch offene Bestätigung) blockieren ihn weiterhin.
    const existingBookings = await this.db
      .select({ startTime: bookings.startTime, endTime: bookings.endTime })
      .from(bookings)
      .where(and(eq(bookings.organizationId, org.id), ne(bookings.status, 'cancelled')));

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
      excludeRanges: existingBookings.map((b) => ({ start: b.startTime, end: b.endTime })),
    });

    return { offer, slots };
  }
}
