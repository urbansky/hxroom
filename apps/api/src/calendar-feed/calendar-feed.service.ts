import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { and, asc, eq, gte, ne } from 'drizzle-orm';
import type { CalendarFeedResponse } from '@hxroom/shared';
import { DRIZZLE, type DrizzleDb } from '../db/db.module';
import { availabilitySettings, bookings } from '../db/schema';
import { buildBookingsIcs } from '../mail/ics';
import { coachIcsInput, type CoachCalendarOptions } from '../mail/coach-calendar';

/** Wie weit der Feed zurückreicht – vergangene Sitzungen bleiben eine Weile im Kalender sichtbar. */
const FEED_PAST_DAYS = 30;
/** Vorgeschlagener Abruftakt (X-PUBLISHED-TTL); was die Kalender daraus machen, steht im Konzept §4. */
const FEED_REFRESH_MINUTES = 15;
const FEED_NAME = 'HxRoom – Termine';

/**
 * Kalender-Abo des Coachs (doc/produkt/funktionen/kalenderabgleich.md §4). Die Adresse entsteht
 * erst, wenn der Coach das Abo einrichtet; „Abo beenden“ löscht den Token, „Adresse erneuern“
 * ersetzt ihn – die alte Adresse liefert danach sofort 404.
 */
@Injectable()
export class CalendarFeedService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly config: ConfigService,
  ) {}

  async get(organizationId: string): Promise<CalendarFeedResponse> {
    const [row] = await this.db
      .select({ token: availabilitySettings.calendarFeedToken, hideClientNames: availabilitySettings.calendarFeedHideNames })
      .from(availabilitySettings)
      .where(eq(availabilitySettings.organizationId, organizationId))
      .limit(1);
    return { token: row?.token ?? null, hideClientNames: row?.hideClientNames ?? false };
  }

  /** Richtet das Abo ein; ein bestehendes bleibt unverändert. */
  async enable(organizationId: string): Promise<CalendarFeedResponse> {
    const current = await this.get(organizationId);
    if (current.token) return current;
    return this.setToken(organizationId, newToken());
  }

  async regenerate(organizationId: string): Promise<CalendarFeedResponse> {
    return this.setToken(organizationId, newToken());
  }

  async disable(organizationId: string): Promise<CalendarFeedResponse> {
    return this.setToken(organizationId, null);
  }

  async setHideClientNames(organizationId: string, hideClientNames: boolean): Promise<CalendarFeedResponse> {
    await this.db
      .insert(availabilitySettings)
      .values({ organizationId, calendarFeedHideNames: hideClientNames })
      .onConflictDoUpdate({ target: availabilitySettings.organizationId, set: { calendarFeedHideNames: hideClientNames } });
    return this.get(organizationId);
  }

  /** Einstellungen für einen Termin im Kalender des Coachs – auch für Mail-Anhang und Download. */
  async calendarOptions(organizationId: string): Promise<CoachCalendarOptions> {
    const { hideClientNames } = await this.get(organizationId);
    return { hideClientNames, coachAppUrl: this.config.getOrThrow<string>('COACH_APP_URL') };
  }

  /**
   * Der Feed zu einem Token: alle Termine ab 30 Tagen zurück, ohne abgesagte und ohne
   * Probe-Sitzungen. Ein unbekannter Token ergibt 404 – ohne zu verraten, ob es ihn je gab.
   */
  async render(token: string): Promise<string> {
    const [settings] = token
      ? await this.db
          .select({ organizationId: availabilitySettings.organizationId })
          .from(availabilitySettings)
          .where(eq(availabilitySettings.calendarFeedToken, token))
          .limit(1)
      : [];
    if (!settings) throw new NotFoundException('Calendar feed not found');

    const options = await this.calendarOptions(settings.organizationId);
    const rows = await this.db
      .select({
        id: bookings.id,
        offerName: bookings.offerName,
        clientName: bookings.clientName,
        startTime: bookings.startTime,
        endTime: bookings.endTime,
        status: bookings.status,
      })
      .from(bookings)
      .where(and(
        eq(bookings.organizationId, settings.organizationId),
        ne(bookings.status, 'cancelled'),
        ne(bookings.origin, 'test'),
        gte(bookings.endTime, new Date(Date.now() - FEED_PAST_DAYS * 24 * 60 * 60_000)),
      ))
      .orderBy(asc(bookings.startTime));

    return buildBookingsIcs(
      rows.map((row) => coachIcsInput(row, options)),
      { name: FEED_NAME, refreshMinutes: FEED_REFRESH_MINUTES },
    );
  }

  private async setToken(organizationId: string, token: string | null): Promise<CalendarFeedResponse> {
    await this.db
      .insert(availabilitySettings)
      .values({ organizationId, calendarFeedToken: token })
      .onConflictDoUpdate({ target: availabilitySettings.organizationId, set: { calendarFeedToken: token } });
    return this.get(organizationId);
  }
}

// 32 Byte Zufall, URL-tauglich – so stark wie die Zugangslinks der Klienten.
function newToken(): string {
  return randomBytes(32).toString('base64url');
}
