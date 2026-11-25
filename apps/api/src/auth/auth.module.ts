import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { betterAuth, generateId } from 'better-auth';
import { APIError, createAuthMiddleware, getSessionFromCtx } from 'better-auth/api';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin, organization } from 'better-auth/plugins';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../db/db.module';
import { MailModule } from '../mail/mail.module';
import { MailService } from '../mail/mail.service';
import { renderEmailVerificationEmail } from '../mail/templates/coach/email-verification';
import { renderEmailChangeApprovalEmail } from '../mail/templates/coach/email-change-approval';
import { renderEmailChangeVerificationEmail } from '../mail/templates/coach/email-change-verification';
import { renderPasswordResetEmail } from '../mail/templates/coach/password-reset';
import * as schema from '../db/schema';
import { ADMIN_ROLES, DEFAULT_ROLE, isAdminRole } from './roles';
import { resolveAuthHosts } from './auth-hosts';
import { ActivityTracker } from './activity-tracker';
import { SignupNotifier } from './signup-notifier';
import { buildLandingUrl } from '../bookings/booking-urls';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  TERMS_VERSION,
  isReservedSlug,
  isValidSlugFormat,
  scrubSensitiveText,
  userNameSchema,
} from '@hxroom/shared';
import { describeAuthEvent } from './auth-events';
import { checkPasswordPolicy } from './password-policy';
import { AUTH_IP_ADDRESS, AUTH_RATE_LIMIT } from './rate-limit';
import { setRequestActor } from '../common/logging/request-context';

const SIGN_UP_PATH = '/sign-up/email';
const authLogger = new Logger('Auth');
const betterAuthLogger = new Logger('BetterAuth');
const UPDATE_USER_PATH = '/update-user';

export const AUTH = Symbol('AUTH');
export type Auth = ReturnType<typeof betterAuth>;

