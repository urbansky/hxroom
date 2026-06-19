import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { betterAuth, generateId } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { organization } from 'better-auth/plugins';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../db/db.module';
import { MailModule } from '../mail/mail.module';
import { MailService } from '../mail/mail.service';
import * as schema from '../db/schema';

export const AUTH = Symbol('AUTH');
export type Auth = ReturnType<typeof betterAuth>;

@Global()
@Module({
  imports: [MailModule],
  providers: [
    {
      provide: AUTH,
      inject: [DRIZZLE, ConfigService, MailService],
      useFactory: (db: DrizzleDb, config: ConfigService, mail: MailService) =>
        betterAuth({
          database: drizzleAdapter(db, {
            provider: 'pg',
            schema: { ...schema },
          }),
          plugins: [
            organization({
              allowUserToCreateOrganization: false,
              creatorRole: 'owner',
            }),
          ],
          databaseHooks: {
            user: {
              create: {
                after: async (user) => {
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
          baseURL: config.get<string>('BETTER_AUTH_URL', 'http://localhost:3000'),
          trustedOrigins: config.get<string>('CORS_ORIGINS')
            ? config.get<string>('CORS_ORIGINS')!.split(',').map((o) => o.trim())
            : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
          emailAndPassword: {
            enabled: true,
            requireEmailVerification: true,
          },
          emailVerification: {
            sendVerificationEmail: async ({ user, url }) => {
              await mail.send({
                to: { email: user.email },
                subject: 'E-Mail-Adresse bestätigen – HxRoom',
                htmlContent: buildVerificationEmail(user.name, url),
              });
            },
          },
        }),
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

function buildVerificationEmail(name: string, verifyUrl: string): string {
  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:40px 16px;background:#f5f5f2;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
    <tr><td style="background:#8B9E8A;padding:28px 32px;border-radius:8px 8px 0 0;text-align:center;">
      <span style="font-family:Georgia,serif;font-size:26px;color:#fff;letter-spacing:0.06em;">HxRoom</span>
    </td></tr>
    <tr><td style="background:#fff;padding:40px 32px;border-radius:0 0 8px 8px;">
      <h2 style="margin:0 0 12px;font-size:20px;color:#1a1a1a;">Willkommen, ${name}!</h2>
      <p style="margin:0 0 28px;color:#555;line-height:1.65;font-size:15px;">
        Bitte bestätige deine E-Mail-Adresse, um dein HxRoom-Konto zu aktivieren.
      </p>
      <a href="${verifyUrl}"
         style="display:inline-block;background:#8B9E8A;color:#fff;text-decoration:none;
                padding:13px 28px;border-radius:6px;font-weight:600;font-size:15px;">
        E-Mail bestätigen
      </a>
      <p style="margin:32px 0 0;font-size:13px;color:#999;line-height:1.6;">
        Falls du dich nicht registriert hast, kannst du diese E-Mail ignorieren.<br>
        Der Link ist 24 Stunden gültig.
      </p>
    </td></tr>
  </table>
</body>
</html>`;
}
