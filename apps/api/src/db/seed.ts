/**
 * Testdaten für die lokale Entwicklung: `pnpm db:seed`.
 *
 * Schreibt direkt per Drizzle statt über die REST-API, und zwar aus zwei Gründen:
 * Buchungen entstehen regulär nur über die öffentliche Buchungsseite samt
 * Bestätigungsmail (BookingsService.create – ohne BREVO_API_KEY nicht möglich), und
 * vergangene Termine lassen sich über die API grundsätzlich nicht anlegen, weil
 * OrganizationService.resolveOfferAndSlots ausschließlich Slots in der Zukunft liefert.
 * Genau die braucht aber die Klientenhistorie.
 *
 * Wiederholbar: alle Datensätze tragen IDs mit dem Präfix `seed-`; jeder Lauf löscht
 * zuerst genau diese und legt sie neu an. Von Hand angelegte Accounts bleiben unberührt.
 */
import { randomBytes } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import { and, count, inArray, like, notLike } from 'drizzle-orm';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { normalizeEmail } from '../clients/normalize-email';
import { DELETION_GRACE_DAYS } from '../account/deletion.constants';
import * as schema from './schema';
import { planBookings } from './seed/booking-plan';
import { uploadDemoAvatar } from './seed/avatar';
import {
  DEMO_AVAILABILITY,
  DEMO_AVAILABILITY_SETTINGS,
  DEMO_CLIENTS,
  DEMO_COACHES,
  DEMO_OFFERS,
  SEED_ID_PREFIX,
  SEED_PASSWORD,
  type DemoCoach,
} from './seed/demo-data';

type Db = PostgresJsDatabase<typeof schema>;

const LIKE_SEED = `${SEED_ID_PREFIX}%`;

interface CoachSummary {
  coach: DemoCoach;
  organizationId: string;
  offers: number;
  clients: number;
  bookings: number;
  availability: number;
}

// --- Absicherung ----------------------------------------------------------------

/**
 * Der Seed löscht Daten – deshalb zwei Schranken vor jedem DB-Zugriff.
 *
 * Wichtig: eine Prüfung auf POSTGRES_HOST wäre hier wirkungslos. apps/api/.env.prod
 * erreicht die Produktionsdatenbank über einen SSH-Tunnel und trägt darum exakt dieselben
 * Postgres-Werte wie .env (localhost:5433/hxroom/hxroom). Ein versehentliches
 * `dotenv -e .env.prod -- tsx src/db/seed.ts` – etwa aus der Shell-History von
 * db:studio:prod – käme an einem Host-Vergleich vorbei.
 *
 * Verlässlich unterscheidbar ist die Umgebung nur an BETTER_AUTH_URL: lokal
 * .localhost bzw. localhost, produktiv api.hxroom.de. Die Prüfung ist deshalb positiv
 * formuliert (erlauben, was lokal aussieht) statt bekannte Produktionswerte zu sperren.
 *
 * Bewusst *keine* Schranke: die Zahl vorhandener Nicht-Seed-Accounts. Eine
 * Entwicklungsdatenbank enthält üblicherweise den selbst angelegten Account, ein Abbruch
 * deswegen wäre bei jedem normalen Lauf im Weg. Der Zähler steht stattdessen im Report,
 * und gelöscht wird ohnehin nur, was das Präfix `seed-` trägt.
 */
function assertSafeTarget(): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed: NODE_ENV is "production"');
  }

  const authUrl = process.env.BETTER_AUTH_URL ?? '';
  if (!authUrl.includes('localhost')) {
    throw new Error(
      `Refusing to seed: BETTER_AUTH_URL is "${authUrl}", which does not look like a local `
      + 'environment. The seed only runs against a development setup.',
    );
  }
}

/**
 * user.email und organization.slug sind unique. Belegt ein von Hand angelegter Coach einen
 * der Demo-Werte, scheiterte der Insert sonst an einem nackten Postgres-Fehler – der
 * Hinweis hier nennt stattdessen die Ursache und die Stelle zum Ändern.
 */