@Global()
@Module({
  imports: [MailModule],
  providers: [
    {
      provide: AUTH,
      inject: [DRIZZLE, ConfigService, MailService, SignupNotifier],
      useFactory: (db: DrizzleDb, config: ConfigService, mail: MailService, signupNotifier: SignupNotifier) => {
        // ADMIN_AUTH_URL ist optional: ohne die Variable bleibt genau ein Host erlaubt,
        // das Verhalten entspricht dann dem vor der Trennung.
        const authHosts = resolveAuthHosts(
          config.get<string>('BETTER_AUTH_URL', 'http://localhost:3000'),
          config.get<string>('ADMIN_AUTH_URL'),
        );

        return betterAuth({
          database: drizzleAdapter(db, {
            provider: 'pg',
            schema: { ...schema },
          }),
          plugins: [
            organization({
              allowUserToCreateOrganization: false,
              creatorRole: 'owner',
              organizationHooks: {
                // Eine Oberfläche zum Ändern des Slugs gibt es nicht, der Endpunkt
                // /organization/update steht dem Owner aber offen. Ohne diese Prüfung
                // könnte ein Coach sich dort `api` oder `app` als Subdomain nehmen.
                beforeUpdateOrganization: async ({ organization }) => {
                  const slug = organization.slug;
                  if (slug === undefined) return;
                  if (!isValidSlugFormat(slug)) {
                    throw new APIError('BAD_REQUEST', {
                      message: 'Invalid slug format',
                      code: 'INVALID_SLUG_FORMAT',
                    });
                  }
                  if (isReservedSlug(slug)) {
                    throw new APIError('BAD_REQUEST', {
                      message: 'This slug is reserved',
                      code: 'SLUG_RESERVED',
                    });
                  }
                },
              },
            }),
            admin({
              defaultRole: DEFAULT_ROLE,
              adminRoles: [...ADMIN_ROLES],
            }),
          ],
          hooks: {
            before: createAuthMiddleware(async (ctx) => {
              await enforcePasswordPolicy(ctx);
              if (ctx.path !== SIGN_UP_PATH && ctx.path !== UPDATE_USER_PATH) return;
              const body = ctx.body as { name?: unknown; acceptTerms?: unknown } | undefined;

              // Der Name des Kontos entsteht bei der Registrierung und lässt sich unter
              // Einstellungen → Account ändern. better-auth nimmt jeden String, auch einen
              // leeren – der stünde dann in Menü, Begrüßung und Mails.
              if (body?.name !== undefined && !userNameSchema.safeParse(body.name).success) {
                throw new APIError('BAD_REQUEST', {
                  message: 'Name must be between 2 and 160 characters',
                  code: 'INVALID_NAME',
                });
              }
              if (ctx.path !== SIGN_UP_PATH) return;

              // Registrieren heißt AGB und AVV annehmen (technisches-konzept.md §7). Das
              // Formular schickt `acceptTerms: true` mit dem Klick auf „Konto erstellen“, unter
              // dem der Hinweis auf AGB und AVV steht. Die Prüfung hier hält Aufrufe am Formular
              // vorbei auf.
              if (body?.acceptTerms !== true) {
                throw new APIError('BAD_REQUEST', {
                  message: 'Terms must be accepted',
                  code: 'TERMS_NOT_ACCEPTED',
                });
              }
            }),
            // Anmeldungen, Passwort-Vorgänge und Betreiber-Aktionen ins Log (auth-events.ts).
            after: createAuthMiddleware(async (ctx) => {
              const session = ctx.context.session as
                | { user?: { id?: string }; session?: { impersonatedBy?: string | null } }
                | null
                | undefined;
              const newSessionUserId = ctx.context.newSession?.user.id;
              setRequestActor({ userId: newSessionUserId ?? session?.user?.id });

              const event = describeAuthEvent({
                path: ctx.path,
                returned: ctx.context.returned,
                sessionUserId: session?.user?.id,
                impersonatedBy: session?.session?.impersonatedBy,
                newSessionUserId,
                body: ctx.body,
              });
              if (event) authLogger[event.level](event.message, event.fields);
            }),
          },
          databaseHooks: {
            user: {
              create: {
                after: async (user, ctx) => {
                  // Die Zustimmung hat hooks.before schon geprüft. Wer auf anderem Weg
                  // entsteht (admin.createUser), stimmt beim ersten Anmelden im Modal zu.
                  if (ctx?.path === SIGN_UP_PATH) {
                    await db.insert(schema.termsAcceptances).values({
                      userId: user.id,
                      version: TERMS_VERSION,
                    });
                  }


                  // Betreiber gehören zu keiner Organisation: ohne Mitgliedschaft bleibt
                  // activeOrganizationId leer und die Coach-Endpunkte weisen sie ab.
                  // Für Coachs – auch für die vom Betreiber per admin.createUser
                  // angelegten – entsteht die Organisation dagegen genau hier.
                  if (isAdminRole((user as { role?: string | null }).role)) return;

                  const baseSlug = generateSlug(user.name ?? user.email);
                  const slug = await ensureUniqueSlug(baseSlug, db);
                  const orgId = generateId();
                  await db.insert(schema.organization).values({
                    id: orgId,
                    name: user.name ?? 'Mein Coaching',
                    slug,
                    createdAt: new Date(),
                  });
                  await db.insert(schema.member).values({
                    id: generateId(),
                    organizationId: orgId,
                    userId: user.id,
                    role: 'owner',
                    createdAt: new Date(),
                  });

                  // Nur bei der Selbstregistrierung – einen per admin.createUser angelegten
                  // Coach kennt der Betreiber schon. Ohne await: Die Antwort an den Coach
                  // soll nicht auf den Mailversand warten, und notify wirft nie.
                  if (ctx?.path === SIGN_UP_PATH) {
                    void signupNotifier.notify({
                      id: user.id,
                      name: user.name,
                      email: user.email,
                      slug,
                      createdAt: user.createdAt,
                    });
                  }
                },
              },
            },
            session: {
              create: {
                after: async (session) => {
                  const [membership] = await db
                    .select({ organizationId: schema.member.organizationId })
                    .from(schema.member)
                    .where(eq(schema.member.userId, session.userId))
                    .limit(1);
                  if (membership) {
                    await db
                      .update(schema.session)
                      .set({ activeOrganizationId: membership.organizationId })
                      .where(eq(schema.session.id, session.id));
                  }
                },
              },
            },
          },
          // Die eigenen Meldungen von better-auth über den Nest-Logger, damit sie Request-ID
          // und dieselbe Form tragen. Stufe ausdrücklich `warn`: Auf `info` schreibt better-auth
          // u. a. „Sign-up attempt for existing email: <Adresse>“. Von den Zusatzargumenten
          // nur Stacktraces – ein Datenbankfehler trüge im Detail sonst den betroffenen Wert.
          logger: {
            level: 'warn',
            log: (level, message, ...args) => {
              const stacks = args.filter((arg): arg is Error => arg instanceof Error).map((err) => err.stack);
              const text = scrubSensitiveText(message);
              if (level === 'error') betterAuthLogger.error(text, ...stacks);
              else betterAuthLogger.warn(text);
            },
          },
          rateLimit: AUTH_RATE_LIMIT,
          advanced: { ipAddress: AUTH_IP_ADDRESS },
          secret: config.getOrThrow<string>('BETTER_AUTH_SECRET'),
          // Objekt statt String: better-auth löst die baseURL dann pro Request aus dem
          // Host-Header auf und lässt nur die gelisteten Hosts zu (siehe auth-hosts.ts).
          baseURL: authHosts,
          trustedOrigins: config.get<string>('CORS_ORIGINS')
            ? config.get<string>('CORS_ORIGINS')!.split(',').map((o) => o.trim())
            : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
          // Kontolöschung läuft NICHT über better-auths user.deleteUser: das löscht sofort
          // die user-Zeile, und via Cascade nur session/account/member/invitation. Die
          // Organisation hat keinen Fremdschlüssel auf user, also blieben Klienten,
          // Buchungen, Angebote und Buchungsseite verwaist zurück – genau davor warnt
          // doc/technik/technisches-konzept.md §17. Zuständig ist stattdessen das account-Modul,
          // das über die Organisation löscht und ein Protokoll schreibt.
          user: {
            changeEmail: {
              enabled: true,
              // Schritt 1 von 2: Freigabe durch die bisherige Adresse. Schritt 2 löst
              // better-auth selbst über sendVerificationEmail unten aus.
              sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
                await mail.send({
                  kind: 'email-change-approval',
                  to: { email: user.email },
                  subject: 'Änderung deiner E-Mail-Adresse freigeben – HxRoom',
                  htmlContent: await renderEmailChangeApprovalEmail({
                    name: user.name,
                    newEmail,
                    approveUrl: url,
                  }),
                });
              },
            },
          },
          emailAndPassword: {
            enabled: true,
            requireEmailVerification: true,
            // Länge der Passwortrichtlinie; die übrigen Regeln prüft hooks.before.
            minPasswordLength: PASSWORD_MIN_LENGTH,
            maxPasswordLength: PASSWORD_MAX_LENGTH,
            // Wer sein Passwort zurücksetzt, hatte es womöglich nicht mehr allein: bestehende
            // Sitzungen fliegen deshalb raus.
            revokeSessionsOnPasswordReset: true,
            sendResetPassword: async ({ user, url }) => {
              await mail.send({
                kind: 'password-reset',
                to: { email: user.email },
                subject: 'Passwort zurücksetzen – HxRoom',
                htmlContent: await renderPasswordResetEmail({ name: user.name, resetUrl: url }),
              });
            },
          },
          emailVerification: {
            // Dieser Handler bedient zwei verschiedene Anlässe, weil better-auth ihn auch für
            // Schritt 2 des E-Mail-Wechsels benutzt – ohne einen Marker mitzuliefern.
            // Unterscheidungsmerkmal: beim Wechsel steht in `user.email` schon die neue
            // Adresse, während in der Datenbank noch die alte liegt. Ohne die Prüfung bekäme
            // ein langjähriger Coach beim Adresswechsel ein "Willkommen bei HxRoom".
            sendVerificationEmail: async ({ user, url }) => {
              const [stored] = await db
                .select({ email: schema.user.email })
                .from(schema.user)
                .where(eq(schema.user.id, user.id))
                .limit(1);
              const isEmailChange = !!stored && stored.email !== user.email;

              await mail.send({
                kind: isEmailChange ? 'email-change-verification' : 'email-verification',
                to: { email: user.email },
                subject: isEmailChange
                  ? 'Neue E-Mail-Adresse bestätigen – HxRoom'
                  : 'E-Mail-Adresse bestätigen – HxRoom',
                htmlContent: isEmailChange
                  ? await renderEmailChangeVerificationEmail({ name: user.name, verifyUrl: markEmailChangeCompleted(url) })
                  : await renderEmailVerificationEmail({
                    name: user.name,
                    verifyUrl: url,
                    termsUrl: `${buildLandingUrl(config)}/agb`,
                    dpaUrl: `${buildLandingUrl(config)}/avv`,
                  }),
              });
            },
          },
        });
      },
    },
    ActivityTracker,
    SignupNotifier,
  ],
  exports: [AUTH, ActivityTracker],
})
export class AuthModule {}

