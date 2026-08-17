import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { betterAuth, generateId } from 'better-auth';
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

export const AUTH = Symbol('AUTH');
export type Auth = ReturnType<typeof betterAuth>;

@Global()
@Module({
  imports: [MailModule],
  providers: [
    {
      provide: AUTH,
      inject: [DRIZZLE, ConfigService, MailService],
      useFactory: (db: DrizzleDb, config: ConfigService, mail: MailService) => {
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
            }),
            admin({
              defaultRole: DEFAULT_ROLE,
              adminRoles: [...ADMIN_ROLES],
            }),
          ],
          databaseHooks: {
            user: {
              create: {
                after: async (user) => {
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
          // doc/technisches-konzept.md §17. Zuständig ist stattdessen das account-Modul,
          // das über die Organisation löscht und ein Protokoll schreibt.
          user: {
            changeEmail: {
              enabled: true,
              // Schritt 1 von 2: Freigabe durch die bisherige Adresse. Schritt 2 löst
              // better-auth selbst über sendVerificationEmail unten aus.
              sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
                await mail.send({
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
            // Wer sein Passwort zurücksetzt, hatte es womöglich nicht mehr allein: bestehende
            // Sitzungen fliegen deshalb raus.
            revokeSessionsOnPasswordReset: true,
            sendResetPassword: async ({ user, url }) => {
              await mail.send({
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
                to: { email: user.email },
                subject: isEmailChange
                  ? 'Neue E-Mail-Adresse bestätigen – HxRoom'
                  : 'E-Mail-Adresse bestätigen – HxRoom',
                htmlContent: isEmailChange
                  ? await renderEmailChangeVerificationEmail({ name: user.name, verifyUrl: url })
                  : await renderEmailVerificationEmail({ name: user.name, verifyUrl: url }),
              });
            },
          },
        });
      },
    },
  ],
  exports: [AUTH],
})
export class AuthModule {}

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

async function ensureUniqueSlug(base: string, db: DrizzleDb): Promise<string> {
  let slug = base;
  let counter = 2;
  while (true) {
    const [existing] = await db
      .select({ id: schema.organization.id })
      .from(schema.organization)
      .where(eq(schema.organization.slug, slug))
      .limit(1);
    if (!existing) return slug;
    slug = `${base}-${counter++}`;
  }
}