async function assertNoForeignConflicts(db: Db): Promise<void> {
  const emails = DEMO_COACHES.map((c) => c.email);
  const slugs = DEMO_COACHES.map((c) => c.slug);

  const [conflictingUser] = await db
    .select({ email: schema.user.email })
    .from(schema.user)
    .where(and(inArray(schema.user.email, emails), notLike(schema.user.id, LIKE_SEED)))
    .limit(1);

  if (conflictingUser) {
    throw new Error(
      `Refusing to seed: the email "${conflictingUser.email}" already belongs to a user that `
      + 'was not created by the seed. Change the address in src/db/seed/demo-data.ts.',
    );
  }

  const [conflictingOrg] = await db
    .select({ slug: schema.organization.slug })
    .from(schema.organization)
    .where(and(inArray(schema.organization.slug, slugs), notLike(schema.organization.id, LIKE_SEED)))
    .limit(1);

  if (conflictingOrg) {
    throw new Error(
      `Refusing to seed: the slug "${conflictingOrg.slug}" is taken by an organization that `
      + 'was not created by the seed. Change the slug in src/db/seed/demo-data.ts.',
    );
  }
}

// --- Anlage ---------------------------------------------------------------------

/** Der S3-Key des Avatars hängt allein hieran, deshalb schon vor dem Insert bestimmbar. */
function organizationIdFor(coach: DemoCoach): string {
  return `${SEED_ID_PREFIX}org-${coach.slug}`;
}