/**
 * Markiert die Rücksprung-Adresse im Link der zweiten Wechsel-Mail als Abschluss.
 *
 * Der E-Mail-Wechsel läuft über zwei Klicks – Freigabe aus dem alten Postfach, Bestätigung
 * aus dem neuen –, und better-auth reicht dieselbe callbackURL an beide Schritte weiter.
 * Beide Klicks landen dadurch auf derselben Seite, die ohne Unterscheidung raten müsste,
 * welcher der beiden gerade passiert ist: nach dem ersten gilt noch die alte Adresse, nach
 * dem zweiten die neue. `email-changed=done` macht den Unterschied sichtbar, und zwar
 * geräteunabhängig – Mail-Links werden oft auf einem anderen Gerät geöffnet als dem, auf dem
 * der Wechsel angestoßen wurde.
 *
 * Sieht der Link anders aus als erwartet, bleibt er unverändert; die Coach-App zeigt dann den
 * Hinweis für den ersten Schritt statt einer falschen Erfolgsmeldung.
 */
function markEmailChangeCompleted(verifyUrl: string): string {
  try {
    const link = new URL(verifyUrl);
    const callback = link.searchParams.get('callbackURL');
    if (!callback) return verifyUrl;

    const target = new URL(callback);
    target.searchParams.set('email-changed', 'done');
    link.searchParams.set('callbackURL', target.toString());
    return link.toString();
  } catch {
    return verifyUrl;
  }
}

function generateSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

type AuthMiddlewareContext = Parameters<Parameters<typeof createAuthMiddleware>[0]>[0];

/** Endpunkte, die ein Passwort setzen, und das Feld, in dem es steht. */
const PASSWORD_FIELDS: Record<string, string> = {
  [SIGN_UP_PATH]: 'password',
  '/change-password': 'newPassword',
  '/reset-password': 'newPassword',
  '/admin/create-user': 'password',
  '/admin/set-user-password': 'newPassword',
};

/**
 * Passwortrichtlinie (technisches-konzept.md §7) für jeden Weg, auf dem ein Passwort
 * entsteht. Fehlt das Passwort oder stimmt die Länge nicht, antwortet der Endpunkt selbst
 * mit seinem Code (PASSWORD_TOO_SHORT/PASSWORD_TOO_LONG).
 */
async function enforcePasswordPolicy(ctx: AuthMiddlewareContext): Promise<void> {
  const field = PASSWORD_FIELDS[ctx.path];
  if (!field) return;
  const body = (ctx.body ?? {}) as Record<string, unknown>;
  const password = body[field];
  if (typeof password !== 'string') return;
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) return;

  const violation = checkPasswordPolicy(password, await resolveAccountEmail(ctx, body));
  if (violation) throw new APIError('BAD_REQUEST', violation);
}

/** Die E-Mail-Adresse des Kontos, dessen Passwort gesetzt wird – soweit sie feststeht. */
async function resolveAccountEmail(ctx: AuthMiddlewareContext, body: Record<string, unknown>): Promise<string | null> {
  switch (ctx.path) {
    case SIGN_UP_PATH:
    case '/admin/create-user':
      return typeof body.email === 'string' ? body.email : null;
    case '/change-password':
      return (await getSessionFromCtx(ctx))?.user.email ?? null;
    case '/reset-password': {
      // Der Link aus der Mail trägt den Token; dahinter steht die User-ID.
      const token = body.token ?? (ctx.query as { token?: unknown } | undefined)?.token;
      if (typeof token !== 'string') return null;
      const verification = await ctx.context.internalAdapter.findVerificationValue(`reset-password:${token}`);
      if (!verification) return null;
      return (await ctx.context.internalAdapter.findUserById(verification.value))?.email ?? null;
    }
    // /admin/set-user-password: Der Hook läuft vor der Rechteprüfung des Endpunkts. Eine
    // Adresse anhand der userId nachzuschlagen, gäbe Unberechtigten einen Prüfweg an die Hand.
    default:
      return null;
  }
}

async function ensureUniqueSlug(base: string, db: DrizzleDb): Promise<string> {
  let slug = base;
  let counter = 2;
  while (true) {
    // Ein gesperrter Name wird wie ein vergebener behandelt: aus „App" wird `app-2`.
    if (isReservedSlug(slug)) {
      slug = `${base}-${counter++}`;
      continue;
    }
    const [existing] = await db
      .select({ id: schema.organization.id })
      .from(schema.organization)
      .where(eq(schema.organization.slug, slug))
      .limit(1);
    if (!existing) return slug;
    slug = `${base}-${counter++}`;
  }
}

