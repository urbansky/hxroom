/**
 * Legt einen Betreiber-Account an: `pnpm admin:create --email … --name "…"`.
 *
 * Hintergrund: `user.role` ist im better-auth admin-Plugin als `input: false` deklariert
 * und lässt sich deshalb über die reguläre Registrierung nicht setzen – der erste Betreiber
 * muss von außen entstehen. Siehe doc/technisches-konzept.md §7, „Betreiber-Zugang".
 *
 * Schreibt wie der Seed direkt per Drizzle. Das ist hier kein Umweg, sondern der Punkt:
 * ein Insert am better-auth-Adapter vorbei löst die databaseHooks nicht aus, es kann also
 * gar keine Coach-Organisation entstehen. Ein Betreiber ist Mitglied keiner Organisation.
 *
 * Wiederholbar: existiert die Adresse bereits, wird nur die Rolle gesetzt statt ein
 * zweiter Account angelegt.
 *
 * Produktion (im Image liegt kein tsx, nur dist/):
 *   docker compose exec api node dist/db/create-admin.js --email … --name "…"
 */
import { randomBytes } from 'node:crypto';
import { parseArgs } from 'node:util';
import { generateId } from 'better-auth';
import { hashPassword } from 'better-auth/crypto';
import { eq } from 'drizzle-orm';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { normalizeEmail } from '../clients/normalize-email';
import * as schema from './schema';

type Db = PostgresJsDatabase<typeof schema>;

const ADMIN_ROLE = 'admin';

interface Options {
  email: string;
  name: string;
  password?: string;
  force: boolean;
}

function parseOptions(): Options {
  const { values } = parseArgs({
    options: {
      email: { type: 'string' },
      name: { type: 'string' },
      password: { type: 'string' },
      force: { type: 'boolean', default: false },
    },
  });

  if (!values.email || !values.name) {
    throw new Error(
      'Usage: admin:create --email <address> --name "<full name>" [--password <password>] [--force]',
    );
  }

  const email = normalizeEmail(values.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(`"${values.email}" is not a valid email address`);
  }

  return { email, name: values.name, password: values.password, force: values.force ?? false };
}

/** Wie in seed.ts unterscheidet BETTER_AUTH_URL die Umgebungen zuverlässig – siehe dort. */
function adminUrl(): string {
  const authUrl = process.env.BETTER_AUTH_URL ?? '';
  return authUrl.includes('localhost')
    ? 'http://admin.hxroom.localhost'
    : 'https://admin.hxroom.de';
}

/** 24 Zeichen aus 18 Zufallsbytes – deutlich über der Mindestlänge von better-auth. */
function generatePassword(): string {
  return randomBytes(18).toString('base64url');
}

/**
 * Ein vorhandener Account wird zum Betreiber hochgestuft – aber nicht, wenn er zu einer
 * Organisation gehört. Sonst würde aus einem echten Coach unbemerkt ein Betreiber, dessen
 * Organisation samt Klientendaten weiter an ihm hängt. Das ist fast immer ein Vertipper
 * in der Adresse, deshalb Abbruch statt Warnung.
 */
async function assertNotACoach(db: Db, userId: string, email: string, force: boolean) {
  if (force) return;

  const [membership] = await db
    .select({ organizationId: schema.member.organizationId })
    .from(schema.member)
    .where(eq(schema.member.userId, userId))
    .limit(1);

  if (membership) {
    throw new Error(
      `Refusing to promote "${email}": the account is a member of organization `
      + `"${membership.organizationId}" and therefore belongs to a coach. `
      + 'Use a separate address for the operator account, or pass --force if this is intended.',
    );
  }
}

async function promoteExisting(
  db: Db,
  existing: { id: string; emailVerified: boolean; role: string | null },
  opts: Options,
): Promise<string[]> {
  await assertNotACoach(db, existing.id, opts.email, opts.force);

  const notes: string[] = [];
  const now = new Date();

  // emailVerified mitziehen: auth.module.ts setzt requireEmailVerification, ein
  // unverifizierter Account käme sonst nicht am Login vorbei.
  await db
    .update(schema.user)
    .set({ role: ADMIN_ROLE, emailVerified: true, updatedAt: now })
    .where(eq(schema.user.id, existing.id));

  notes.push(existing.role === ADMIN_ROLE ? 'Rolle war bereits "admin"' : 'Rolle auf "admin" gesetzt');
  if (!existing.emailVerified) notes.push('E-Mail-Adresse als verifiziert markiert');

  if (opts.password) {
    const passwordHash = await hashPassword(opts.password);
    const [credential] = await db
      .select({ id: schema.account.id })
      .from(schema.account)
      .where(eq(schema.account.userId, existing.id))
      .limit(1);

    if (credential) {
      await db
        .update(schema.account)
        .set({ password: passwordHash, updatedAt: now })
        .where(eq(schema.account.id, credential.id));
      notes.push('Passwort ersetzt');
    } else {
      await db.insert(schema.account).values({
        id: generateId(),
        accountId: existing.id,
        providerId: 'credential',
        userId: existing.id,
        password: passwordHash,
        createdAt: now,
        updatedAt: now,
      });
      notes.push('Passwort-Account ergänzt');
    }
  } else {
    notes.push('Passwort unverändert');
  }

  return notes;
}

async function createNew(db: Db, opts: Options, password: string): Promise<void> {
  const userId = generateId();
  const now = new Date();
  // scrypt ist absichtlich langsam – vor der Transaktion, nicht in ihr.
  const passwordHash = await hashPassword(password);

  await db.transaction(async (tx) => {
    await tx.insert(schema.user).values({
      id: userId,
      name: opts.name,
      email: opts.email,
      emailVerified: true,
      role: ADMIN_ROLE,
      createdAt: now,
      updatedAt: now,
    });

    // providerId 'credential' ist die Kennung, unter der better-auth den
    // E-Mail/Passwort-Login sucht.
    await tx.insert(schema.account).values({
      id: generateId(),
      accountId: userId,
      providerId: 'credential',
      userId,
      password: passwordHash,
      createdAt: now,
      updatedAt: now,
    });
  });
}

async function main(): Promise<void> {
  const opts = parseOptions();

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
    const [existing] = await db
      .select({
        id: schema.user.id,
        emailVerified: schema.user.emailVerified,
        role: schema.user.role,
      })
      .from(schema.user)
      .where(eq(schema.user.email, opts.email))
      .limit(1);

    console.log(`\nZiel: ${POSTGRES_USER}@${POSTGRES_HOST}:${POSTGRES_PORT ?? 5432}/${POSTGRES_DB}`);

    if (existing) {
      const notes = await promoteExisting(db, existing, opts);
      console.log(`\n✅ Betreiber-Account aktualisiert: ${opts.email}`);
      for (const note of notes) console.log(`   · ${note}`);
      if (opts.password) console.log(`\n   Passwort: ${opts.password}`);
    } else {
      const password = opts.password ?? generatePassword();
      await createNew(db, opts, password);
      console.log(`\n✅ Betreiber-Account angelegt: ${opts.name} <${opts.email}>`);
      console.log('   · Rolle "admin", keine Organisation');
      console.log('   · E-Mail-Adresse als verifiziert markiert');
      if (!opts.password) {
        console.log(`\n   Passwort: ${password}`);
        console.log('   Wird nur einmal angezeigt – jetzt notieren.');
      }
    }

    console.log(`\nLogin: ${adminUrl()}\n`);
  } finally {
    await client.end();
  }
}

main().catch((err: unknown) => {
  console.error(`\n❌ ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