async function seedCoach(
  db: Db,
  coach: DemoCoach,
  now: Date,
  /** Nur gesetzt, wenn das Bild wirklich im Bucket liegt – sonst zeigt die Buchungsseite auf ein 404. */
  avatarUpdatedAt: Date | null,
): Promise<CoachSummary> {
  const userId = `${SEED_ID_PREFIX}user-${coach.slug}`;
  const organizationId = organizationIdFor(coach);
  // scrypt ist absichtlich langsam – vor der Transaktion, nicht in ihr.
  const passwordHash = await hashPassword(SEED_PASSWORD);

  const summary: CoachSummary = {
    coach, organizationId, offers: 0, clients: 0, bookings: 0, availability: 0,
  };

  await db.transaction(async (tx) => {
    // 1. User. emailVerified muss true sein: auth.module.ts setzt
    // requireEmailVerification, ein unverifizierter Account käme nicht am Login vorbei.
    await tx.insert(schema.user).values({
      id: userId,
      name: coach.name,
      email: coach.email,
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    });

    // 2. Passwort-Account. providerId 'credential' ist die Kennung, unter der
    // better-auth den E-Mail/Passwort-Login sucht.
    await tx.insert(schema.account).values({
      id: `${SEED_ID_PREFIX}account-${coach.slug}`,
      accountId: userId,
      providerId: 'credential',
      userId,
      password: passwordHash,
      createdAt: now,
      updatedAt: now,
    });

    // 3. + 4. Organisation und Mitgliedschaft. Beide entstehen im Betrieb automatisch im
    // databaseHook user.create.after (auth.module.ts); ein direkter Insert umgeht diesen
    // Hook, deshalb hier von Hand – mit festem Slug statt generiertem, damit die
    // Buchungsseite immer unter derselben Subdomain erreichbar ist.
    // Läuft für diesen Coach eine Löschung, wird das Fälligkeitsdatum gleich mitgesetzt –
    // dadurch ist die Buchungsseite offline (OrganizationService.findBySlug) und das
    // Warnbanner im Backoffice sichtbar.
    const deletionScheduledFor = coach.deletionInDays === null
      ? null
      : new Date(now.getTime() + coach.deletionInDays * 24 * 60 * 60 * 1000);

    await tx.insert(schema.organization).values({
      id: organizationId,
      name: coach.name,
      slug: coach.slug,
      createdAt: now,
      deletionScheduledFor,
    });

    if (deletionScheduledFor) {
      await tx.insert(schema.coachDeletions).values({
        id: `${SEED_ID_PREFIX}deletion-${coach.slug}`,
        userId,
        organizationId,
        // Antragszeitpunkt rückwärts aus dem Stichtag, damit die 30-Tage-Frist stimmt.
        requestedAt: new Date(deletionScheduledFor.getTime() - DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000),
        requestedBy: 'coach',
        scheduledFor: deletionScheduledFor,
      });
    }

    await tx.insert(schema.member).values({
      id: `${SEED_ID_PREFIX}member-${coach.slug}`,
      organizationId,
      userId,
      role: 'owner',
      createdAt: now,
    });

    // Session bewusst nicht anlegen: session.activeOrganizationId setzt ein zweiter Hook
    // beim Login, und ohne dieses Feld scheitert jeder AuthGuard-geschützte Endpunkt.

    if (!coach.populated) return;

    // 5. Buchungsseite
    if (coach.bookingPage) {
      await tx.insert(schema.bookingPage).values({
        id: `${SEED_ID_PREFIX}bookingpage-${coach.slug}`,
        organizationId,
        ...coach.bookingPage,
        avatarUpdatedAt,
        createdAt: now,
        updatedAt: now,
      });
    }

    // 6. Slot-Einstellungen
    await tx.insert(schema.availabilitySettings).values({
      id: `${SEED_ID_PREFIX}availset-${coach.slug}`,
      organizationId,
      ...DEMO_AVAILABILITY_SETTINGS,
      createdAt: now,
      updatedAt: now,
    });

    // 7. Wochenraster
    await tx.insert(schema.availabilitySlots).values(
      DEMO_AVAILABILITY.map((slot, idx) => ({
        id: `${SEED_ID_PREFIX}avail-${coach.slug}-${idx}`,
        organizationId,
        ...slot,
        createdAt: now,
        updatedAt: now,
      })),
    );
    summary.availability = DEMO_AVAILABILITY.length;

    // 8. Angebote
    await tx.insert(schema.offers).values(
      DEMO_OFFERS.map((offer, idx) => ({
        id: `${SEED_ID_PREFIX}offer-${coach.slug}-${offer.slug}`,
        organizationId,
        name: offer.name,
        durationMinutes: offer.durationMinutes,
        priceCents: offer.priceCents,
        description: offer.description,
        isActive: offer.isActive,
        sortOrder: idx,
        createdAt: now,
        updatedAt: now,
      })),
    );
    summary.offers = DEMO_OFFERS.length;

    // 9. Klienten. E-Mail normalisieren wie ClientsService.create – der
    // Unique-Constraint (organizationId, email) ist case-sensitive und trägt allein nicht.
    await tx.insert(schema.clients).values(
      DEMO_CLIENTS.map((client) => ({
        id: `${SEED_ID_PREFIX}client-${coach.slug}-${client.slug}`,
        organizationId,
        name: client.name,
        email: normalizeEmail(client.email),
        phone: client.phone,
        note: client.note,
        createdAt: now,
        updatedAt: now,
      })),
    );
    summary.clients = DEMO_CLIENTS.length;

    // 10. Buchungen – zuletzt, sie verweisen auf Angebote und Klienten.
    const planned = planBookings(now);
    await tx.insert(schema.bookings).values(
      planned.map((booking, idx) => {
        const client = booking.clientIndex === null ? null : DEMO_CLIENTS[booking.clientIndex];
        const isConfirmed = booking.status === 'confirmed' || booking.status === 'completed';

        return {
          id: `${SEED_ID_PREFIX}booking-${coach.slug}-${idx}`,
          organizationId,
          clientId: client ? `${SEED_ID_PREFIX}client-${coach.slug}-${client.slug}` : null,
          offerId: `${SEED_ID_PREFIX}offer-${coach.slug}-${booking.offer.slug}`,
          // Snapshots zum Buchungszeitpunkt, unabhängig von späteren Angebotsänderungen
          offerName: booking.offer.name,
          durationMinutes: booking.offer.durationMinutes,
          startTime: booking.start,
          endTime: booking.end,
          status: booking.status,
          // Ohne Klient stammen die Kontaktdaten aus dem Buchungsformular
          clientName: client?.name ?? 'Nadine Voss',
          clientEmail: client ? normalizeEmail(client.email) : 'nadine.voss@example.com',
          clientPhone: client?.phone ?? null,
          clientNote: booking.clientNote,
          clientAccessToken: randomBytes(32).toString('hex'),
          clientTokenUsedAt: isConfirmed ? booking.createdAt : null,
          confirmedAt: isConfirmed ? booking.createdAt : null,
          createdAt: booking.createdAt,
          updatedAt: booking.createdAt,
        };
      }),
    );
    summary.bookings = planned.length;
  });

  return summary;
}

// --- Ausgabe --------------------------------------------------------------------

