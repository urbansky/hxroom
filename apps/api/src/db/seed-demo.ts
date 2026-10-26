/**
 * Lokales Abbild von demo.hxroom.de für die Screenshots der Landingpage:
 * `pnpm db:seed:demo` (phase5-umsetzungsplan.md, Schritt 9b).
 *
 * Liest die öffentlichen Inhalte der Vorführ-Buchungsseite (Profil, Foto, Impressum,
 * Angebot) über die API der Produktion und legt damit lokal ein Coach-Konto mit der
 * Subdomain `demo` an. Klienten und Termine sind die fiktiven aus seed/demo-data.ts.
 * Dazu kommt ein Termin, der gerade läuft, damit Warteraum und Gespräch aufgenommen
 * werden können.
 *
 * Produktivdaten werden nur gelesen, nie geschrieben. Wiederholbar: alle Datensätze tragen
 * das Präfix `demo-`, jeder Lauf löscht genau diese und legt sie neu an. `pnpm db:seed`
 * lässt sie in Ruhe.
 */
import { randomBytes } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import { and, eq, like, notLike } from 'drizzle-orm';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { Imprint, ImprintMode } from '@hxroom/shared';
import { normalizeEmail } from '../clients/normalize-email';
import * as schema from './schema';
import { planBookings } from './seed/booking-plan';
import { uploadAvatar } from './seed/avatar';
import {
  DEMO_AVAILABILITY,
  DEMO_AVAILABILITY_SETTINGS,
  DEMO_CLIENTS,
  SEED_PASSWORD,
} from './seed/demo-data';

type Db = PostgresJsDatabase<typeof schema>;

const SOURCE_API = process.env.DEMO_SOURCE_API ?? 'https://api.hxroom.de/api/v1';
const SOURCE_SLUG = 'demo';

const PREFIX = 'demo-';
const SLUG = 'demo';
const EMAIL = 'demo@hxroom.test';
const USER_ID = `${PREFIX}user`;
const ORG_ID = `${PREFIX}org`;
const OFFER_ID = `${PREFIX}offer`;
/** Termin, der gerade läuft – für Warteraum und Gespräch. */
const LIVE_BOOKING_ID = `${PREFIX}booking-live`;
const LIVE_CLIENT_INDEX = 0; // Miriam Kastner

interface PublicProfile {
  name: string;
  avatarUpdatedAt: string | null;
  id: string;
  tagline: string | null;
  bio: string | null;
  ctaButton: string | null;
  ctaIntro: string | null;
  jobTitle: string | null;
  topics: string[];
  quote: string | null;
  qualifications: string[];
  privacyUrl: string | null;
  termsUrl: string | null;
}

interface PublicImprint {
  mode: ImprintMode | null;
  imprint: Imprint | null;
  url: string | null;
}