function report(summaries: CoachSummary[], avatarWarning: string | null, realUsers: number): void {
  const rootDomain = process.env.ROOT_DOMAIN ?? 'hxroom.localhost';
  const https = process.env.ROOT_DOMAIN_HTTPS === 'true';
  const coachApp = process.env.COACH_APP_URL ?? 'http://localhost:5173';

  const host = `${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}/${process.env.POSTGRES_DB}`;

  console.log('\n✅ Seed abgeschlossen\n');
  console.log(`Ziel  ${host} · ${process.env.BETTER_AUTH_URL}`);
  if (realUsers > 0) {
    console.log(`      ${realUsers} nicht vom Seed angelegte(r) Account(s) blieben unberührt`);
  }
  console.log('');

  for (const s of summaries) {
    const label = s.coach.deletionInDays !== null
      ? `Löschung läuft, in ${s.coach.deletionInDays} Tagen`
      : s.coach.populated ? 'voll ausgestattet' : 'leer, für Empty-States';
    console.log(`${s.coach.name} (${label})`);
    console.log(`  Login          ${s.coach.email} / ${SEED_PASSWORD}`);
    console.log(`  Backoffice     ${coachApp}`);
    const bookingPageUrl = `${https ? 'https' : 'http'}://${s.coach.slug}.${rootDomain}`;
    // Bei laufender Löschung liefert findBySlug bewusst 404 – ohne diesen Hinweis sieht die
    // URL im Report nach einem Fehler aus.
    console.log(
      s.coach.deletionInDays !== null
        ? `  Buchungsseite  ${bookingPageUrl} (offline, wegen laufender Löschung)`
        : `  Buchungsseite  ${bookingPageUrl}`,
    );
    if (s.coach.populated) {
      console.log(
        `  ${s.offers} Angebote · ${s.clients} Klienten · ${s.bookings} Buchungen`
        + ` · ${s.availability} Verfügbarkeitsfenster`,
      );
    }
    console.log('');
  }

  console.log("ℹ️  Die 'pending'-Buchung verfällt nach 30 Minuten (BookingExpiryService).");
  console.log('    Für ein frisches „Wartet auf Bestätigung" einfach erneut seeden.');

  if (avatarWarning) {
    console.log(`⚠️  Avatar-Upload übersprungen: ${avatarWarning}`);
    console.log('    Läuft RustFS? infra/docker-compose.dev.yml startet es mit.');
  }
}

// --- Ablauf ---------------------------------------------------------------------

async function main(): Promise<void> {
  // Einmal einfrieren: ein zweites new Date() mitten im Lauf könnte Zeitplan und
  // Einfügen an der Sekundengrenze unterschiedliche Vorlaufzeit-Grenzen sehen lassen.
  const now = new Date();

  // Vor dem Verbindungsaufbau: gegen die falsche Umgebung darf nicht einmal eine
  // Leseabfrage laufen, und die Abbruchmeldung soll den Grund nennen statt in einem
  // Verbindungsfehler zu enden.
  assertSafeTarget();

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
    const [{ realUsers }] = await db
      .select({ realUsers: count() })
      .from(schema.user)
      .where(notLike(schema.user.id, LIKE_SEED));

    await assertNoForeignConflicts(db);

    // Reset. ON DELETE CASCADE räumt member, account, session, booking_page, offers,
    // clients, bookings, availability_slots und availability_settings mit weg.
    // coach_deletions hängt bewusst an keinem Fremdschlüssel (das Löschprotokoll soll die
    // Löschung überleben, siehe schema.ts) und muss deshalb von Hand mit weg – sonst
    // sammeln sich bei jedem Seed-Lauf verwaiste Protokollzeilen an.
    await db.transaction(async (tx) => {
      await tx.delete(schema.coachDeletions).where(like(schema.coachDeletions.userId, LIKE_SEED));
      await tx.delete(schema.user).where(like(schema.user.id, LIKE_SEED));
      await tx.delete(schema.organization).where(like(schema.organization.id, LIKE_SEED));
    });

    // Avatar vor der Transaktion: der Upload ist ein HTTP-Request, der eine offene
    // Transaktion nur blockieren würde, und avatarUpdatedAt darf ausschließlich dann
    // gesetzt werden, wenn das Objekt wirklich im Bucket liegt.
    let avatarWarning: string | null = null;
    const avatarTimes = new Map<string, Date | null>();
    for (const coach of DEMO_COACHES) {
      if (!coach.bookingPage) continue;
      const failure = await uploadDemoAvatar(organizationIdFor(coach));
      avatarWarning ??= failure;
      avatarTimes.set(coach.slug, failure ? null : now);
    }

    const summaries: CoachSummary[] = [];
    for (const coach of DEMO_COACHES) {
      summaries.push(await seedCoach(db, coach, now, avatarTimes.get(coach.slug) ?? null));
    }

    report(summaries, avatarWarning, realUsers);
  } finally {
    await client.end();
  }
}

main().catch((err: unknown) => {
  console.error(`\n❌ ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