interface PublicOffer {
  name: string;
  durationMinutes: number;
  priceCents: number | null;
  description: unknown;
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${SOURCE_API}${path}`);
  if (!response.ok) throw new Error(`GET ${SOURCE_API}${path} failed: ${response.status}`);
  return response.json() as Promise<T>;
}

/** Gleiche Schranke wie seed.ts: nur gegen eine lokale Umgebung. */
function assertSafeTarget(): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed: NODE_ENV is "production"');
  }
  const authUrl = process.env.BETTER_AUTH_URL ?? '';
  if (!authUrl.includes('localhost')) {
    throw new Error(`Refusing to seed: BETTER_AUTH_URL is "${authUrl}", which does not look like a local environment.`);
  }
}

async function assertNoForeignConflicts(db: Db): Promise<void> {
  const [user] = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(and(eq(schema.user.email, EMAIL), notLike(schema.user.id, `${PREFIX}%`)))
    .limit(1);
  const [org] = await db
    .select({ id: schema.organization.id })
    .from(schema.organization)
    .where(and(eq(schema.organization.slug, SLUG), notLike(schema.organization.id, `${PREFIX}%`)))
    .limit(1);
  if (user || org) {
    throw new Error(`Refusing to seed: "${EMAIL}" or the slug "${SLUG}" belongs to an account the demo seed did not create.`);
  }
}

async function main(): Promise<void> {
  const now = new Date();
  assertSafeTarget();

  const [profile, imprint, offers] = await Promise.all([
    fetchJson<PublicProfile>(`/organizations/${SOURCE_SLUG}`),
    fetchJson<PublicImprint>(`/organizations/${SOURCE_SLUG}/imprint`),
    fetchJson<PublicOffer[]>(`/organizations/${SOURCE_SLUG}/offers`),
  ]);
  const offer = offers[0];
  if (!offer) throw new Error('demo.hxroom.de has no active offer');

  let avatar: Buffer | null = null;
  if (profile.avatarUpdatedAt) {
    const response = await fetch(`${SOURCE_API}/booking-page/avatar/${profile.id}`);
    if (response.ok) avatar = Buffer.from(await response.arrayBuffer());
  }

  const { POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD } = process.env;
  if (!POSTGRES_HOST || !POSTGRES_DB || !POSTGRES_USER || !POSTGRES_PASSWORD) {
    throw new Error('Missing Postgres environment variables');
  }
  const client = postgres({
    host: POSTGRES_HOST,
    port: Number(POSTGRES_PORT ?? 5432),
    database: POSTGRES_DB,
    user: POSTGRES_USER,
    password: POSTGRES_PASSWORD,
    max: 1,
  });
  const db = drizzle(client, { schema });

  try {
    await assertNoForeignConflicts(db);

    // Reset. ON DELETE CASCADE räumt Mitgliedschaft, Buchungsseite, Angebote, Klienten,
    // Termine, Notizen und Chat mit weg.
    await db.transaction(async (tx) => {
      await tx.delete(schema.user).where(like(schema.user.id, `${PREFIX}%`));
      await tx.delete(schema.organization).where(like(schema.organization.id, `${PREFIX}%`));
    });

    const avatarWarning = avatar ? await uploadAvatar(ORG_ID, avatar) : 'no avatar on demo.hxroom.de';
    const passwordHash = await hashPassword(SEED_PASSWORD);
    const liveToken = randomBytes(32).toString('hex');

    await db.transaction(async (tx) => {
      await tx.insert(schema.user).values({
        id: USER_ID, name: profile.name, email: EMAIL, emailVerified: true, createdAt: now, updatedAt: now,
      });
      await tx.insert(schema.account).values({
        id: `${PREFIX}account`, accountId: USER_ID, providerId: 'credential', userId: USER_ID,
        password: passwordHash, createdAt: now, updatedAt: now,
      });
      await tx.insert(schema.organization).values({ id: ORG_ID, name: profile.name, slug: SLUG, createdAt: now });
      await tx.insert(schema.member).values({
        id: `${PREFIX}member`, organizationId: ORG_ID, userId: USER_ID, role: 'owner', createdAt: now,
      });

      await tx.insert(schema.bookingPage).values({
        id: `${PREFIX}bookingpage`,
        organizationId: ORG_ID,
        tagline: profile.tagline,
        bio: profile.bio,
        ctaButton: profile.ctaButton,
        ctaIntro: profile.ctaIntro,
        jobTitle: profile.jobTitle,
        topics: profile.topics,
        quote: profile.quote,
        qualifications: profile.qualifications,
        privacyUrl: profile.privacyUrl,
        termsUrl: profile.termsUrl,
        imprintMode: imprint.mode,
        imprint: imprint.imprint,
        imprintUrl: imprint.url,
        imprintConfirmedAt: now,
        // Checkliste abgeschlossen, damit das Dashboard wie im Alltag aussieht.
        testSessionAt: now,
        linkSharedAt: now,
        onboardingCelebratedAt: now,
        avatarUpdatedAt: avatarWarning ? null : now,
        createdAt: now,
        updatedAt: now,
      });

      await tx.insert(schema.availabilitySettings).values({
        id: `${PREFIX}availset`, organizationId: ORG_ID, ...DEMO_AVAILABILITY_SETTINGS, createdAt: now, updatedAt: now,
      });
      await tx.insert(schema.availabilitySlots).values(
        DEMO_AVAILABILITY.map((slot, idx) => ({
          id: `${PREFIX}avail-${idx}`, organizationId: ORG_ID, ...slot, createdAt: now, updatedAt: now,
        })),
      );

      await tx.insert(schema.offers).values({
        id: OFFER_ID,
        organizationId: ORG_ID,
        name: offer.name,
        durationMinutes: offer.durationMinutes,
        priceCents: offer.priceCents,
        description: offer.description as typeof schema.offers.$inferInsert['description'],
        isActive: true,
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
      });

      await tx.insert(schema.clients).values(
        DEMO_CLIENTS.map((c) => ({
          id: `${PREFIX}client-${c.slug}`, organizationId: ORG_ID, name: c.name, email: normalizeEmail(c.email),
          phone: c.phone, note: c.note, createdAt: now, updatedAt: now,
        })),
      );

      // Termine nach demselben Plan wie seed.ts, alle mit dem Angebot von demo.hxroom.de.
      const durationMs = offer.durationMinutes * 60 * 1000;
      const planned = planBookings(now);
      await tx.insert(schema.bookings).values(
        planned.map((booking, idx) => {
          const c = booking.clientIndex === null ? null : DEMO_CLIENTS[booking.clientIndex];
          const isConfirmed = booking.status === 'confirmed' || booking.status === 'completed';
          return {
            id: `${PREFIX}booking-${idx}`,
            organizationId: ORG_ID,
            clientId: c ? `${PREFIX}client-${c.slug}` : null,
            offerId: OFFER_ID,
            offerName: offer.name,
            durationMinutes: offer.durationMinutes,
            startTime: booking.start,
            endTime: new Date(booking.start.getTime() + durationMs),
            status: booking.status,
            clientName: c?.name ?? 'Nadine Voss',
            clientEmail: c ? normalizeEmail(c.email) : 'nadine.voss@example.com',
            clientPhone: c?.phone ?? null,
            clientNote: booking.clientNote,
            clientAccessToken: randomBytes(32).toString('hex'),
            clientTokenUsedAt: isConfirmed ? booking.createdAt : null,
            confirmedAt: isConfirmed ? booking.createdAt : null,
            cancelledAt: booking.status === 'cancelled' ? booking.createdAt : null,
            cancelledBy: booking.cancelledBy ?? null,
            cancellationReason: booking.cancellationReason ?? null,
            createdAt: booking.createdAt,
            updatedAt: booking.createdAt,
          };
        }),
      );

      // Läuft seit Beginn der aktuellen Viertelstunde: Warteraum offen, Coach kann einlassen.
      // Die runde Startzeit hält die Uhrzeit auf den Screenshots glatt.
      const liveClient = DEMO_CLIENTS[LIVE_CLIENT_INDEX];
      const quarterMs = 15 * 60 * 1000;
      const liveStart = new Date(Math.floor(now.getTime() / quarterMs) * quarterMs);
      await tx.insert(schema.bookings).values({
        id: LIVE_BOOKING_ID,
        organizationId: ORG_ID,
        clientId: `${PREFIX}client-${liveClient.slug}`,
        offerId: OFFER_ID,
        offerName: offer.name,
        durationMinutes: offer.durationMinutes,
        startTime: liveStart,
        endTime: new Date(liveStart.getTime() + durationMs),
        status: 'confirmed',
        clientName: liveClient.name,
        clientEmail: normalizeEmail(liveClient.email),
        clientPhone: liveClient.phone,
        clientNote: null,
        clientAccessToken: liveToken,
        confirmedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        updatedAt: now,
      });
    });

    const rootDomain = process.env.ROOT_DOMAIN ?? 'hxroom.localhost';
    const origin = `${process.env.ROOT_DOMAIN_HTTPS === 'true' ? 'https' : 'http'}://${SLUG}.${rootDomain}`;
    // Maschinenlesbar für apps/landing/scripts/screenshots.mjs
    console.log(JSON.stringify({
      email: EMAIL,
      password: SEED_PASSWORD,
      bookingPageUrl: origin,
      offerId: OFFER_ID,
      liveBookingId: LIVE_BOOKING_ID,
      clientCallUrl: `${origin}/call/${LIVE_BOOKING_ID}?token=${liveToken}`,
      avatarWarning,
    }));
  } finally {
    await client.end();
  }
}

main().catch((err: unknown) => {
  console.error(`\n❌ ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
